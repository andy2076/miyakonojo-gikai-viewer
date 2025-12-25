// インフォグラフィック版の構造を詳細に確認
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debug() {
  const { data } = await supabase
    .from('meeting_topics')
    .select('*')
    .eq('id', '82af06f3-43f3-436d-a292-c355756af703')
    .single();

  console.log('📊 トピック数:', data.content_data.topics.length);

  data.content_data.topics.forEach((topic, idx) => {
    console.log(`\n=== トピック ${idx + 1}: ${topic.title} ===`);
    console.log('items配列の長さ:', topic.items?.length || 0);

    if (topic.items && topic.items.length > 0) {
      console.log('\n最初のitem:');
      console.log(JSON.stringify(topic.items[0], null, 2));
    } else {
      console.log('❌ items配列が空またはundefined');
    }
  });
}

debug().catch(console.error);
