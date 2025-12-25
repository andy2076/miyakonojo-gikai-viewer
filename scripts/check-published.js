// published状態を確認
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
    .order('created_at', { ascending: true });

  console.log(`総トピック数: ${all.length}件\n`);

  all.forEach((topic, idx) => {
    console.log(`${idx + 1}. meeting_title: ${topic.meeting_title}`);
    console.log(`   タイトル: ${topic.title}`);
    console.log(`   published: ${topic.published}`);
    console.log(`   display_order: ${topic.display_order}`);
    console.log(`   ID: ${topic.id}\n`);
  });
}

check().catch(console.error);
