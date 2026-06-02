/**
 * 令和7年第4回定例会の可決トピックをインポートするスクリプト
 *
 * 使い方: npx tsx scripts/import-r7-4th-topics.ts
 */
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'gikai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

interface TopicItem {
  title: string;
  number: string;
  type: string;
  result: string;
  date: string;
  category: string[];
}

interface JsonData {
  meeting: string;
  session_year: string;
  period: { 開会: string; 閉会: string; 会期: string };
  source: string;
  summary: string;
  topics: TopicItem[];
  note: string;
}

// typeごとのグルーピング設定
const typeConfig: Record<string, { groupTitle: string; icon: string; color: string }> = {
  '条例制定': { groupTitle: '📋 新条例の制定', icon: 'document', color: '#3b82f6' },
  '条例制定（議員提出）': { groupTitle: '📋 新条例の制定', icon: 'document', color: '#3b82f6' },
  '条例改正': { groupTitle: '⚙️ 条例の改正', icon: 'settings', color: '#8b5cf6' },
  '計画': { groupTitle: '🎯 計画・決議', icon: 'target', color: '#06b6d4' },
  '決議（委員会提出）': { groupTitle: '🎯 計画・決議', icon: 'target', color: '#06b6d4' },
  '予算': { groupTitle: '💰 補正予算', icon: 'budget', color: '#f59e0b' },
  '契約・財産': { groupTitle: '🏗️ 契約・財産取得', icon: 'construction', color: '#ef4444' },
};

// 半角数字を全角に変換
const toFullWidth = (s: string) =>
  s.replace(/[0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));

function buildContentData(data: JsonData) {
  // typeごとにグルーピング
  const groups = new Map<string, { config: typeof typeConfig[string]; items: TopicItem[] }>();

  for (const topic of data.topics) {
    const cfg = typeConfig[topic.type];
    if (!cfg) {
      console.warn(`未知のtype: ${topic.type} (${topic.title})`);
      continue;
    }
    const key = cfg.groupTitle;
    if (!groups.has(key)) {
      groups.set(key, { config: cfg, items: [] });
    }
    groups.get(key)!.items.push(topic);
  }

  // content_data.topics を構築
  const topics = Array.from(groups.entries()).map(([groupTitle, { config, items }]) => ({
    title: groupTitle,
    icon: config.icon,
    color: config.color,
    count: `${items.length}件`,
    description: items.map(i => i.title).join('、'),
    items: items.map(item => ({
      subtitle: `${item.number}：${item.title}`,
      badge: item.result,
      badge_color: item.result === '原案可決' ? '#10b981' : '#3b82f6',
      content: `${item.type}として審議され、${item.result}されました。`,
      impact: item.category.join('・') + 'に関する施策',
      icon: config.icon,
    })),
    summary_stats: {
      total_bills: items.length,
      unanimous: items.length,
    },
  }));

  const stats = {
    total_bills: `${data.topics.length}件（主要議案）`,
    passed_bills: `${data.topics.length}件`,
    approval_rate: '100%',
    categories: groups.size,
    total_budget: '補正予算含む',
  };

  const keyAchievements = [
    { icon: 'check', color: '#10b981', title: '全議案可決', value: '100%', description: '否決議案なし' },
    { icon: 'document', color: '#3b82f6', title: '新条例制定', value: '3件', description: '環境・スポーツ・ハラスメント防止' },
    { icon: 'money', color: '#f59e0b', title: '補正予算', value: '複数会計', description: '一般会計ほか各会計' },
    { icon: 'construction', color: '#8b5cf6', title: '会期', value: data.period.会期, description: `${data.period.開会}〜${data.period.閉会}` },
  ];

  return { stats, topics, key_achievements: keyAchievements, visual_type: 'infographic' };
}

async function main() {
  const client = await pool.connect();

  try {
    // JSONファイルを読み込む
    const jsonPath = path.join(__dirname, '..', 'data', '都城市議会_令和7年第4回_可決トピック.json');
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data: JsonData = JSON.parse(raw);

    // 全角変換
    const meetingTitle = toFullWidth(data.meeting);

    console.log(`=== ${meetingTitle} 可決トピック インポート開始 ===`);
    console.log(`トピック数: ${data.topics.length}`);
    console.log(`会期: ${data.period.開会} 〜 ${data.period.閉会}（${data.period.会期}）`);

    await client.query('BEGIN');

    // 1. 既存チェック（重複防止）
    const existing = await client.query(
      'SELECT id FROM meeting_topics WHERE meeting_title = $1',
      [meetingTitle]
    );
    if (existing.rows.length > 0) {
      console.log(`\n!! 既に meeting_topics にエントリが存在します (id: ${existing.rows[0].id})。スキップします。`);
      console.log('   既存データを削除してから再実行してください:');
      console.log(`   DELETE FROM meeting_topics WHERE meeting_title = '${meetingTitle}';`);
      await client.query('ROLLBACK');
      return;
    }

    // 2. content_data を構築
    const contentData = buildContentData(data);

    // 3. summary を構築
    const summary = [
      data.summary,
      `会期: ${data.period.開会}〜${data.period.閉会}（${data.period.会期}）`,
      `新条例3件を制定。「みんなでまちを美しくする条例」「高崎ふれあい多目的スポーツ館条例」「議員ハラスメント防止条例」`,
      `第2次総合計画の基本構想を変更。地域課題の解決を支援する政策提言書を決議`,
      `各種条例の改正（旅費支給・火災予防・手数料・保育所・防災等）を一括可決`,
      `令和7年度各会計補正予算（一般会計第5号・第7号ほか）を可決`,
      data.note,
    ];

    // 4. display_order を取得
    const maxOrder = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM meeting_topics'
    );
    const nextOrder = maxOrder.rows[0].next_order;

    // 5. meeting_topics にINSERT
    const title = `${meetingTitle}（12月）可決事項概要`;
    const description = `${meetingTitle}（${data.period.開会}〜${data.period.閉会}、${data.period.会期}）で審議された主要議案${data.topics.length}件をビジュアル化。新条例の制定3件、条例改正、補正予算、工事契約など、市政の重要施策を一目で把握できます。`;

    const result = await client.query(
      `INSERT INTO meeting_topics (
        meeting_title, title, date, description, content_data, summary,
        published, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        meetingTitle,
        title,
        data.period.閉会,
        description,
        JSON.stringify(contentData),
        JSON.stringify(summary),
        true,
        nextOrder,
      ]
    );

    await client.query('COMMIT');
    console.log(`\n=== 完了 ===`);
    console.log(`  id: ${result.rows[0].id}`);
    console.log(`  meeting_title: ${meetingTitle}`);
    console.log(`  title: ${title}`);
    console.log(`  display_order: ${nextOrder}`);
    console.log(`  published: true`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('エラー:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
