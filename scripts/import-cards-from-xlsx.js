/**
 * ExcelファイルをQuestion_cardsテーブルにインポートするスクリプト
 *
 * Excelフォーマット:
 *   議員名（会派）, 大項目, 質問の要旨（背景を含む）, 主な回答/答弁, 質問タグ
 *
 * 使い方:
 *   node scripts/import-cards-from-xlsx.js <Excelファイルパス> [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ファイル名から会期を抽出
function extractMeetingTitleFromPath(xlsxPath) {
  const filename = path.basename(xlsxPath);
  // 全角数字を半角に変換してからマッチ
  const normalizedFilename = filename.replace(/[０-９]/g, c =>
    String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
  );
  // 令和7年第1回 -> 令和７年第１回定例会
  const match = normalizedFilename.match(/令和(\d+)年第(\d+)回/);
  if (match) {
    const year = match[1].replace(/[0-9]/g, c => '０１２３４５６７８９'[c]);
    const num = match[2].replace(/[0-9]/g, c => '０１２３４５６７８９'[c]);
    return `令和${year}年第${num}回定例会`;
  }
  return '令和７年第１回定例会';
}

// 議員名と会派を分離
function parseMemberAndFaction(text) {
  if (!text) return { memberName: '', faction: '' };
  const match = text.match(/^(.+?)（([^）]+)）$/);
  if (match) {
    return {
      memberName: match[1].trim().replace(/\s+/g, ''),
      faction: match[2].trim()
    };
  }
  return {
    memberName: text.trim().replace(/\s+/g, ''),
    faction: ''
  };
}

// 回答テキストをクリーンアップ
function cleanAnswerText(answer) {
  if (!answer) return '';
  let cleaned = answer
    .replace(/\*\*/g, '')
    // 末尾の番号パターンを除去
    .replace(/（[^）]+）\s*[\d,\s]+[。．]?\s*$/g, (match) => {
      const roleMatch = match.match(/（[^）]+）/);
      return roleMatch ? roleMatch[0] + '。' : '';
    })
    .replace(/[\d,\s]+[。．]?\s*$/g, '')
    .replace(/,。/g, '。')
    .trim();

  if (cleaned && !cleaned.endsWith('。') && !cleaned.endsWith('）')) {
    cleaned += '。';
  }
  return cleaned;
}

// 質問テキストをクリーンアップ
function cleanQuestionText(question) {
  if (!question) return '';
  return question
    .replace(/[\d,\s]+[。．]?\s*$/g, '')
    .replace(/,。/g, '。')
    .trim();
}

async function importXlsx(xlsxPath, dryRun = false) {
  console.log(`📂 Excelファイル読み込み中: ${xlsxPath}\n`);

  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const meetingTitle = extractMeetingTitleFromPath(xlsxPath);
  console.log(`📅 会期: ${meetingTitle}\n`);
  console.log(`📋 Excelから${rows.length}行のデータを読み込みました\n`);

  // 議員ごとにグループ化
  const memberData = new Map();

  // 現在の議員・大項目を保持（空欄の場合に引き継ぐ）
  let currentMember = '';
  let currentFaction = '';
  let currentMajorItem = '';

  for (const row of rows) {
    // 議員名カラム（複数パターンに対応）
    const memberField = row['議員名（会派）'] || row['質問者（会派）'];

    // 議員名がある場合は更新
    if (memberField && memberField.trim()) {
      const parsed = parseMemberAndFaction(memberField);
      currentMember = parsed.memberName;
      currentFaction = parsed.faction;
    }

    // 議員名がまだ設定されていない場合はスキップ
    if (!currentMember) continue;

    // 大項目がある場合は更新
    const majorItem = row['大項目'];
    if (majorItem && majorItem.trim()) {
      currentMajorItem = majorItem.trim();
    }

    // 質問の要旨を取得（複数のカラム名に対応）
    const questionSummary = row['質問の要旨（背景を含む）'] || row['質問の要旨'] || row['詳細な質問事項（小項目）'] || row['詳細な質問事項（小項目）/質問の要旨（背景を含む）'] || row['詳細な質問事項（小項目）/質問の要旨'] || row['詳細な質問事項（小項目）/質問の要旨（議論のポイント）'] || row['詳細な質問事項（小項目）/質問の要旨（議論のポイントを含む）'] || '';
    const answerRaw = row['主な回答/答弁'] || '';
    const tagsRaw = row['質問タグ'] || '';

    // 質問がない行はスキップ
    if (!questionSummary.trim()) continue;

    // タグを配列に変換
    const tags = tagsRaw.toString().replace(/^"|"$/g, '').split(/[,、]/).map(t => t.trim()).filter(t => t);

    // テーマを作成
    const theme = {
      theme_title: currentMajorItem,
      question_point: cleanQuestionText(questionSummary),
      answer_point: cleanAnswerText(answerRaw),
      discussion_point: '',
      affected_people: '',
      field_tag: tags.length > 0 ? tags[0] : '',
      tags: tags,
    };

    if (!memberData.has(currentMember)) {
      memberData.set(currentMember, {
        memberName: currentMember,
        faction: currentFaction,
        themes: []
      });
    }
    memberData.get(currentMember).themes.push(theme);
  }

  console.log(`👥 検出された議員数: ${memberData.size}\n`);

  // レコードを作成
  const records = Array.from(memberData.values()).map(data => ({
    member_name: data.memberName,
    meeting_title: meetingTitle,
    faction: data.faction,
    themes: data.themes,
    gpt_field_tags: [...new Set(data.themes.flatMap(t => t.tags || []))],
    gpt_nature_tags: [],
    topics: [],
    published: true,
    question_text: '',
    answer_texts: [],
    full_content: '',
  }));

  console.log('📋 インポートするレコード:\n');
  for (const record of records) {
    console.log(`  👤 ${record.member_name} (${record.faction})`);
    console.log(`     📅 ${record.meeting_title}`);
    console.log(`     📝 テーマ数: ${record.themes.length}`);
    if (record.gpt_field_tags.length > 0) {
      console.log(`     🏷️ タグ: ${record.gpt_field_tags.slice(0, 5).join(', ')}${record.gpt_field_tags.length > 5 ? '...' : ''}`);
    }
    console.log('');
  }

  if (dryRun) {
    console.log('🔍 ドライラン完了（データベースには書き込みません）\n');
    if (records.length > 0 && records[0].themes.length > 0) {
      console.log('サンプルテーマ:');
      console.log(JSON.stringify(records[0].themes[0], null, 2));
    }
    return;
  }

  console.log('📤 Supabaseにアップロード中...\n');

  let successCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  for (const record of records) {
    const { data: existing, error: selectError } = await supabase
      .from('question_cards')
      .select('id')
      .eq('member_name', record.member_name)
      .eq('meeting_title', record.meeting_title)
      .maybeSingle();

    if (selectError) {
      console.error(`❌ 検索エラー (${record.member_name}):`, selectError.message);
      errorCount++;
      continue;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('question_cards')
        .update({
          faction: record.faction,
          themes: record.themes,
          gpt_field_tags: record.gpt_field_tags,
          gpt_nature_tags: record.gpt_nature_tags,
          topics: record.topics,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error(`❌ 更新エラー (${record.member_name}):`, updateError.message);
        errorCount++;
      } else {
        console.log(`✅ 更新: ${record.member_name} (${record.meeting_title})`);
        updateCount++;
      }
    } else {
      const { error: insertError } = await supabase
        .from('question_cards')
        .insert(record);

      if (insertError) {
        console.error(`❌ 作成エラー (${record.member_name}):`, insertError.message);
        errorCount++;
      } else {
        console.log(`✅ 作成: ${record.member_name} (${record.meeting_title})`);
        successCount++;
      }
    }
  }

  console.log('\n📊 結果サマリー:');
  console.log(`   新規作成: ${successCount}件`);
  console.log(`   更新: ${updateCount}件`);
  console.log(`   エラー: ${errorCount}件`);
  console.log('\n🎉 インポート完了！');
}

const args = process.argv.slice(2);
const xlsxPath = args.find(arg => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!xlsxPath) {
  console.log('使い方: node scripts/import-cards-from-xlsx.js <Excelファイルパス> [--dry-run]');
  process.exit(1);
}

importXlsx(xlsxPath, dryRun).catch(console.error);
