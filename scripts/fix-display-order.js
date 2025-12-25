// インフォグラフィック版のdisplay_orderを0に変更
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fix() {
  console.log('🔧 display_order を修正中...\n');

  // インフォグラフィック版を display_order: 0 に
  const { error: error1 } = await supabase
    .from('meeting_topics')
    .update({ display_order: 0 })
    .eq('id', '82af06f3-43f3-436d-a292-c355756af703');

  if (error1) {
    console.error('❌ エラー:', error1.message);
  } else {
    console.log('✅ インフォグラフィック版を display_order: 0 に設定');
  }

  // 可決事項まとめ版を display_order: 1 に
  const { error: error2 } = await supabase
    .from('meeting_topics')
    .update({ display_order: 1 })
    .eq('id', 'b8cb33ae-a59d-4723-8cab-45476fa2b9f8');

  if (error2) {
    console.error('❌ エラー:', error2.message);
  } else {
    console.log('✅ 可決事項まとめ版を display_order: 1 に設定');
  }

  console.log('\n✅ 完了！インフォグラフィック版が優先表示されます');
}

fix().catch(console.error);
