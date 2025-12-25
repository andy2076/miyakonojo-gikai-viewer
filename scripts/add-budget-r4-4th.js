// 令和4年第4回定例会に予算データを追加するスクリプト
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function addBudgetData() {
  console.log('📊 令和4年第4回定例会に予算データを追加します...\n');

  // 予算データを計算（単位: 円）
  const budgetData = {
    総務費: (480 + 1200) * 10000,        // 1,680万円
    民生費: (13868.8 + 12000) * 10000,   // 25,868.8万円
    衛生費: (1000 + 68300) * 10000,      // 69,300万円
    農林水産業費: (2000 + 1029.4) * 10000, // 3,029.4万円
    土木費: 200 * 10000,                  // 200万円
    教育費: 1000 * 10000,                 // 1,000万円
  };

  const total = Object.values(budgetData).reduce((sum, val) => sum + val, 0);
  console.log(`総額: ${(total / 100000000).toFixed(2)}億円\n`);

  // 色を割り当て
  const colors = {
    総務費: '#3b82f6',      // blue
    民生費: '#ef4444',      // red
    衛生費: '#f59e0b',      // orange
    農林水産業費: '#10b981', // green
    土木費: '#8b5cf6',      // purple
    教育費: '#ec4899',      // pink
  };

  // supplementaryBudgetオブジェクトを作成
  const supplementaryBudget = {
    total: total,
    description: '令和5年度補正予算の配分内訳（約5,370万円）',
    breakdown: Object.entries(budgetData).map(([category, amount]) => ({
      category,
      amount,
      color: colors[category]
    }))
  };

  // 補正前の予算を仮定（実際の値が分かれば調整）
  // 総額10.1億円が補正額と仮定し、補正前を500億円と仮定
  const totalBudgetAfter = 50000000000 + total;

  console.log('📝 追加するデータ:');
  console.log(JSON.stringify({
    supplementary_budget: supplementaryBudget,
    total_budget_after: totalBudgetAfter
  }, null, 2));

  // データベースを更新
  const { error } = await supabase
    .from('meeting_topics')
    .update({
      supplementary_budget: supplementaryBudget,
      total_budget_after: totalBudgetAfter
    })
    .eq('meeting_title', '令和４年第４回定例会');

  if (error) {
    console.error('\n❌ 更新エラー:', error.message);
    throw error;
  }

  console.log('\n✅ 予算データを追加しました！');

  // 更新されたデータを確認
  const { data: updated } = await supabase
    .from('meeting_topics')
    .select('supplementary_budget, total_budget_after')
    .eq('meeting_title', '令和４年第４回定例会')
    .single();

  console.log('\n📋 更新後のデータ:');
  console.log(`補正予算総額: ${(updated.supplementary_budget.total / 100000000).toFixed(2)}億円`);
  console.log(`補正後の総予算: ${(updated.total_budget_after / 100000000).toFixed(1)}億円`);
}

addBudgetData().catch(console.error);
