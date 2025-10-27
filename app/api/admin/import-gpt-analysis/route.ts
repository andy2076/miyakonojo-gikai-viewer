import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import Papa from 'papaparse';
import { GPTAnalysisCSVRow, Theme } from '@/types/database';

/**
 * AI分析データCSVをインポートするAPI
 * 同じ会議+議員でテーマを配列にまとめる
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Supabase設定チェック
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 503 }
      );
    }

    // CSVファイルと会議名を取得
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const meetingName = formData.get('meetingName') as string;

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
    }

    if (!meetingName || !meetingName.trim()) {
      return NextResponse.json({ error: '会議名が指定されていません' }, { status: 400 });
    }

    console.log(`📋 インポート開始: 会議=${meetingName}`);
    console.log(`📄 ファイル名: ${file.name}`);
    console.log(`📊 ファイルサイズ: ${file.size} bytes`);

    // CSVファイルを読み込み
    let text = await file.text();

    // BOM（Byte Order Mark）を削除
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    // 各行全体が引用符で囲まれている場合、外側の引用符のみを削除
    const lines = text.split(/\r?\n/);
    const cleanedLines = lines.map(line => {
      // 行全体が引用符で囲まれている場合のみ、外側の引用符を削除
      if (line.startsWith('"') && line.endsWith('"') && line.length > 2) {
        // 最初と最後の引用符を削除
        let cleaned = line.substring(1, line.length - 1);
        // 二重引用符（""）を単一引用符（"）に変換
        cleaned = cleaned.replace(/""/g, '"');
        return cleaned;
      }
      return line;
    });
    text = cleanedLines.join('\n');

    console.log('処理後のCSVの最初の500文字:', text.substring(0, 500));

    // CSVをパース
    const result = Papa.parse<GPTAnalysisCSVRow>(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
    });

    // エラーがあってもデータが取得できていれば処理を続行
    if (result.errors.length > 0) {
      console.warn('CSV parse warnings:', result.errors.slice(0, 3));
    }

    // 致命的なエラー（データが全く読み込めない場合）のみ中止
    if (result.data.length === 0) {
      console.error('CSV parse errors:', result.errors);
      return NextResponse.json(
        { error: 'CSVの解析に失敗しました。データが読み込めませんでした', details: result.errors.slice(0, 5) },
        { status: 400 }
      );
    }

    const rows = result.data;
    console.log(`📊 CSVから${rows.length}行のデータを読み込みました`);

    // CSVフォーマットをチェック
    // 新フォーマット: 「テーマ」または「テーマタイトル」または「大項目+小項目」
    const hasThemeColumn = rows.length > 0 && ('テーマ' in rows[0] || 'テーマタイトル' in rows[0]);
    const hasDaiKomoku = rows.length > 0 && ('大項目' in rows[0] && '小項目' in rows[0]);

    if (rows.length > 0 && !hasThemeColumn && !hasDaiKomoku) {
      console.error('❌ サポートされていないフォーマットのCSVが検出されました');
      console.error('検出されたカラム:', Object.keys(rows[0]));
      return NextResponse.json(
        {
          error: '❌ サポートされていないCSVフォーマットです。',
          details: `必要なカラム: (テーマ または テーマタイトル) または (大項目 + 小項目), 質問のポイント または 質問の要点, 回答のポイント または 答弁の要点\n検出されたカラム: ${Object.keys(rows[0]).join(', ')}`
        },
        { status: 400 }
      );
    }

    if (hasDaiKomoku) {
      console.log('✅ 大項目+小項目形式のCSVを検出しました（1行=1小テーマ）');
    } else {
      console.log('✅ 新形式のCSVを検出しました（1行=1テーマ）');
    }

    // 議員ごとにテーマをグループ化
    const memberThemes: Map<string, {
      faction: string;
      themes: Theme[];
      fieldTags: Set<string>;
      natureTags: Set<string>;
    }> = new Map();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const memberName = row['議員名']?.trim();
      const faction = row['会派']?.trim();

      // 柔軟な列名対応
      const themeNumber = row['テーマ番号']?.trim() || '';

      // テーマタイトルの取得（大項目+小項目形式の場合は結合）
      let themeTitle: string;
      if (row['大項目'] && row['小項目']) {
        const daikomoku = row['大項目'].trim();
        const shokomoku = row['小項目'].trim();
        themeTitle = shokomoku ? `${daikomoku}（${shokomoku}）` : daikomoku;
      } else {
        themeTitle = row['テーマタイトル']?.trim() || row['テーマ']?.trim() || '';
      }

      const questionPoint = row['質問のポイント']?.trim() || row['質問の要点']?.trim() || '';
      const answerPoint = row['回答のポイント']?.trim() || row['答弁の要点']?.trim() || '';
      const discussionPoint = row['議論のポイント（なぜ重要か）']?.trim() || row['議論のポイント（なぜ重要か？）']?.trim() || row['なぜ重要か（ポイント）']?.trim() || row['なぜ重要か']?.trim();
      const affectedPeople = row['影響を受ける人']?.trim();

      // デバッグログ: 最初の3行だけ出力
      if (i < 3) {
        console.log(`\n📋 Row ${i + 1}:`);
        console.log(`  議員名: ${memberName}`);
        console.log(`  テーマタイトル: ${themeTitle}`);
        console.log(`  質問のポイント（最初の50文字）: ${questionPoint?.substring(0, 50)}...`);
        console.log(`  回答のポイント（最初の50文字）: ${answerPoint?.substring(0, 50)}...`);
      }

      if (!memberName) {
        continue;
      }

      // CSVの議員名をDB形式に変換（スペース削除 + 「議員」を追加）
      const memberNameNoSpace = memberName.replace(/\s+/g, '');
      const memberNameWithSuffix = `${memberNameNoSpace}議員`;

      // 議員ごとのデータを取得または作成
      if (!memberThemes.has(memberNameWithSuffix)) {
        memberThemes.set(memberNameWithSuffix, {
          faction: faction || '',
          themes: [],
          fieldTags: new Set(),
          natureTags: new Set(),
        });
      }

      const memberData = memberThemes.get(memberNameWithSuffix)!;

      // テーマを追加
      memberData.themes.push({
        theme_number: themeNumber || '',
        theme_title: themeTitle || '',
        question_point: questionPoint || '',
        answer_point: answerPoint || '',
        discussion_point: discussionPoint || null,
        affected_people: affectedPeople || null,
      });

      // タグを追加
      const fieldTags = row['分野タグ']?.split(/[、,，;]/).map(t => t.trim()).filter(Boolean) || [];
      const natureTags = row['性質タグ']?.split(/[、,，;]/).map(t => t.trim()).filter(Boolean) || [];

      fieldTags.forEach(tag => memberData.fieldTags.add(tag));
      natureTags.forEach(tag => memberData.natureTags.add(tag));
    }

    console.log(`👥 ${memberThemes.size}人の議員のデータを処理します`);

    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    // 各議員のカードを作成または更新
    for (const [memberName, data] of memberThemes) {
      try {
        console.log(`📝 処理中: ${memberName} (${data.themes.length}テーマ)`);

        // 同じ会議+議員のカードを検索
        const { data: existingCards, error: searchError } = await supabase
          .from('question_cards')
          .select('id, themes')
          .eq('member_name', memberName)
          .eq('meeting_title', meetingName)
          .limit(1);

        if (searchError) {
          errors.push(`${memberName}: 検索エラー - ${searchError.message}`);
          continue;
        }

        const fieldTagsArray = Array.from(data.fieldTags);
        const natureTagsArray = Array.from(data.natureTags);

        if (existingCards && existingCards.length > 0) {
          // 既存カードに追加
          const card = existingCards[0];
          const existingThemes = (card.themes as Theme[]) || [];
          const updatedThemes = [...existingThemes, ...data.themes];

          // full_contentを更新（検索用にthemesの内容をテキスト化）
          const fullContentParts = updatedThemes.map(theme =>
            [
              theme.theme_title,
              theme.question_point,
              theme.answer_point,
              theme.discussion_point,
              theme.affected_people
            ].filter(Boolean).join('\n')
          );
          const fullContent = fullContentParts.join('\n\n');

          const { error: updateError } = await supabase
            .from('question_cards')
            .update({
              themes: updatedThemes,
              full_content: fullContent, // 検索用にthemesの内容をテキスト化
              gpt_field_tags: fieldTagsArray.length > 0 ? fieldTagsArray : null,
              gpt_nature_tags: natureTagsArray.length > 0 ? natureTagsArray : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', card.id);

          if (updateError) {
            errors.push(`${memberName}: 更新エラー - ${updateError.message}`);
            continue;
          }

          updatedCount++;
          console.log(`  ✅ 既存カードに${data.themes.length}テーマ追加`);
        } else {
          // full_contentを生成（検索用にthemesの内容をテキスト化）
          const fullContentParts = data.themes.map(theme =>
            [
              theme.theme_title,
              theme.question_point,
              theme.answer_point,
              theme.discussion_point,
              theme.affected_people
            ].filter(Boolean).join('\n')
          );
          const fullContent = fullContentParts.join('\n\n');

          // 新規カード作成（デフォルトは非公開）
          const { error: insertError } = await supabase
            .from('question_cards')
            .insert({
              member_name: memberName,
              meeting_title: meetingName,
              faction: data.faction || null,
              question_text: '', // GPTインポートの場合は空（themesに詳細がある）
              full_content: fullContent, // 検索用にthemesの内容をテキスト化
              themes: data.themes,
              gpt_field_tags: fieldTagsArray.length > 0 ? fieldTagsArray : null,
              gpt_nature_tags: natureTagsArray.length > 0 ? natureTagsArray : null,
              published: false, // デフォルトは非公開
            });

          if (insertError) {
            errors.push(`${memberName}: 作成エラー - ${insertError.message}`);
            continue;
          }

          createdCount++;
          console.log(`  ✅ 新規カード作成 (${data.themes.length}テーマ)`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`${memberName}: ${errorMsg}`);
      }
    }

    console.log(`\n📈 インポート完了:`);
    console.log(`  🆕 新規作成: ${createdCount}件`);
    console.log(`  📝 更新: ${updatedCount}件`);
    console.log(`  ❌ エラー: ${errors.length}件`);

    return NextResponse.json({
      success: true,
      created: createdCount,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `${createdCount}件のカードを作成、${updatedCount}件のカードを更新しました`,
    });
  } catch (error) {
    console.error('Import AI analysis error:', error);
    return NextResponse.json(
      {
        error: 'インポート処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
