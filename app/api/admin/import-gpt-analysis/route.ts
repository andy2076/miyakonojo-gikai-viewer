import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';
import Papa from 'papaparse';
import { GPTAnalysisCSVRow, Theme } from '@/types/database';

/**
 * AI分析データCSVをインポートするAPI
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const meetingName = formData.get('meetingName') as string;
    const importMode = (formData.get('importMode') as string) || 'add';

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
    }
    if (!meetingName || !meetingName.trim()) {
      return NextResponse.json({ error: '会議名が指定されていません' }, { status: 400 });
    }

    let text = await file.text();
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    const lines = text.split(/\r?\n/);
    const cleanedLines = lines.map(line => {
      if (line.startsWith('"') && line.endsWith('"') && line.length > 2) {
        let cleaned = line.substring(1, line.length - 1);
        cleaned = cleaned.replace(/""/g, '"');
        return cleaned;
      }
      return line;
    });
    text = cleanedLines.join('\n');

    const result = Papa.parse<GPTAnalysisCSVRow>(text, { header: true, skipEmptyLines: true, delimiter: ',' });

    if (result.data.length === 0) {
      return NextResponse.json({ error: 'CSVの解析に失敗しました' }, { status: 400 });
    }

    const rows = result.data;
    const hasDaiKomoku = rows.length > 0 && ('大項目' in rows[0] && '小項目' in rows[0]);

    const memberThemes: Map<string, { faction: string; themes: Theme[]; fieldTags: Set<string>; natureTags: Set<string> }> = new Map();

    for (const row of rows) {
      const memberName = row['議員名']?.trim();
      const faction = row['会派']?.trim();
      const themeNumber = row['テーマ番号']?.trim() || '';

      let themeTitle: string;
      if (row['大項目'] && row['小項目']) {
        const dai = row['大項目'].trim();
        const sho = row['小項目'].trim();
        themeTitle = sho ? `${dai}（${sho}）` : dai;
      } else {
        themeTitle = row['テーマタイトル']?.trim() || row['テーマ']?.trim() || '';
      }

      const questionPoint = row['質問のポイント']?.trim() || row['質問の要点']?.trim() || '';
      const answerPoint = row['回答のポイント']?.trim() || row['答弁の要点']?.trim() || '';
      const discussionPoint = row['議論のポイント（なぜ重要か）']?.trim() || row['議論のポイント（なぜ重要か？）']?.trim() || row['なぜ重要か（ポイント）']?.trim() || row['なぜ重要か']?.trim();
      const affectedPeople = row['影響を受ける人']?.trim();

      if (!memberName) continue;

      const memberNameNoSpace = memberName.replace(/\s+/g, '');
      const memberNameWithSuffix = `${memberNameNoSpace}議員`;

      if (!memberThemes.has(memberNameWithSuffix)) {
        memberThemes.set(memberNameWithSuffix, { faction: faction || '', themes: [], fieldTags: new Set(), natureTags: new Set() });
      }

      const memberData = memberThemes.get(memberNameWithSuffix)!;
      memberData.themes.push({
        theme_number: themeNumber, theme_title: themeTitle, question_point: questionPoint,
        answer_point: answerPoint, discussion_point: discussionPoint || null, affected_people: affectedPeople || null,
      });

      const fieldTags = row['分野タグ']?.split(/[、,，;]/).map(t => t.trim()).filter(Boolean) || [];
      const natureTags = row['性質タグ']?.split(/[、,，;]/).map(t => t.trim()).filter(Boolean) || [];
      fieldTags.forEach(tag => memberData.fieldTags.add(tag));
      natureTags.forEach(tag => memberData.natureTags.add(tag));
    }

    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (const [memberName, data] of memberThemes) {
      try {
        const existingResult = await pool.query(
          'SELECT id, themes FROM question_cards WHERE member_name = $1 AND meeting_title = $2 LIMIT 1',
          [memberName, meetingName]
        );

        const fieldTagsArray = Array.from(data.fieldTags);
        const natureTagsArray = Array.from(data.natureTags);

        if (existingResult.rows.length > 0) {
          const card = existingResult.rows[0];
          const existingThemes = (card.themes as Theme[]) || [];
          let updatedThemes: Theme[];

          if (importMode === 'replace') {
            updatedThemes = [...data.themes];
          } else if (importMode === 'update') {
            const newThemeMap = new Map(data.themes.map(t => [t.theme_number, t]));
            updatedThemes = existingThemes.map(et => {
              if (et.theme_number && newThemeMap.has(et.theme_number)) {
                const nt = newThemeMap.get(et.theme_number)!;
                newThemeMap.delete(et.theme_number);
                return nt;
              }
              return et;
            });
            updatedThemes.push(...Array.from(newThemeMap.values()));
          } else {
            updatedThemes = [...existingThemes, ...data.themes];
          }

          const fullContent = updatedThemes.map(t =>
            [t.theme_title, t.question_point, t.answer_point, t.discussion_point, t.affected_people].filter(Boolean).join('\n')
          ).join('\n\n');

          await pool.query(
            `UPDATE question_cards SET themes = $1, full_content = $2, gpt_field_tags = $3, gpt_nature_tags = $4, updated_at = NOW() WHERE id = $5`,
            [JSON.stringify(updatedThemes), fullContent, fieldTagsArray.length > 0 ? JSON.stringify(fieldTagsArray) : null, natureTagsArray.length > 0 ? JSON.stringify(natureTagsArray) : null, card.id]
          );
          updatedCount++;
        } else {
          const fullContent = data.themes.map(t =>
            [t.theme_title, t.question_point, t.answer_point, t.discussion_point, t.affected_people].filter(Boolean).join('\n')
          ).join('\n\n');

          await pool.query(
            `INSERT INTO question_cards (member_name, meeting_title, faction, question_text, full_content, themes, gpt_field_tags, gpt_nature_tags, published)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [memberName, meetingName, data.faction || null, '', fullContent, JSON.stringify(data.themes),
             fieldTagsArray.length > 0 ? JSON.stringify(fieldTagsArray) : null, natureTagsArray.length > 0 ? JSON.stringify(natureTagsArray) : null, false]
          );
          createdCount++;
        }
      } catch (err) {
        errors.push(`${memberName}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      success: true, created: createdCount, updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `${createdCount}件のカードを作成、${updatedCount}件のカードを更新しました`,
    });
  } catch (error) {
    console.error('Import AI analysis error:', error);
    return NextResponse.json(
      { error: 'インポート処理中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
