// Supabaseのトピックデータを確認するスクリプト
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTopics() {
  console.log('🔍 meeting_topicsテーブルを確認中...\n');

  const { data, error, count } = await supabase
    .from('meeting_topics')
    .select('*', { count: 'exact' })
    .order('display_order', { ascending: true });

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  console.log(`✅ 総トピック数: ${count}件\n`);

  if (data && data.length > 0) {
    console.log('📋 トピック一覧:');
    data.forEach((topic, index) => {
      console.log(`\n${index + 1}. ${topic.meeting_title}`);
      console.log(`   ID: ${topic.id}`);
      console.log(`   タイトル: ${topic.title}`);
      console.log(`   公開状態: ${topic.published ? '✅ 公開' : '❌ 非公開'}`);
      console.log(`   表示順: ${topic.display_order}`);
      console.log(`   作成日: ${topic.created_at}`);
    });
  } else {
    console.log('⚠️ トピックが1件も登録されていません');
  }
}

checkTopics().catch(console.error);
