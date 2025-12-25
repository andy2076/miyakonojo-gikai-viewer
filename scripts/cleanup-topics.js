// 古い薄いトピックを削除し、meeting_titleを修正するスクリプト
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function cleanup() {
  console.log('🧹 トピックのクリーンアップ開始...\n');

  // 削除対象: 薄い内容のトピック（タイトルに「審議可決トピック」を含むもの）
  const { data: toDelete } = await supabase
    .from('meeting_topics')
    .select('*')
    .ilike('title', '%審議可決トピック%');

  if (toDelete && toDelete.length > 0) {
    console.log(`❌ 削除対象: ${toDelete.length}件`);
    for (const topic of toDelete) {
      console.log(`   - ${topic.meeting_title}: ${topic.title}`);
      const { error } = await supabase
        .from('meeting_topics')
        .delete()
        .eq('id', topic.id);

      if (error) {
        console.error(`   ❌ 削除エラー: ${error.message}`);
      } else {
        console.log(`   ✅ 削除完了`);
      }
    }
  }

  console.log('\n');

  // meeting_titleが「都城市議会」になっているものを修正
  const { data: toFix } = await supabase
    .from('meeting_topics')
    .select('*')
    .eq('meeting_title', '都城市議会');

  if (toFix && toFix.length > 0) {
    console.log(`🔧 meeting_title修正対象: ${toFix.length}件`);
    for (const topic of toFix) {
      // タイトルから会議名を抽出
      const match = topic.title.match(/令和\d+年第\d+回定例会/);
      if (match) {
        const correctMeetingTitle = match[0];
        console.log(`   ${topic.title}`);
        console.log(`   → meeting_title を「${correctMeetingTitle}」に修正`);

        const { error } = await supabase
          .from('meeting_topics')
          .update({ meeting_title: correctMeetingTitle })
          .eq('id', topic.id);

        if (error) {
          console.error(`   ❌ 修正エラー: ${error.message}`);
        } else {
          console.log(`   ✅ 修正完了`);
        }
      }
    }
  }

  console.log('\n✅ クリーンアップ完了');
}

cleanup().catch(console.error);
