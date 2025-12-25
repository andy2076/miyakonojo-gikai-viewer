// meeting_titleの数字を全角に統一
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 半角数字を全角数字に変換
function toFullWidth(str) {
  return str.replace(/[0-9]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) + 0xFEE0);
  });
}

async function normalize() {
  console.log('🔄 meeting_titleを全角数字に統一中...\n');

  const { data: all } = await supabase
    .from('meeting_topics')
    .select('*');

  for (const topic of all) {
    const normalizedTitle = toFullWidth(topic.meeting_title);

    if (normalizedTitle !== topic.meeting_title) {
      console.log(`📝 ${topic.meeting_title}`);
      console.log(`   → ${normalizedTitle}`);

      const { error } = await supabase
        .from('meeting_topics')
        .update({ meeting_title: normalizedTitle })
        .eq('id', topic.id);

      if (error) {
        console.error(`   ❌ エラー: ${error.message}`);
      } else {
        console.log(`   ✅ 更新完了\n`);
      }
    }
  }

  console.log('✅ 全て完了！');
}

normalize().catch(console.error);
