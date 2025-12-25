// Supabase全テーブルを確認
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAllTables() {
  console.log('🔍 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('\n📊 全テーブルのデータ件数を確認中...\n');

  // meeting_topics
  const { data: topics, count: topicsCount } = await supabase
    .from('meeting_topics')
    .select('*', { count: 'exact' });
  console.log(`meeting_topics: ${topicsCount}件`);
  if (topics && topics.length > 0) {
    topics.forEach(t => {
      console.log(`  - ${t.meeting_title} (published: ${t.published})`);
    });
  }

  console.log('\n');

  // question_cards
  const { data: cards, count: cardsCount } = await supabase
    .from('question_cards')
    .select('meeting_title', { count: 'exact' });
  console.log(`question_cards: ${cardsCount}件`);

  // 会議ごとにグループ化
  if (cards && cards.length > 0) {
    const meetings = {};
    cards.forEach(c => {
      const title = c.meeting_title || '未設定';
      meetings[title] = (meetings[title] || 0) + 1;
    });
    Object.entries(meetings).forEach(([title, count]) => {
      console.log(`  - ${title}: ${count}件`);
    });
  }

  console.log('\n');

  // meetings
  const { data: meetings, count: meetingsCount } = await supabase
    .from('meetings')
    .select('*', { count: 'exact' });
  console.log(`meetings: ${meetingsCount}件`);
  if (meetings && meetings.length > 0) {
    meetings.forEach(m => {
      console.log(`  - ${m.title} (${m.date})`);
    });
  }
}

checkAllTables().catch(console.error);
