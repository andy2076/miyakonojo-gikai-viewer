// 令和5年第1回定例会のインフォグラフィックデータをSupabaseにアップロード
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function uploadInfographic() {
  console.log('📤 令和5年第1回定例会のインフォグラフィックデータをアップロード中...\n');

  // JSONファイルを読み込む
  const data = JSON.parse(
    fs.readFileSync('r5-1st-infographic-data.json', 'utf-8')
  );

  console.log('📋 データ概要:');
  console.log(`  - 会議: ${data.meeting_title}`);
  console.log(`  - タイトル: ${data.title}`);
  console.log(`  - トピック数: ${data.content_data.topics.length}`);
  console.log(`  - 議案数: ${data.content_data.stats.total_bills}件\n`);

  // 既存データを確認
  const { data: existing } = await supabase
    .from('meeting_topics')
    .select('id, meeting_title')
    .eq('meeting_title', data.meeting_title)
    .single();

  if (existing) {
    console.log(`📝 既存データを更新します (ID: ${existing.id})\n`);

    // 更新
    const { error } = await supabase
      .from('meeting_topics')
      .update({
        title: data.title,
        date: data.date,
        description: data.description,
        content_data: data.content_data,
        summary: data.summary,
        published: true,
        display_order: 6, // 令和5年第1回
      })
      .eq('id', existing.id);

    if (error) {
      console.error('❌ 更新エラー:', error.message);
      throw error;
    }
    console.log('✅ データを更新しました！');
  } else {
    console.log('📝 新規データを作成します\n');

    // 新規作成
    const { error } = await supabase
      .from('meeting_topics')
      .insert({
        meeting_title: data.meeting_title,
        title: data.title,
        date: data.date,
        description: data.description,
        content_data: data.content_data,
        summary: data.summary,
        published: true,
        display_order: 6, // 令和5年第1回
      });

    if (error) {
      console.error('❌ 作成エラー:', error.message);
      throw error;
    }
    console.log('✅ データを作成しました！');
  }

  console.log('\n🎉 アップロード完了！');
  console.log('   http://localhost:3000/meetings/令和５年第１回定例会/topics でご確認ください');
}

uploadInfographic().catch(console.error);
