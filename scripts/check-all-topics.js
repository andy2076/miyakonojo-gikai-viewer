// 全トピックを確認（meeting_titleに関わらず）
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAll() {
  const { data: all } = await supabase
    .from('meeting_topics')
    .select('*')
    .order('created_at', { ascending: true });

  console.log(`✅ 総トピック数: ${all.length}件\n`);

  all.forEach((topic, idx) => {
    console.log(`${idx + 1}. meeting_title: ${topic.meeting_title}`);
    console.log(`   タイトル: ${topic.title}`);
    console.log(`   ID: ${topic.id}`);
    console.log(`   display_order: ${topic.display_order}`);
    console.log(`   作成日: ${topic.created_at}\n`);
  });
}

checkAll().catch(console.error);
