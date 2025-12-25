// 令和4年第3回の予算構造を分析
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function analyze() {
  const { data } = await supabase
    .from('meeting_topics')
    .select('*')
    .eq('meeting_title', '令和４年第３回定例会')
    .single();

  console.log('🔍 令和４年第３回定例会の構造分析\n');

  data.content_data.topics.forEach((topic, topicIdx) => {
    console.log(`\n=== トピック ${topicIdx + 1}: ${topic.title} ===`);

    // 予算関連のトピックかチェック
    if (topic.title.includes('予算')) {
      console.log('✅ 予算トピック発見！');
      console.log(`アイテム数: ${topic.items?.length || 0}`);

      topic.items?.slice(0, 3).forEach((item, itemIdx) => {
        console.log(`\n  アイテム ${itemIdx + 1}:`);
        console.log(`    subtitle: ${item.subtitle}`);
        console.log(`    budget: ${item.budget || 'なし'}`);
        console.log(`    content (最初の100文字): ${item.content?.substring(0, 100)}`);
      });
    }
  });
}

analyze().catch(console.error);
