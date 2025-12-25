// マークダウン記号が残っているかチェック
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data } = await supabase
    .from('meeting_topics')
    .select('*')
    .eq('meeting_title', '令和４年第３回定例会')
    .single();

  console.log('🔍 令和４年第３回定例会のコンテンツチェック\n');

  data.content_data.topics.forEach((topic, topicIdx) => {
    console.log(`\n=== トピック ${topicIdx + 1}: ${topic.title} ===`);

    topic.items.forEach((item, itemIdx) => {
      console.log(`\n  アイテム ${itemIdx + 1}:`);
      console.log(`    subtitle: ${item.subtitle}`);
      console.log(`    content: ${item.content.substring(0, 200)}`);

      // マークダウン記号をチェック
      const markdownSymbols = ['**', '__', '- **', '* **'];
      markdownSymbols.forEach(symbol => {
        if (item.content?.includes(symbol) || item.subtitle?.includes(symbol)) {
          console.log(`    ⚠️ 「${symbol}」が含まれています`);
        }
      });
    });
  });
}

check().catch(console.error);
