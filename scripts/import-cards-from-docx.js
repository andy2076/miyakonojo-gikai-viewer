/**
 * 議事録解析DOCXをquestion_cardsテーブルにインポートするスクリプト
 *
 * 新フォーマット対応:
 *   議員名（会派）, 大項目, 質問の要旨, 主な回答/答弁, 質問タグ
 *
 * 使い方:
 *   node scripts/import-cards-from-docx.js <DOCXファイルパス> [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// DOCXからテキストを抽出
function extractTextFromDocx(docxPath) {
  const result = execSync(`unzip -p "${docxPath}" word/document.xml | sed 's/<[^>]*>//g'`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });
  return result;
}

// ファイル名から会期を抽出
function extractMeetingTitleFromPath(docxPath) {
  const filename = path.basename(docxPath);
  const match = filename.match(/令和\d+年第\d+回定例会/);
  if (match) {
    return match[0];
  }
  const folderMatch = docxPath.match(/令和([０-９\d]+)年.*?第([０-９\d]+)回/);
  if (folderMatch) {
    const year = folderMatch[1].replace(/[０-９]/g, c => '0123456789'['０１２３４５６７８９'.indexOf(c)]);
    const num = folderMatch[2].replace(/[０-９]/g, c => '0123456789'['０１２３４５６７８９'.indexOf(c)]);
    return `令和${year}年第${num}回定例会`;
  }
  return '令和7年第2回定例会';
}

// 会期名を正規化
function normalizeMeetingTitle(title) {
  let normalized = title
    .replace(/\（.*?\）/g, '')
    .replace(/\//g, '')
    .replace(/令和(\d+)年/g, (_, num) => `令和${num.replace(/[0-9]/g, c => '０１２３４５６７８９'[c])}年`)
    .replace(/第(\d+)回/g, (_, num) => `第${num.replace(/[0-9]/g, c => '０１２３４５６７８９'[c])}回`);

  if (!normalized.includes('定例会')) {
    normalized += '定例会';
  }
  return normalized;
}

// 回答から典拠番号を除去
function cleanAnswerText(answer) {
  if (!answer) return '';
  let cleaned = answer
    .replace(/&quot;/g, '"')
    .replace(/\*\*/g, '')
    // 末尾の番号パターンを除去（「（福祉部長）1, 2。」→「（福祉部長）。」）
    .replace(/(\（[^）]+\）)\s*[\d,\s]+[。．]?\s*$/g, '$1。')
    // 末尾の番号のみを除去
    .replace(/[\d,\s]+[。．]?\s*$/g, '')
    .trim();

  if (cleaned && !cleaned.endsWith('。') && !cleaned.endsWith('）')) {
    cleaned += '。';
  }
  return cleaned;
}

// テキストからCSVデータを解析（新フォーマット対応）
function parseDocxText(text) {
  const records = [];

  // 議員ごとのブロックを検出
  const memberPattern = /(\d+)\.\s*([^\s]+(?:\s+[^\s]+)?)\s+議員\s*\(([^)]+)\)/g;
  const matches = [...text.matchAll(memberPattern)];

  console.log(`🔍 検出された議員パターン: ${matches.length}件`);

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const memberNumber = match[1];
    const memberName = match[2].replace(/\s+/g, '');
    const faction = match[3];

    console.log(`  ${memberNumber}. ${memberName} (${faction})`);

    const startIndex = match.index + match[0].length;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index : text.length;
    const memberText = text.substring(startIndex, endIndex);

    const themes = parseNewFormatCSV(memberText, memberName);

    if (themes.length > 0) {
      records.push({
        memberName,
        faction,
        themes
      });
    }
  }

  return records;
}

// HTMLエンティティをデコード
function decodeHtmlEntities(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// CSV行をパース（引用符内のカンマを考慮）
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// 新フォーマットCSV解析
function parseNewFormatCSV(text, memberName) {
  const themes = [];

  // HTMLエンティティをデコード
  text = decodeHtmlEntities(text);

  // ヘッダー「議員名（会派）,大項目,質問の要旨」で始まる部分を探す
  const headerIndex = text.indexOf('議員名（会派）,大項目,質問の要旨');
  if (headerIndex === -1) return themes;

  // ヘッダー後のCSVテキストを取得
  let csvText = text.substring(headerIndex);

  // 「質問タグ」ヘッダーの後からデータ開始
  const dataStartIndex = csvText.indexOf('質問タグ');
  if (dataStartIndex === -1) return themes;
  csvText = csvText.substring(dataStartIndex + 4);

  // 議員名（会派）のパターンで行の開始位置を検出
  // 例: 森 りえ（日本共産党都城市議団）,1. 生活保護...
  const rowPattern = /([^\s（）]+(?:\s+[^\s（）]+)?（[^）]+）),(\d+\.\s*[^,]+),/g;

  let currentMajorItem = '';
  const rowPositions = [];

  let match;
  while ((match = rowPattern.exec(csvText)) !== null) {
    rowPositions.push(match.index);
  }

  // 各行のテキストを抽出してパース
  for (let i = 0; i < rowPositions.length; i++) {
    const startPos = rowPositions[i];
    const endPos = i < rowPositions.length - 1 ? rowPositions[i + 1] : csvText.length;
    const rowText = csvText.substring(startPos, endPos);

    // CSV行をパース
    const parts = parseCSVLine(rowText);
    if (parts.length < 5) continue;

    const majorItemRaw = parts[1]?.trim() || '';
    const questionSummary = parts[2]?.trim() || '';
    const answerRaw = parts[3]?.trim() || '';
    const tagsRaw = parts[4]?.trim() || '';

    // 大項目が空でない場合は更新（数字で始まるもの）
    if (majorItemRaw && /^\d+\./.test(majorItemRaw)) {
      currentMajorItem = majorItemRaw;
    }

    // 質問の要旨から小項目タイトルを抽出（「(1) xxx:」または「(1) xxx/xxx:」の形式）
    const questionMatch = questionSummary.match(/^("[^"]*"|[^"]*?)[:：]\s*(.*)$/);
    let minorItem = '';
    let questionPoint = '';

    if (questionMatch) {
      minorItem = questionMatch[1].trim().replace(/^"|"$/g, '');
      questionPoint = questionMatch[2].trim();
    } else {
      // マッチしない場合は全体を小項目として扱う
      minorItem = questionSummary.replace(/^"|"$/g, '');
      questionPoint = '';
    }

    // 回答をクリーンアップ
    const answerPoint = cleanAnswerText(answerRaw);

    // タグを配列に変換（引用符を除去）
    const cleanedTags = tagsRaw.replace(/^"|"$/g, '');
    const tags = cleanedTags.split(/[,、]/).map(t => t.trim()).filter(t => t);

    if (minorItem && answerPoint && currentMajorItem) {
      themes.push({
        theme_title: `${currentMajorItem}（${minorItem}）`,
        question_point: questionPoint,  // 質問の背景・要点
        answer_point: answerPoint,
        discussion_point: '',
        affected_people: '',
        field_tag: tags.length > 0 ? tags[0] : '',  // メインタグ
        tags: tags,  // 全タグ
      });
    }
  }

  return themes;
}

async function importDocx(docxPath, dryRun = false) {
  console.log(`📂 DOCXファイル読み込み中: ${docxPath}\n`);

  const text = extractTextFromDocx(docxPath);
  const meetingTitle = normalizeMeetingTitle(extractMeetingTitleFromPath(docxPath));
  console.log(`📅 会期: ${meetingTitle}\n`);

  const memberRecords = parseDocxText(text);

  console.log(`👥 検出された議員数: ${memberRecords.length}\n`);

  const records = memberRecords.map(data => ({
    member_name: data.memberName,
    meeting_title: meetingTitle,
    faction: data.faction,
    themes: data.themes,
    gpt_field_tags: [...new Set(data.themes.flatMap(t => t.tags || []))],
    gpt_nature_tags: [],
    topics: [],
    published: true,
    question_text: '',
    answer_texts: [],
    full_content: '',
  }));

  console.log('📋 インポートするレコード:\n');
  for (const record of records) {
    console.log(`  👤 ${record.member_name} (${record.faction})`);
    console.log(`     📅 ${record.meeting_title}`);
    console.log(`     📝 テーマ数: ${record.themes.length}`);
    if (record.gpt_field_tags.length > 0) {
      console.log(`     🏷️ タグ: ${record.gpt_field_tags.join(', ')}`);
    }
    console.log('');
  }

  if (dryRun) {
    console.log('🔍 ドライラン完了（データベースには書き込みません）\n');
    if (records.length > 0 && records[0].themes.length > 0) {
      console.log('サンプルテーマ:');
      console.log(JSON.stringify(records[0].themes[0], null, 2));
    }
    return;
  }

  console.log('📤 Supabaseにアップロード中...\n');

  let successCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  for (const record of records) {
    const { data: existing, error: selectError } = await supabase
      .from('question_cards')
      .select('id')
      .eq('member_name', record.member_name)
      .eq('meeting_title', record.meeting_title)
      .maybeSingle();

    if (selectError) {
      console.error(`❌ 検索エラー (${record.member_name}):`, selectError.message);
      errorCount++;
      continue;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('question_cards')
        .update({
          faction: record.faction,
          themes: record.themes,
          gpt_field_tags: record.gpt_field_tags,
          gpt_nature_tags: record.gpt_nature_tags,
          topics: record.topics,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error(`❌ 更新エラー (${record.member_name}):`, updateError.message);
        errorCount++;
      } else {
        console.log(`✅ 更新: ${record.member_name} (${record.meeting_title})`);
        updateCount++;
      }
    } else {
      const { error: insertError } = await supabase
        .from('question_cards')
        .insert(record);

      if (insertError) {
        console.error(`❌ 作成エラー (${record.member_name}):`, insertError.message);
        errorCount++;
      } else {
        console.log(`✅ 作成: ${record.member_name} (${record.meeting_title})`);
        successCount++;
      }
    }
  }

  console.log('\n📊 結果サマリー:');
  console.log(`   新規作成: ${successCount}件`);
  console.log(`   更新: ${updateCount}件`);
  console.log(`   エラー: ${errorCount}件`);
  console.log('\n🎉 インポート完了！');
}

const args = process.argv.slice(2);
const docxPath = args.find(arg => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!docxPath) {
  console.log('使い方: node scripts/import-cards-from-docx.js <DOCXファイルパス> [--dry-run]');
  process.exit(1);
}

importDocx(docxPath, dryRun).catch(console.error);
