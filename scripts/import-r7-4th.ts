/**
 * 令和7年第4回定例会の質問カードをインポートするスクリプト
 *
 * 使い方: npx tsx scripts/import-r7-4th.ts
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

interface TopicInput {
  title: string;
  subtopics?: string[];
  category: string[];
  question: string;
  answer: string;
  note?: string;
}

interface CardInput {
  member: string;
  party: string;
  date: string;
  meeting: string;
  topics: TopicInput[];
}

interface JsonData {
  meeting: string;
  session_year: string;
  source: string;
  card_count: number;
  cards: CardInput[];
}

// JSONのcategoryを既存のgpt_field_tagsの表記に合わせるマッピング
const categoryToFieldTag: Record<string, string[]> = {
  '医療・健康': ['医療', '健康'],
  '子育て・教育': ['子育て', '教育'],
  '地域振興': ['地域振興'],
  '環境・エネルギー': ['環境'],
  'デジタル化推進': ['デジタル化'],
  '福祉': ['福祉'],
  '高齢者福祉': ['高齢者', '福祉'],
  '行政改革': ['行政'],
  '都市計画': ['インフラ', 'まちづくり'],
  '防災・減災': ['防災'],
  '農業・畜産': ['農業'],
};

async function main() {
  const client = await pool.connect();

  try {
    // JSONファイルを読み込む
    const jsonPath = path.join(__dirname, '..', 'data', '都城市議会_令和7年第4回_質問カード.json');
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data: JsonData = JSON.parse(raw);

    // 半角数字を全角に変換（既存データとの整合性）
    const toFullWidth = (s: string) =>
      s.replace(/[0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));
    data.meeting = toFullWidth(data.meeting);
    for (const card of data.cards) {
      card.meeting = toFullWidth(card.meeting);
    }

    console.log(`=== ${data.meeting} インポート開始 ===`);
    console.log(`カード数: ${data.card_count}`);

    await client.query('BEGIN');

    // 1. meetingsテーブルに会期を追加（既存チェック）
    const existingMeeting = await client.query(
      'SELECT id FROM meetings WHERE title = $1',
      [data.meeting]
    );

    let meetingId: string;
    if (existingMeeting.rows.length > 0) {
      meetingId = existingMeeting.rows[0].id;
      console.log(`会期「${data.meeting}」は既に存在 (id: ${meetingId})`);
    } else {
      // display_orderは既存の最大値+1
      const maxOrder = await client.query('SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM meetings');
      const nextOrder = maxOrder.rows[0].next_order;

      const meetingResult = await client.query(
        `INSERT INTO meetings (title, meeting_date, description, published, display_order)
         VALUES ($1, $2, $3, true, $4)
         RETURNING id`,
        [data.meeting, '2025-12-05', `${data.meeting}（${data.source}）`, nextOrder]
      );
      meetingId = meetingResult.rows[0].id;
      console.log(`会期「${data.meeting}」を追加 (id: ${meetingId}, order: ${nextOrder})`);
    }

    // 2. 既存カードを確認（重複防止）
    const existingCards = await client.query(
      'SELECT COUNT(*) as cnt FROM question_cards WHERE meeting_title = $1',
      [data.meeting]
    );
    if (parseInt(existingCards.rows[0].cnt) > 0) {
      console.log(`\n!! 既に${existingCards.rows[0].cnt}件のカードが存在します。スキップします。`);
      console.log('   既存データを削除してから再実行してください:');
      console.log(`   DELETE FROM question_cards WHERE meeting_title = '${data.meeting}';`);
      await client.query('ROLLBACK');
      return;
    }

    // 3. 各カードを投入
    let insertedCount = 0;
    for (const card of data.cards) {
      // themesを構築
      const themes = card.topics
        .filter(t => t.title && t.title !== '（ほか1テーマ）' && (t.question || t.answer))
        .map(t => {
          const tags: string[] = [];
          for (const cat of t.category) {
            const mapped = categoryToFieldTag[cat];
            if (mapped) {
              tags.push(...mapped);
            } else {
              tags.push(cat);
            }
          }
          // 重複除去
          const uniqueTags = [...new Set(tags)];

          return {
            theme_title: t.title,
            subtopics: t.subtopics || [],
            question_point: t.question,
            answer_point: t.answer,
            discussion_point: '',
            affected_people: '',
            field_tag: t.category[0] || '',
            tags: uniqueTags,
          };
        });

      // gpt_field_tagsはthemesの全tagを集約して重複除去
      const allTags = new Set<string>();
      for (const theme of themes) {
        for (const tag of theme.tags) {
          allTags.add(tag);
        }
      }
      const gptFieldTags = [...allTags];

      await client.query(
        `INSERT INTO question_cards (
          member_name, faction, meeting_title, meeting_date, meeting_id,
          themes, gpt_field_tags, topics,
          published, view_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0)`,
        [
          card.member,
          card.party,
          data.meeting,
          card.date,
          meetingId,
          JSON.stringify(themes),
          JSON.stringify(gptFieldTags),
          JSON.stringify([]),  // topics (card-level) は空配列
          true,  // published
        ]
      );
      insertedCount++;
      console.log(`  [${insertedCount}/${data.cards.length}] ${card.member}（${card.party}）- ${themes.length}テーマ`);
    }

    await client.query('COMMIT');
    console.log(`\n=== 完了: ${insertedCount}件のカードを投入しました ===`);

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
