// マークダウン記号を削除し、予算データを追加
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// マークダウン記号を削除
function cleanMarkdown(text) {
  if (!text) return text;

  return text
    // **太字** を削除
    .replace(/\*\*(.+?)\*\*/g, '$1')
    // __太字__ を削除
    .replace(/__(.+?)__/g, '$1')
    // 行頭の「**ラベル:**」形式を削除
    .replace(/\n?\*\*(.+?):\*\*\s*/g, '\n')
    // 残った ** を削除
    .replace(/\*\*/g, '')
    // 連続する改行を1つに
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 予算トピックから総予算を抽出
function extractBudgetData(topics) {
  const budgetTopics = topics.filter(t =>
    t.title?.includes('予算') ||
    t.items?.some(item => item.budget)
  );

  if (budgetTopics.length === 0) return null;

  let totalBudget = 0;
  const breakdown = [];

  budgetTopics.forEach(topic => {
    topic.items?.forEach(item => {
      if (item.budget) {
        // 予算文字列から数値を抽出
        const match = item.budget.match(/[\d,]+/);
        if (match) {
          const amount = parseInt(match[0].replace(/,/g, ''));
          totalBudget += amount;

          breakdown.push({
            category: item.subtitle?.replace(/[🚗💰📊💼]/g, '').trim() || '一般予算',
            amount: amount,
            detail: item.content?.substring(0, 50) || '',
            color: getRandomColor(breakdown.length)
          });
        }
      }
    });
  });

  if (totalBudget === 0) return null;

  return {
    total: totalBudget,
    description: '補正予算の内訳',
    breakdown: breakdown
  };
}

function getRandomColor(index) {
  const colors = [
    '#8b5cf6', // purple
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // orange
    '#ef4444', // red
    '#ec4899', // pink
    '#14b8a6', // teal
  ];
  return colors[index % colors.length];
}

async function cleanAll() {
  console.log('🔄 マークダウン記号削除と予算データ追加中...\n');

  const { data: all } = await supabase
    .from('meeting_topics')
    .select('*')
    .eq('published', true)
    .neq('id', '82af06f3-43f3-436d-a292-c355756af703'); // インフォグラフィック版を除外

  for (const topic of all) {
    console.log(`\n📝 ${topic.meeting_title}`);

    let updated = false;
    const topics = topic.content_data?.topics || [];

    // 各アイテムのcontentとsubtitleをクリーン
    topics.forEach(t => {
      t.items?.forEach(item => {
        if (item.content && item.content.includes('**')) {
          item.content = cleanMarkdown(item.content);
          updated = true;
        }
        if (item.subtitle && item.subtitle.includes('**')) {
          item.subtitle = cleanMarkdown(item.subtitle);
          updated = true;
        }
      });
    });

    // 予算データを抽出
    const budgetData = extractBudgetData(topics);
    let supplementary_budget = topic.supplementary_budget;
    let total_budget_after = topic.total_budget_after;

    if (budgetData && !topic.supplementary_budget) {
      supplementary_budget = budgetData;
      total_budget_after = budgetData.total * 100; // 仮の値
      updated = true;
      console.log(`   ✅ 予算データを追加: ${(budgetData.total / 10000).toFixed(1)}億円`);
    }

    if (updated) {
      const { error } = await supabase
        .from('meeting_topics')
        .update({
          content_data: { ...topic.content_data, topics },
          supplementary_budget,
          total_budget_after
        })
        .eq('id', topic.id);

      if (error) {
        console.error(`   ❌ エラー: ${error.message}`);
      } else {
        console.log(`   ✅ クリーンアップ完了`);
      }
    } else {
      console.log(`   ℹ️ 変更なし`);
    }
  }

  console.log('\n🎉 全て完了！');
}

cleanAll().catch(console.error);
