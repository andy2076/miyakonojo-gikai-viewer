// 全トピックの予算データをチェック
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data: all } = await supabase
    .from('meeting_topics')
    .select('*')
    .eq('published', true)
    .order('meeting_title', { ascending: false });

  console.log('📊 予算データチェック\n');

  all.forEach(topic => {
    console.log(`\n=== ${topic.meeting_title} ===`);
    console.log(`タイトル: ${topic.title}`);

    const hasSupplementaryBudget = !!topic.supplementary_budget;
    const hasTotalBudgetAfter = !!topic.total_budget_after;

    console.log(`補正予算データ: ${hasSupplementaryBudget ? '✅ あり' : '❌ なし'}`);
    console.log(`補正後総予算: ${hasTotalBudgetAfter ? '✅ あり' : '❌ なし'}`);

    if (hasSupplementaryBudget) {
      console.log(`  - 総額: ${topic.supplementary_budget.total}`);
      console.log(`  - 内訳項目数: ${topic.supplementary_budget.breakdown?.length || 0}`);
    }

    // content_dataの最初のトピックの最初のアイテムを確認
    const firstTopic = topic.content_data?.topics?.[0];
    const firstItem = firstTopic?.items?.[0];

    if (firstItem) {
      console.log(`\n最初のアイテムの内容サンプル:`);
      console.log(`  subtitle: ${firstItem.subtitle?.substring(0, 50)}...`);
      if (firstItem.content) {
        console.log(`  content: ${firstItem.content.substring(0, 100)}...`);

        // **が含まれているかチェック
        if (firstItem.content.includes('**')) {
          console.log(`  ⚠️ マークダウン記号「**」が含まれています`);
        }
      }
      if (firstItem.budget) {
        console.log(`  budget: ${firstItem.budget}`);
      }
    }
  });
}

check().catch(console.error);
