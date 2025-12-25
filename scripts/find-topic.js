// 特定のトピックを検索
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function find() {
  const { data: all } = await supabase
    .from('meeting_topics')
    .select('*');

  console.log(`総件数: ${all.length}件\n`);

  const match = all.filter(t => t.title.includes('第3回'));

  console.log(`第3回が含まれるトピック: ${match.length}件\n`);

  match.forEach(topic => {
    console.log('ID:', topic.id);
    console.log('meeting_title:', topic.meeting_title);
    console.log('title:', topic.title);
    console.log('display_order:', topic.display_order);
    console.log('created_at:', topic.created_at);
    console.log('---\n');
  });
}

find().catch(console.error);
