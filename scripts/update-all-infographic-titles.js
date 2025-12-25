// 全インフォグラフィックのタイトルを統一フォーマットに更新
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// タイトルを新しいフォーマットに変換
function convertTitle(oldTitle, meetingTitle) {
  // 例: 令和7年第2回定例会 → 令和7年第2回定例会（6月）可決事項概要

  // 月を抽出
  const monthMatch = oldTitle.match(/（(\d+)月）/);
  if (!monthMatch) {
    console.warn(`月が見つかりません: ${oldTitle}`);
    return oldTitle;
  }

  const month = monthMatch[1];

  // meeting_titleから基本情報を取得
  // 例: 令和7年第2回定例会
  return `${meetingTitle}（${month}月）可決事項概要`;
}

async function updateAllTitles() {
  console.log('📝 全インフォグラフィックのタイトルを更新中...\n');

  // JSONファイルのリスト
  const files = [
    'r4-2nd-infographic-data.json',
    'r4-4th-infographic-data.json',
    'r4-5th-infographic-data.json',
    'r5-1st-infographic-data.json',
    'r5-3rd-infographic-data.json',
    'r5-4th-infographic-data.json',
    'r6-2nd-infographic-data.json',
    'r6-3rd-infographic-data.json',
    'r6-4th-infographic-data.json',
    'r6-5th-infographic-data.json',
    'r7-1st-infographic-data.json',
    'r7-2nd-infographic-data.json',
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      const filePath = path.join(process.cwd(), file);

      // JSONファイルを読み込む
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const oldTitle = data.title;
      const newTitle = convertTitle(oldTitle, data.meeting_title);

      if (oldTitle === newTitle) {
        console.log(`⏭️  スキップ: ${file} (既に新フォーマット)`);
        continue;
      }

      console.log(`📄 ${file}`);
      console.log(`   旧: ${oldTitle}`);
      console.log(`   新: ${newTitle}`);

      // タイトルを更新
      data.title = newTitle;

      // JSONファイルを保存
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

      // データベースを更新
      const { error } = await supabase
        .from('meeting_topics')
        .update({ title: newTitle })
        .eq('meeting_title', data.meeting_title);

      if (error) {
        console.error(`   ❌ DB更新エラー: ${error.message}\n`);
        errorCount++;
      } else {
        console.log(`   ✅ 更新完了\n`);
        successCount++;
      }

    } catch (error) {
      console.error(`❌ ${file} の処理中にエラー:`, error.message, '\n');
      errorCount++;
    }
  }

  console.log('\n📊 更新結果:');
  console.log(`  ✅ 成功: ${successCount}件`);
  console.log(`  ❌ エラー: ${errorCount}件`);
  console.log('\n🎉 タイトル更新完了！');
}

updateAllTitles().catch(console.error);
