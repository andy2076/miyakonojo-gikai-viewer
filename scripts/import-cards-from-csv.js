// CSVから質問カードをインポートするスクリプト
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const Papa = require('papaparse');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function importCardsFromCSV(csvFilePath, meetingTitle) {
  console.log(`📤 ${meetingTitle}の質問カードをインポート中...\n`);

  // CSVファイルを読み込む
  const csvData = fs.readFileSync(csvFilePath, 'utf-8');

  // CSVをパース
  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`📋 CSVから${parsed.data.length}行のデータを読み込みました\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // 各行を処理
  for (const row of parsed.data) {
    try {
      // 議員名がない場合はスキップ
      if (!row['議員名'] || row['議員名'].trim() === '') {
        skipCount++;
        continue;
      }

      // 分野タグと性質タグを配列に変換
      const fieldTags = row['分野タグ'] ? row['分野タグ'].split(/[、,]/).map(t => t.trim()).filter(t => t) : [];
      const natureTags = row['性質タグ'] ? row['性質タグ'].split(/[、,]/).map(k => k.trim()).filter(k => k) : [];

      // full_contentを生成（質問と答弁の要点を結合）
      const fullContent = [
        row['大項目'] || '',
        row['小項目'] || '',
        row['質問の要点'] || '',
        row['答弁の要点'] || '',
        row['なぜ重要か'] || '',
        row['影響を受ける人'] || ''
      ].filter(text => text.trim()).join('\n');

      // 質問カードデータを作成
      const cardData = {
        meeting_title: meetingTitle,
        member_name: row['議員名'],
        faction: row['会派'] || null,
        theme_title: row['大項目'] || null,
        question_summary: row['小項目'] || null,
        question_text: row['質問の要点'] || null,
        gpt_question_point1: row['質問の要点'] || null,
        answer_summary: row['答弁の要点'] || null,
        gpt_answer_point1: row['答弁の要点'] || null,
        gpt_discussion_point: row['なぜ重要か'] || null,
        gpt_affected_people: row['影響を受ける人'] || null,
        full_content: fullContent,
        topics: fieldTags.length > 0 ? fieldTags : null,
        keywords: natureTags.length > 0 ? natureTags : null,
        gpt_field_tags: fieldTags.length > 0 ? fieldTags : null,
        gpt_nature_tags: natureTags.length > 0 ? natureTags : null,
        published: true,
      };

      // データベースにインサート
      const { error } = await supabase
        .from('question_cards')
        .insert(cardData);

      if (error) {
        console.error(`❌ エラー (${row['議員名']} - ${row['小項目']}):`, error.message);
        errorCount++;
      } else {
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`✅ ${successCount}件インポート完了...`);
        }
      }
    } catch (err) {
      console.error(`❌ 処理エラー:`, err.message);
      errorCount++;
    }
  }

  console.log('\n📊 インポート結果:');
  console.log(`  ✅ 成功: ${successCount}件`);
  console.log(`  ⏭️  スキップ: ${skipCount}件`);
  console.log(`  ❌ エラー: ${errorCount}件`);
  console.log('\n🎉 インポート完了！');
}

// コマンドライン引数からCSVパスと会議名を取得
const csvPath = process.argv[2];
const meetingTitle = process.argv[3];

if (!csvPath || !meetingTitle) {
  console.error('使用方法: node import-cards-from-csv.js <CSVファイルパス> <会議名>');
  console.error('例: node scripts/import-cards-from-csv.js "議事録解析/令和６年/第２回/都城市議会_令和6年第2回定例会_AI解析_小項目別_議員名削除済み.csv" "令和6年第2回定例会"');
  process.exit(1);
}

importCardsFromCSV(csvPath, meetingTitle).catch(console.error);
