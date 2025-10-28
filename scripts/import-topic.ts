import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .envファイルを読み込む
dotenv.config();

// Supabaseクライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importTopic() {
  try {
    // JSONファイルの読み込み
    const jsonPath = path.join(process.cwd(), 'data', 'r5-2nd-session-topic.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    console.log('Importing topic data...');
    console.log('Meeting Title:', jsonData.meeting_title);

    // meeting_topicsテーブルにインサート
    const { data, error } = await supabase
      .from('meeting_topics')
      .insert({
        meeting_title: jsonData.meeting_title,
        title: jsonData.title,
        date: jsonData.date,
        description: jsonData.description,
        content_data: jsonData.content_data,
        summary: jsonData.summary,
        supplementary_budget: jsonData.supplementary_budget,
        total_budget_after: jsonData.total_budget_after,
        published: jsonData.published,
        display_order: jsonData.display_order,
      })
      .select();

    if (error) {
      console.error('Error inserting data:', error);
      throw error;
    }

    console.log('Successfully imported topic:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n✅ Import completed successfully!');
  } catch (error) {
    console.error('Failed to import topic:', error);
    process.exit(1);
  }
}

importTopic();
