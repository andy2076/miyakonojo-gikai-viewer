/**
 * 質問カードJSONを1会期分インポートする汎用スクリプト。
 * （scripts/import-r7-4th.ts を会期指定できるように一般化したもの）
 *
 * 二重実行しても件数が増えないよう、同じ meeting_title のカードが既にある場合は
 * 何も挿入せずに件数を報告して終了する（--force を付けたときだけ全削除して再投入する）。
 *
 * 使い方:
 *   npx tsx scripts/import-meeting-cards.ts data/都城市議会_令和8年第2回_質問カード.json
 *   npx tsx scripts/import-meeting-cards.ts <path> --force   # 既存カードを全削除してから再投入
 *
 * 注意: meeting_title は既存データに合わせて全角数字に変換して保存する。
 */
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
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

/**
 * JSONのcategory（みえる議会の12分野）を既存のgpt_field_tagsの短いタグ表記に変換する。
 * 分野別の絞り込み自体は lib/field-categories.ts のマッピングで吸収するため、
 * ここでは従来（令和7年第4回）と同じ短いタグを保存して年度別ランキングの表記を揃える。
 */
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
  '男女共同参画': ['男女共同参画'],
};

const toFullWidth = (s: string) =>
  s.replace(/[0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0));

async function main() {
  const args = process.argv.slice(2);
  const jsonArg = args.find((a) => !a.startsWith('--'));
  // --replace は旧名。どちらでも全削除→再投入になる。
  const force = args.includes('--force') || args.includes('--replace');

  if (!jsonArg) {
    console.error('使い方: npx tsx scripts/import-meeting-cards.ts <質問カードJSONのパス> [--force]');
    process.exit(1);
  }

  const jsonPath = path.isAbsolute(jsonArg) ? jsonArg : path.join(process.cwd(), jsonArg);
  const data: JsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // 会議名は既存データに合わせて全角数字にする
  const meetingTitle = toFullWidth(data.meeting);

  const client = await pool.connect();
  try {
    console.log(`=== ${meetingTitle} インポート開始 (${data.cards.length}件) ===`);
    await client.query('BEGIN');

    // 1. meetings に会期を登録（既存なら再利用）
    const existingMeeting = await client.query('SELECT id FROM meetings WHERE title = $1', [
      meetingTitle,
    ]);

    let meetingId: string;
    const firstDate = data.cards
      .map((c) => c.date)
      .sort()[0];

    if (existingMeeting.rows.length > 0) {
      meetingId = existingMeeting.rows[0].id;
      console.log(`会期「${meetingTitle}」は既に存在 (id: ${meetingId})`);
    } else {
      const maxOrder = await client.query(
        'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM meetings'
      );
      const meetingResult = await client.query(
        `INSERT INTO meetings (title, meeting_date, description, published, display_order)
         VALUES ($1, $2, $3, true, $4)
         RETURNING id`,
        [meetingTitle, firstDate, `${meetingTitle}（${data.source}）`, maxOrder.rows[0].next_order]
      );
      meetingId = meetingResult.rows[0].id;
      console.log(`会期「${meetingTitle}」を追加 (id: ${meetingId})`);
    }

    // 2. 既存カードの確認
    const existingCards = await client.query(
      'SELECT COUNT(*) as cnt FROM question_cards WHERE meeting_title = $1',
      [meetingTitle]
    );
    const existingCount = parseInt(existingCards.rows[0].cnt, 10);
    if (existingCount > 0) {
      if (!force) {
        console.log(`\n!! 「${meetingTitle}」のカードは既に${existingCount}件登録されています。`);
        console.log('   二重登録を防ぐため、何も挿入せずに終了します。');
        console.log(`   入れ替える場合は --force を付けて再実行してください`);
        console.log(`   （既存の${existingCount}件を削除してから${data.cards.length}件を投入します）。`);
        await client.query('ROLLBACK');
        return;
      }
      const del = await client.query('DELETE FROM question_cards WHERE meeting_title = $1', [
        meetingTitle,
      ]);
      console.log(`既存の${del.rowCount}件を削除しました（--force）`);
    }

    // 3. カードを投入
    let inserted = 0;
    for (const card of data.cards) {
      const themes = card.topics
        .filter((t) => t.title && (t.question || t.answer))
        .map((t) => {
          const tags = new Set<string>();
          for (const cat of t.category) {
            const mapped = categoryToFieldTag[cat];
            if (mapped) mapped.forEach((x) => tags.add(x));
            else tags.add(cat);
          }
          return {
            theme_title: t.title,
            subtopics: t.subtopics || [],
            question_point: t.question,
            answer_point: t.answer,
            discussion_point: '',
            affected_people: '',
            field_tag: t.category[0] || '',
            tags: [...tags],
          };
        });

      const allTags = new Set<string>();
      themes.forEach((t) => t.tags.forEach((tag) => allTags.add(tag)));

      await client.query(
        `INSERT INTO question_cards (
          member_name, faction, meeting_title, meeting_date, meeting_id,
          themes, gpt_field_tags, topics, published, view_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0)`,
        [
          card.member,
          card.party,
          meetingTitle,
          card.date,
          meetingId,
          JSON.stringify(themes),
          JSON.stringify([...allTags]),
          JSON.stringify([]),
          true,
        ]
      );
      inserted++;
      console.log(`  [${inserted}/${data.cards.length}] ${card.member}（${card.party}）- ${themes.length}テーマ`);
    }

    await client.query('COMMIT');
    console.log(`\n=== 完了: ${inserted}件のカードを投入しました ===`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('エラー:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
