// インフォグラフィック版の必須フィールドをチェック
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
    .eq('id', '82af06f3-43f3-436d-a292-c355756af703')
    .single();

  console.log('=== 令和5年第2回定例会 インフォグラフィック版 ===\n');
  console.log('タイトル:', data.title);
  console.log('meeting_title:', data.meeting_title);
  console.log('published:', data.published);
  console.log('display_order:', data.display_order);
  console.log('\n=== content_data構造 ===');
  console.log('stats:', data.content_data?.stats);
  console.log('keyAchievements:', data.content_data?.key_achievements);
  console.log('visual_type:', data.content_data?.visual_type);
  console.log('topics数:', data.content_data?.topics?.length);
}

check().catch(console.error);
