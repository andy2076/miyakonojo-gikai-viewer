// question_cardsのmeeting_titleをユニークに取得
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data } = await supabase
    .from('question_cards')
    .select('meeting_title')
    .eq('published', true)
    .not('meeting_title', 'is', null);

  const uniqueTitles = [...new Set(data.map(d => d.meeting_title))];

  console.log('📊 ユニークなmeeting_title:', uniqueTitles.length, '件\n');
  uniqueTitles.forEach(title => {
    console.log(`  - ${title}`);
  });
}

check().catch(console.error);
