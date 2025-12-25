// 特定トピックの詳細を確認
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDetail() {
  const { data } = await supabase
    .from('meeting_topics')
    .select('*')
    .eq('id', '82af06f3-43f3-436d-a292-c355756af703')
    .single();

  console.log('📋 令和5年第2回定例会 可決事項ビジュアルサマリー');
  console.log('\nmeeting_title:', data.meeting_title);
  console.log('title:', data.title);
  console.log('\ncontent_data:');
  console.log(JSON.stringify(data.content_data, null, 2));
}

checkDetail().catch(console.error);
