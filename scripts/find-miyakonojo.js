// meeting_title='都城市議会'のトピックを検索
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function find() {
  const { data } = await supabase
    .from('meeting_topics')
    .select('*')
    .eq('meeting_title', '都城市議会');

  console.log(`meeting_title='都城市議会'のトピック: ${data.length}件\n`);

  data.forEach(topic => {
    console.log('ID:', topic.id);
    console.log('meeting_title:', topic.meeting_title);
    console.log('title:', topic.title);
    console.log('display_order:', topic.display_order);
    console.log('created_at:', topic.created_at);
    console.log('---\n');
  });
}

find().catch(console.error);
