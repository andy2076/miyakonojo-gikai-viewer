// インフォグラフィック版をJSONエクスポート
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function exportData() {
  const { data } = await supabase
    .from('meeting_topics')
    .select('*')
    .eq('id', '82af06f3-43f3-436d-a292-c355756af703')
    .single();

  // JSONとして保存
  fs.writeFileSync(
    'infographic-template.json',
    JSON.stringify(data, null, 2),
    'utf-8'
  );

  console.log('✅ エクスポート完了: infographic-template.json');
}

exportData().catch(console.error);
