/**
 * AI解析CSVをQuestion_cardsテーブルにインポートするスクリプト
 *
 * CSVフォーマット:
 *   会期, 議員名, 会派, 大項目, 小項目, 質問の要点, 答弁の要点, なぜ重要か, 影響を受ける人, 分野タグ, 性質タグ
 *
 * 使い方:
 *   node scripts/import-cards-from-ai-csv.js <CSVファイルパス> [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 会期名を正規化
function normalizeMeetingTitle(title) {
  if (!title) return '';
  // 「令和6年第4回定例会（9月）」→「令和６年第４回定例会」
  let normalized = title
    .replace(/（.*?）/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();

  // 半角数字を全角に
  normalized = normalized.replace(/令和(\d+)年/g, (_, num) =>
    `令和${num.replace(/[0-9]/g, c => '０１２３４５６７８９'[c])}年`
  );
  normalized = normalized.replace(/第(\d+)回/g, (_, num) =>
    `第${num.replace(/[0-9]/g, c => '０１２３４５６７８９'[c])}回`
  );

  return normalized;
}

async function importCSV(csvPath, dryRun = false) {
  console.log(`📂 CSVファイル読み込み中: ${csvPath}\n`);

  const csvData = fs.readFileSync(csvPath, 'utf-8');

  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`📋 CSVから${parsed.data.length}行のデータを読み込みました\n`);

  // 議員・会期ごとにグループ化
  const memberData = new Map();

  for (const row of parsed.data) {
    const memberName = (row['議員名'] || '').trim().replace(/\s+/g, '');
    const faction = (row['会派'] || '').trim();
    const meetingTitle = normalizeMeetingTitle(row['会期']);

    if (!memberName || !meetingTitle) continue;

    const key = `${memberName}__${meetingTitle}`;

    const majorItem = (row['大項目'] || '').trim();
    const minorItem = (row['小項目'] || '').trim();
    const questionPoint = (row['質問の要点'] || '').trim();
    const answerPoint = (row['答弁の要点'] || '').trim();
    const discussionPoint = (row['なぜ重要か'] || '').trim();
    const affectedPeople = (row['影響を受ける人'] || '').trim();
    const fieldTagsRaw = (row['分野タグ'] || '').trim();
    const natureTagsRaw = (row['性質タグ'] || '').trim();

    // タグを配列に
    const fieldTags = fieldTagsRaw.split(/[,、]/).map(t => t.trim()).filter(t => t);
    const natureTags = natureTagsRaw.split(/[,、]/).map(t => t.trim()).filter(t => t);

    const theme = {
      theme_title: majorItem + (minorItem ? `（${minorItem}）` : ''),
      question_point: questionPoint,
      answer_point: answerPoint,
      discussion_point: discussionPoint,
      affected_people: affectedPeople,
      field_tag: fieldTags[0] || '',
      tags: fieldTags,
    };

    if (!memberData.has(key)) {
      memberData.set(key, {
        memberName,
        faction,
        meetingTitle,
        themes: [],
        allFieldTags: new Set(),
        allNatureTags: new Set(),
      });
    }

    const data = memberData.get(key);
    data.themes.push(theme);
    fieldTags.forEach(t => data.allFieldTags.add(t));
    natureTags.forEach(t => data.allNatureTags.add(t));
  }

  console.log(`👥 検出された議員数: ${memberData.size}\n`);

  // レコードを作成
  const records = Array.from(memberData.values()).map(data => ({
    member_name: data.memberName,
    meeting_title: data.meetingTitle,
    faction: data.faction,
    themes: data.themes,
    gpt_field_tags: [...data.allFieldTags],
    gpt_nature_tags: [...data.allNatureTags],
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
const csvPath = args.find(arg => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!csvPath) {
  console.log('使い方: node scripts/import-cards-from-ai-csv.js <CSVファイルパス> [--dry-run]');
  process.exit(1);
}

importCSV(csvPath, dryRun).catch(console.error);
