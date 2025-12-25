// 令和5年第3回定例会のデータを確認
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkData() {
  const { data, error } = await supabase
    .from('question_cards')
    .select('*')
    .eq('meeting_title', '令和５年第３回定例会')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log(`📊 令和５年第３回定例会のデータ: ${data.length}件\n`);

  // 最初の1件を詳細表示
  if (data.length > 0) {
    console.log('📋 サンプルデータ（1件目）:');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('\n');
  }

  // すべてのフィールド名を確認
  if (data.length > 0) {
    console.log('🔑 利用可能なフィールド:');
    console.log(Object.keys(data[0]).join(', '));
    console.log('\n');
  }
}

checkData().catch(console.error);
