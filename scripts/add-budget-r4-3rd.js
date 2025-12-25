// 令和4年第3回定例会に予算データを追加
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function addBudgetData() {
  console.log('📊 令和4年第3回定例会に予算データを追加します...\n');

  // 議案第103号の歳出内訳（単位: 円）
  const budgetBreakdown = {
    総務費: 410728000,           // 4億1,072万8千円
    衛生費: 222531000,           // 2億2,253万1千円
    民生費: 65815000,            // 6,581万5千円
    教育費: 64100000,            // 6,410万円
    農林水産業費: 7830000,       // 783万円
    災害復旧費: 5610000,         // 561万円
    消防費: 1000000,             // 100万円
    商工費: 207900,              // 207万9千円
    土木費: 33000,               // 3万3千円
  };

  // 色を割り当て
  const colors = {
    総務費: '#3b82f6',      // blue
    衛生費: '#f59e0b',      // orange
    民生費: '#ef4444',      // red
    教育費: '#ec4899',      // pink
    農林水産業費: '#10b981', // green
    災害復旧費: '#8b5cf6',  // purple
    消防費: '#f97316',      // orange-red
    商工費: '#06b6d4',      // cyan
    土木費: '#6b7280',      // gray
  };

  // 議案第102号 + 議案第103号の合計
  const totalSupplementary = 290129000 + 797726000; // 10億8,785万5千円

  console.log(`補正予算総額: ${(totalSupplementary / 100000000).toFixed(2)}億円\n`);

  // supplementaryBudgetオブジェクトを作成
  const supplementaryBudget = {
    total: totalSupplementary,
    description: '令和4年度補正予算の配分内訳（議案第103号：約7.9億円）',
    breakdown: Object.entries(budgetBreakdown).map(([category, amount]) => ({
      category,
      amount,
      color: colors[category]
    }))
  };

  // 補正後の総額（議案第103号時点）
  const totalBudgetAfter = 94366832000; // 943億6,683万2千円

  console.log('📝 追加するデータ:');
  console.log(`- 補正予算総額: ${(totalSupplementary / 100000000).toFixed(2)}億円`);
  console.log(`- 補正後の総額: ${(totalBudgetAfter / 100000000).toFixed(1)}億円`);
  console.log(`- 内訳項目数: ${supplementaryBudget.breakdown.length}\n`);

  // データベースを更新
  const { error } = await supabase
    .from('meeting_topics')
    .update({
      supplementary_budget: supplementaryBudget,
      total_budget_after: totalBudgetAfter
    })
    .eq('meeting_title', '令和４年第３回定例会');

  if (error) {
    console.error('❌ 更新エラー:', error.message);
    throw error;
  }

  console.log('✅ 予算データを追加しました！');

  // statsも更新
  const { data: current } = await supabase
    .from('meeting_topics')
    .select('content_data')
    .eq('meeting_title', '令和４年第３回定例会')
    .single();

  const updatedContentData = {
    ...current.content_data,
    stats: {
      ...current.content_data.stats,
      total_budget: '約10.9億円の補正予算'
    }
  };

  const { error: statsError } = await supabase
    .from('meeting_topics')
    .update({
      content_data: updatedContentData
    })
    .eq('meeting_title', '令和４年第３回定例会');

  if (statsError) {
    console.error('❌ stats更新エラー:', statsError.message);
    throw statsError;
  }

  console.log('✅ statsも更新しました！');
  console.log('\n🎉 完了しました！');
  console.log('\n🌐 確認URL: http://localhost:3001/meetings/令和４年第３回定例会/topics');
}

addBudgetData().catch(console.error);
