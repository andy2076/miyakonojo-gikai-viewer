// 全てのmeeting_titleを修正
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixAll() {
  console.log('🔧 全てのmeeting_titleを修正中...\n');

  const { data: all } = await supabase
    .from('meeting_topics')
    .select('*');

  for (const topic of all) {
    const match = topic.title.match(/令和\d+年第\d+回定例会/);
    if (match) {
      const correctMeetingTitle = match[0];

      if (topic.meeting_title !== correctMeetingTitle) {
        console.log(`📝 ${topic.title}`);
        console.log(`   現在: ${topic.meeting_title}`);
        console.log(`   修正: ${correctMeetingTitle}`);

        const { error } = await supabase
          .from('meeting_topics')
          .update({ meeting_title: correctMeetingTitle })
          .eq('id', topic.id);

        if (error) {
          console.error(`   ❌ エラー: ${error.message}`);
        } else {
          console.log(`   ✅ 修正完了\n`);
        }
      }
    }
  }

  console.log('✅ 全て完了');
}

fixAll().catch(console.error);
