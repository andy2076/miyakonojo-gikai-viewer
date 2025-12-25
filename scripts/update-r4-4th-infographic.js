// 令和4年第4回定例会を完全なインフォグラフィック版に更新
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateToInfographic() {
  console.log('📊 令和4年第4回定例会をインフォグラフィック版に更新します...\n');

  // JSONファイルを読み込み
  const data = JSON.parse(
    fs.readFileSync('r4-4th-infographic-data.json', 'utf-8')
  );

  console.log('✅ データを読み込みました');
  console.log(`- タイトル: ${data.title}`);
  console.log(`- トピック数: ${data.content_data.topics.length}`);
  console.log(`- key_achievements: ${data.content_data.key_achievements.length}`);
  console.log(`- summary数: ${data.summary.length}\n`);

  // 既存の supplementary_budget を取得
  const { data: current } = await supabase
    .from('meeting_topics')
    .select('supplementary_budget, total_budget_after')
    .eq('meeting_title', '令和４年第４回定例会')
    .single();

  console.log('📦 既存の予算データを維持します');
  console.log(`- 補正予算: ${(current.supplementary_budget.total / 100000000).toFixed(2)}億円`);
  console.log(`- 補正後総予算: ${(current.total_budget_after / 100000000).toFixed(1)}億円\n`);

  // データベースを更新
  const { error } = await supabase
    .from('meeting_topics')
    .update({
      title: data.title,
      date: data.date,
      description: data.description,
      content_data: data.content_data,
      summary: data.summary,
      // supplementary_budget と total_budget_after は既存のものを維持
    })
    .eq('meeting_title', data.meeting_title);

  if (error) {
    console.error('❌ 更新エラー:', error.message);
    throw error;
  }

  console.log('✅ データベースを更新しました！\n');

  // 更新されたデータを確認
  const { data: updated } = await supabase
    .from('meeting_topics')
    .select('*')
    .eq('meeting_title', '令和４年第４回定例会')
    .single();

  console.log('📋 更新後のデータ確認:');
  console.log(`- topics数: ${updated.content_data.topics.length}`);
  console.log(`- key_achievements: ${updated.content_data.key_achievements.length}`);
  console.log(`- summary数: ${updated.summary.length}`);
  console.log(`\n🎉 インフォグラフィック版の作成が完了しました！`);
  console.log(`\n🌐 確認URL: http://localhost:3001/meetings/${encodeURIComponent('令和４年第４回定例会')}/topics`);
}

updateToInfographic().catch(console.error);
