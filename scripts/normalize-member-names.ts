/**
 * question_cards.member_name の表記ゆれ（姓名の間の空白）を解消する。
 *
 * 令和7年第4回のインポートで「川内 賢幸」のような空白入りの表記が入り、
 * 既存の「川内賢幸」と別人物として集計されてしまっているため、
 * 空白なしの表記（既存データの多数派）に寄せる。
 *
 * 使い方:
 *   npx tsx scripts/normalize-member-names.ts          # 変更内容の確認のみ（dry-run）
 *   npx tsx scripts/normalize-member-names.ts --apply  # 実際に更新
 */
import { Pool } from 'pg';
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

const stripSpace = (s: string) => s.replace(/[\s　]/g, '');

async function main() {
  const apply = process.argv.includes('--apply');
  const client = await pool.connect();

  try {
    const { rows } = await client.query(
      `SELECT member_name, COUNT(*)::int AS cnt
         FROM question_cards
        GROUP BY member_name
        ORDER BY member_name`
    );

    const targets = rows.filter((r: any) => r.member_name !== stripSpace(r.member_name));

    if (targets.length === 0) {
      console.log('表記ゆれはありません。');
      return;
    }

    console.log(`空白入りの表記: ${targets.length}件`);
    for (const t of targets) {
      const normalized = stripSpace(t.member_name);
      const same = rows.find((r: any) => r.member_name === normalized);
      console.log(
        `  「${t.member_name}」${t.cnt}件 -> 「${normalized}」` +
          (same ? `（統合先に既存${same.cnt}件）` : '（新規表記）')
      );
    }

    if (!apply) {
      console.log('\n--apply を付けて実行すると更新します（dry-run）。');
      return;
    }

    await client.query('BEGIN');
    const res = await client.query(
      `UPDATE question_cards
          SET member_name = replace(replace(member_name, ' ', ''), '　', ''),
              updated_at = NOW()
        WHERE member_name <> replace(replace(member_name, ' ', ''), '　', '')`
    );
    await client.query('COMMIT');
    console.log(`\n${res.rowCount}件を更新しました。`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
