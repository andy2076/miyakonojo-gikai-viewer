// トピックMDファイルをSupabaseに直接アップロードするスクリプト
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function uploadTopic(filePath) {
  console.log(`📤 ${filePath} をアップロード中...`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const parsedData = parseMDFile(content);

  console.log('📋 パース結果:', {
    meeting_title: parsedData.meeting_title,
    title: parsedData.title,
    topics_count: parsedData.content_data.topics.length
  });

  // 同じmeeting_titleのトピックが既に存在するかチェック
  const { data: existing } = await supabase
    .from('meeting_topics')
    .select('id')
    .eq('meeting_title', parsedData.meeting_title)
    .single();

  if (existing) {
    // 更新
    const { error } = await supabase
      .from('meeting_topics')
      .update({
        title: parsedData.title,
        date: parsedData.date,
        description: parsedData.description,
        content_data: parsedData.content_data,
        summary: parsedData.summary,
        published: parsedData.published,
      })
      .eq('id', existing.id);

    if (error) {
      console.error('❌ 更新エラー:', error.message);
      throw error;
    }
    console.log('✅ 更新しました');
  } else {
    // 新規作成
    const { error } = await supabase
      .from('meeting_topics')
      .insert({
        meeting_title: parsedData.meeting_title,
        title: parsedData.title,
        date: parsedData.date,
        description: parsedData.description,
        content_data: parsedData.content_data,
        summary: parsedData.summary,
        published: parsedData.published,
      });

    if (error) {
      console.error('❌ 作成エラー:', error.message);
      throw error;
    }
    console.log('✅ 新規作成しました');
  }
}

function parseMDFile(content) {
  const lines = content.split('\n');
  let meeting_title = '';
  let title = '';
  let date = null;
  let description = '';
  const topics = [];
  const summary = [];

  let currentSection = 'header';
  let currentTopic = null;
  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('# ')) {
      title = line.substring(2).trim();
      const match = title.match(/【(.+?)】/);
      if (match) {
        meeting_title = match[1];
      }
    } else if (line.startsWith('**開催日**:')) {
      date = line.split(':')[1]?.trim() || null;
    } else if (line.startsWith('**説明**:')) {
      description = line.split(':')[1]?.trim() || '';
    } else if (line.startsWith('## ')) {
      if (currentTopic) {
        if (currentItem) {
          currentTopic.items.push(currentItem);
          currentItem = null;
        }
        topics.push(currentTopic);
      }

      const topicText = line.substring(3).trim();
      const topicMatch = topicText.match(/【(.+?)】(.+)/);

      currentTopic = {
        title: topicMatch ? topicMatch[1] : topicText,
        description: '',
        items: [],
      };

      if (topicMatch && topicMatch[2]) {
        currentTopic.description = topicMatch[2].trim();
      }
      currentSection = 'topics';
    } else if (line.startsWith('### ')) {
      if (currentItem && currentTopic) {
        currentTopic.items.push(currentItem);
      }
      currentItem = {
        subtitle: line.substring(4).trim(),
        content: '',
      };
    } else if (line.startsWith('- ') && currentItem) {
      const text = line.substring(2).trim();
      if (text.startsWith('**予算**:')) {
        currentItem.budget = text.split(':')[1]?.trim();
      } else if (text.startsWith('**結果**:')) {
        currentItem.result = text.split(':')[1]?.trim();
      } else {
        currentItem.content += (currentItem.content ? '\n' : '') + text;
      }
    } else if (line.startsWith('## まとめ')) {
      if (currentTopic) {
        if (currentItem) {
          currentTopic.items.push(currentItem);
          currentItem = null;
        }
        topics.push(currentTopic);
        currentTopic = null;
      }
      currentSection = 'summary';
    } else if (currentSection === 'summary' && line.startsWith('- ')) {
      summary.push(line.substring(2).trim());
    }
  }

  if (currentTopic) {
    if (currentItem) {
      currentTopic.items.push(currentItem);
    }
    topics.push(currentTopic);
  }

  return {
    meeting_title,
    title,
    date,
    description,
    content_data: { topics },
    summary: summary.length > 0 ? summary : null,
    published: true,
  };
}

// コマンドライン引数からファイルパスを取得
const filePath = process.argv[2];
if (!filePath) {
  console.error('使い方: node scripts/upload-topic.js <MDファイルパス>');
  process.exit(1);
}

uploadTopic(filePath).catch(console.error);
