// CSVから質問カードをインポートするスクリプト（議員ごとにグループ化）
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const Papa = require('papaparse');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function importCardsFromCSV(csvFilePath, meetingTitle) {
  console.log(`📤 ${meetingTitle}の質問カードをインポート中（議員ごとにグループ化）...\n`);

  // CSVファイルを読み込む
  const csvData = fs.readFileSync(csvFilePath, 'utf-8');

  // CSVをパース
  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`📋 CSVから${parsed.data.length}行のデータを読み込みました\n`);

  // 議員ごとにグループ化
  const memberGroups = new Map();

  for (const row of parsed.data) {
    // 議員名がない場合はスキップ
    if (!row['議員名'] || row['議員名'].trim() === '') {
      continue;
    }

    const memberName = row['議員名'];

    if (!memberGroups.has(memberName)) {
      memberGroups.set(memberName, {
        member_name: memberName,
        faction: row['会派'] || null,
        meeting_title: meetingTitle,
        themes: [],
        fieldTags: new Set(),
        natureTags: new Set(),
      });
    }

    const member = memberGroups.get(memberName);

    // 分野タグと性質タグを追加
    if (row['分野タグ']) {
      row['分野タグ'].split(/[、,]/).forEach(tag => {
        const trimmed = tag.trim();
        if (trimmed) member.fieldTags.add(trimmed);
      });
    }

    if (row['性質タグ']) {
      row['性質タグ'].split(/[、,]/).forEach(tag => {
        const trimmed = tag.trim();
        if (trimmed) member.natureTags.add(trimmed);
      });
    }

    // テーマを追加
    member.themes.push({
      theme_title: row['大項目'] || '',
      theme_number: '',
      question_point: row['質問の要点'] || '',
      answer_point: row['答弁の要点'] || '',
      discussion_point: row['なぜ重要か'] || '',
      affected_people: row['影響を受ける人'] || '',
    });
  }

  console.log(`👥 ${memberGroups.size}名の議員をグループ化しました\n`);

  let successCount = 0;
  let errorCount = 0;

  // 各議員のカードをインサート
  for (const [memberName, memberData] of memberGroups) {
    try {
      // full_contentを生成
      const fullContent = memberData.themes
        .map(theme => {
          return [
            theme.theme_title,
            theme.question_point,
            theme.answer_point,
            theme.discussion_point,
            theme.affected_people
          ].filter(text => text && text.trim()).join('\n');
        })
        .join('\n\n');

      const cardData = {
        meeting_title: memberData.meeting_title,
        member_name: memberData.member_name,
        faction: memberData.faction,
        question_text: '', // 必須フィールド（空文字列）
        full_content: fullContent,
        themes: memberData.themes,
        gpt_field_tags: Array.from(memberData.fieldTags),
        gpt_nature_tags: Array.from(memberData.natureTags),
        published: true,
      };

      // データベースにインサート
      const { error } = await supabase
        .from('question_cards')
        .insert(cardData);

      if (error) {
        console.error(`❌ エラー (${memberName}):`, error.message);
        errorCount++;
      } else {
        successCount++;
        console.log(`✅ ${successCount}. ${memberName} (質問数: ${memberData.themes.length})`);
      }
    } catch (err) {
      console.error(`❌ 処理エラー (${memberName}):`, err.message);
      errorCount++;
    }
  }

  console.log('\n📊 インポート結果:');
  console.log(`  ✅ 成功: ${successCount}名`);
  console.log(`  ❌ エラー: ${errorCount}名`);
  console.log('\n🎉 インポート完了！');
}

// コマンドライン引数からCSVパスと会議名を取得
const csvPath = process.argv[2];
const meetingTitle = process.argv[3];

if (!csvPath || !meetingTitle) {
  console.error('使用方法: node import-cards-from-csv-grouped.js <CSVファイルパス> <会議名>');
  console.error('例: node scripts/import-cards-from-csv-grouped.js "議事録解析/令和６年/第２回/都城市議会_令和6年第2回定例会_AI解析_小項目別_議員名削除済み.csv" "令和6年第2回定例会"');
  process.exit(1);
}

importCardsFromCSV(csvPath, meetingTitle).catch(console.error);
