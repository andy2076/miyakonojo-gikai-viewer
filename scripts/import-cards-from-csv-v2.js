/**
 * 議事録解析CSVをquestion_cardsテーブルにインポートするスクリプト
 *
 * 使い方:
 *   node scripts/import-cards-from-csv-v2.js <CSVファイルパス> [--dry-run]
 *
 * 例:
 *   node scripts/import-cards-from-csv-v2.js "議事録解析/令和７年/第２回/都城市議会_令和7年第2回定例会_AI解析_小項目別_議員名削除済み.csv"
 *   node scripts/import-cards-from-csv-v2.js "議事録解析/令和７年/第２回/都城市議会_令和7年第2回定例会_AI解析_小項目別_議員名削除済み.csv" --dry-run
 *
 * 対応CSVフォーマット:
 *   新形式: 議員名, 大項目, 質問の要旨, 執行部（担当者）の主な回答/答弁, 典拠
 *   旧形式: 会期, 議員名, 会派, 大項目, 小項目, 質問の要点, 答弁の要点, なぜ重要か, 影響を受ける人, 分野タグ, 性質タグ
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// CSVパース（簡易版、ダブルクォート対応）
function parseCSV(content) {
  const lines = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if (char === '\n' && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else if (char === '\r') {
      // skip
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  // 各行をパース
  const rows = lines.map(line => {
    const cells = [];
    let currentCell = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuote && line[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (char === ',' && !inQuote) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());

    return cells;
  });

  return rows;
}

// ファイル名から会期を抽出
function extractMeetingTitleFromPath(csvPath) {
  // 例: "都城市議会_令和7年第2回定例会_AI解析_小項目別_議員名削除済み.csv"
  const filename = path.basename(csvPath);
  const match = filename.match(/令和\d+年第\d+回定例会/);
  if (match) {
    return match[0];
  }
  // フォルダパスからも試す: "議事録解析/令和７年/第２回/"
  const pathMatch = csvPath.match(/令和[０-９\d]+年.*?第[０-９\d]+回/);
  if (pathMatch) {
    return pathMatch[0].replace(/[０-９]/g, c => '0123456789'['０１２３４５６７８９'.indexOf(c)]);
  }
  return '';
}

// 分野タグをトピックにマッピング
function mapFieldTagToTopic(fieldTag) {
  const mapping = {
    '福祉': '健康・福祉',
    '医療': '健康・福祉',
    '教育': '教育',
    'インフラ': '都市整備・インフラ',
    '経済': '経済・産業',
    '農業': '経済・産業',
    '観光': '経済・産業',
    '防災': '防災・安全',
    '行政': '行政・財政',
    '文化': '教育',
    '環境': '環境',
  };
  return mapping[fieldTag] || null;
}

// 会期名を正規化（全角数字に統一）
function normalizeMeetingTitle(title) {
  return title
    .replace(/\（.*?\）/g, '') // 括弧内を削除
    .replace(/令和(\d+)年/g, (_, num) => `令和${num.replace(/[0-9]/g, c => '０１２３４５６７８９'[c])}年`)
    .replace(/第(\d+)回/g, (_, num) => `第${num.replace(/[0-9]/g, c => '０１２３４５６７８９'[c])}回`);
}

async function importCSV(csvPath, dryRun = false) {
  console.log(`📂 CSVファイル読み込み中: ${csvPath}\n`);

  // CSVファイル読み込み
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);

  if (rows.length < 2) {
    console.error('❌ CSVにデータがありません');
    return;
  }

  // ヘッダー行
  const headers = rows[0];
  console.log('📋 ヘッダー:', headers.join(', '));

  // 新形式か旧形式かを判定
  const isNewFormat = headers.includes('質問の要旨') || headers.includes('執行部（担当者）の主な回答/答弁');
  console.log(`📄 フォーマット: ${isNewFormat ? '新形式' : '旧形式'}`);

  // カラムインデックスを取得
  let colIndex;
  if (isNewFormat) {
    colIndex = {
      member: headers.indexOf('議員名'),
      majorItem: headers.indexOf('大項目'),
      minorItem: headers.indexOf('質問の要旨'),  // 新形式では「質問の要旨」が小項目
      answerPoint: headers.indexOf('執行部（担当者）の主な回答/答弁'),
      citation: headers.indexOf('典拠'),
      // 以下は新形式には存在しない
      meeting: -1,
      faction: -1,
      questionPoint: -1,
      importance: -1,
      affectedPeople: -1,
      fieldTag: -1,
      natureTag: -1,
    };
  } else {
    colIndex = {
      meeting: headers.indexOf('会期'),
      member: headers.indexOf('議員名'),
      faction: headers.indexOf('会派'),
      majorItem: headers.indexOf('大項目'),
      minorItem: headers.indexOf('小項目'),
      questionPoint: headers.indexOf('質問の要点'),
      answerPoint: headers.indexOf('答弁の要点'),
      importance: headers.indexOf('なぜ重要か'),
      affectedPeople: headers.indexOf('影響を受ける人'),
      fieldTag: headers.indexOf('分野タグ'),
      natureTag: headers.indexOf('性質タグ'),
    };
  }

  console.log('📊 カラムインデックス:', colIndex);

  // 新形式の場合、会期をファイル名から取得
  let defaultMeetingTitle = '';
  if (isNewFormat) {
    defaultMeetingTitle = extractMeetingTitleFromPath(csvPath);
    console.log(`📅 ファイル名から会期を取得: ${defaultMeetingTitle}`);
  }

  // データ行を処理
  const dataRows = rows.slice(1);
  console.log(`\n📝 データ行数: ${dataRows.length}\n`);

  // 議員名+会期でグループ化
  const groupedData = new Map();
  let lastMemberName = '';
  let lastFaction = '';
  let lastMajorItem = '';

  for (const row of dataRows) {
    // 議員名が空の場合は前の議員名を継承
    let memberName = row[colIndex.member]?.trim() || '';
    if (!memberName && lastMemberName) {
      memberName = lastMemberName;
    } else if (memberName) {
      // 名前の空白を除去（「森 りえ」→「森りえ」）
      memberName = memberName.replace(/\s+/g, '');
      lastMemberName = memberName;
    }

    // 会派が空の場合は前の会派を継承（旧形式のみ）
    let faction = '';
    if (colIndex.faction >= 0) {
      faction = row[colIndex.faction]?.trim() || '';
      if (!faction && lastFaction) {
        faction = lastFaction;
      } else if (faction) {
        lastFaction = faction;
      }
    }

    // 会期を取得（旧形式はCSVから、新形式はファイル名から）
    const meetingTitle = colIndex.meeting >= 0
      ? (row[colIndex.meeting]?.trim() || defaultMeetingTitle)
      : defaultMeetingTitle;

    // 大項目が空の場合は前の大項目を継承
    let majorItem = row[colIndex.majorItem]?.trim() || '';
    if (!majorItem && lastMajorItem) {
      majorItem = lastMajorItem;
    } else if (majorItem) {
      lastMajorItem = majorItem;
    }

    const minorItem = row[colIndex.minorItem]?.trim() || '';
    const answerPoint = row[colIndex.answerPoint]?.trim() || '';

    // 新形式では質問の要点がないので、小項目をタイトルとして使用
    const questionPoint = colIndex.questionPoint >= 0
      ? (row[colIndex.questionPoint]?.trim() || '')
      : '';

    const importance = colIndex.importance >= 0 ? (row[colIndex.importance]?.trim() || '') : '';
    const affectedPeople = colIndex.affectedPeople >= 0 ? (row[colIndex.affectedPeople]?.trim() || '') : '';
    const fieldTag = colIndex.fieldTag >= 0 ? (row[colIndex.fieldTag]?.trim() || '') : '';
    const natureTag = colIndex.natureTag >= 0 ? (row[colIndex.natureTag]?.trim() || '') : '';

    if (!memberName || !meetingTitle) {
      console.log(`⚠️ スキップ: memberName=${memberName}, meetingTitle=${meetingTitle}`);
      continue;
    }

    const key = `${memberName}|${meetingTitle}`;

    if (!groupedData.has(key)) {
      groupedData.set(key, {
        memberName,
        meetingTitle,
        faction,
        themes: [],
        fieldTags: new Set(),
        natureTags: new Set(),
        topics: new Set(),
      });
    }

    const group = groupedData.get(key);

    // テーマを追加
    group.themes.push({
      theme_title: `${majorItem}（${minorItem}）`,
      question_point: questionPoint,  // 新形式では空（テーマタイトルと重複するため）
      answer_point: answerPoint,
      discussion_point: importance,
      affected_people: affectedPeople,
    });

    // タグを追加（旧形式のみ）
    if (fieldTag) {
      group.fieldTags.add(fieldTag);
      const topic = mapFieldTagToTopic(fieldTag);
      if (topic) group.topics.add(topic);
    }
    if (natureTag) group.natureTags.add(natureTag);
  }

  console.log(`👥 グループ化された議員数: ${groupedData.size}\n`);

  // 各グループをDBレコードに変換
  const records = [];

  for (const [key, data] of groupedData) {
    const normalizedMeetingTitle = normalizeMeetingTitle(data.meetingTitle);

    const record = {
      member_name: data.memberName,
      meeting_title: normalizedMeetingTitle,
      faction: data.faction,
      themes: data.themes,
      gpt_field_tags: Array.from(data.fieldTags),
      gpt_nature_tags: Array.from(data.natureTags),
      topics: Array.from(data.topics),
      published: true,
      question_text: '', // テーマ形式では不要
      answer_texts: [], // テーマ形式では不要
    };

    records.push(record);
  }

  // 結果を表示
  console.log('📋 インポートするレコード:\n');
  for (const record of records) {
    console.log(`  👤 ${record.member_name} (${record.faction || '会派なし'})`);
    console.log(`     📅 ${record.meeting_title}`);
    console.log(`     📝 テーマ数: ${record.themes.length}`);
    if (record.gpt_field_tags.length > 0) {
      console.log(`     🏷️ 分野タグ: ${record.gpt_field_tags.join(', ')}`);
    }
    if (record.gpt_nature_tags.length > 0) {
      console.log(`     🔖 性質タグ: ${record.gpt_nature_tags.join(', ')}`);
    }
    console.log('');
  }

  if (dryRun) {
    console.log('🔍 ドライラン完了（データベースには書き込みません）\n');
    console.log('サンプルレコード:');
    console.log(JSON.stringify(records[0], null, 2));
    return;
  }

  // Supabaseにアップロード
  console.log('📤 Supabaseにアップロード中...\n');

  let successCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  for (const record of records) {
    // 既存データを確認
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
      // 更新
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
      // 新規作成
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

// メイン
const args = process.argv.slice(2);
const csvPath = args.find(arg => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!csvPath) {
  console.log('使い方: node scripts/import-cards-from-csv-v2.js <CSVファイルパス> [--dry-run]');
  console.log('');
  console.log('例:');
  console.log('  node scripts/import-cards-from-csv-v2.js "議事録解析/令和７年/第２回/都城市議会_令和7年第2回定例会_AI解析_小項目別_議員名削除済み.csv"');
  process.exit(1);
}

importCSV(csvPath, dryRun).catch(console.error);
