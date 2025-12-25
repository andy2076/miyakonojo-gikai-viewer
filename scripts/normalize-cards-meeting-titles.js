// question_cardsのmeeting_titleを全角数字に統一
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
  console.log('🔄 question_cardsのmeeting_titleを全角数字に統一中...\n');

  const { data: all } = await supabase
    .from('question_cards')
    .select('*')
    .not('meeting_title', 'is', null);

  console.log(`📊 総カード数: ${all.length}件\n`);

  let updatedCount = 0;

  for (const card of all) {
    const normalizedTitle = toFullWidth(card.meeting_title);

    if (normalizedTitle !== card.meeting_title) {
      const { error } = await supabase
        .from('question_cards')
        .update({ meeting_title: normalizedTitle })
        .eq('id', card.id);

      if (error) {
        console.error(`❌ カードID ${card.id} エラー: ${error.message}`);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\n✅ 完了！${updatedCount}件のカードを更新しました。`);
}

normalize().catch(console.error);
