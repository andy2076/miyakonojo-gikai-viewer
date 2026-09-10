/**
 * 同一人物が別表記で登録されているカードを、現在の表記に統合する。
 *
 * 表記ゆれのうち「姓名の間の空白」は scripts/normalize-member-names.ts で機械的に処理できるが、
 * 改選に伴う表記変更（漢字 → ひらがな など）は人物の同定が必要なため、
 * 確認済みの組み合わせだけをこのファイルに列挙して統合する。
 *
 * 使い方:
 *   npx tsx scripts/merge-member-aliases.ts          # 差分の表示のみ（dry-run）
 *   npx tsx scripts/merge-member-aliases.ts --apply  # 実際に更新
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

interface MemberAlias {
  /** 統合元（過去の表記） */
  from: string;
  /** 統合先（現在の表記） */
  to: string;
  /** 同一人物と判断した根拠 */
  reason: string;
}

/**
 * 統合する表記の一覧。
 *
 * 別人と確認済みで統合してはいけない組み合わせ（参考）:
 *   - 黒木優一 と 黒木善寿 … 令和8年3月5日の出席議員名簿に両名が併記されている
 *   - 杉村義秀 と 杉村ともえ … 杉村義秀は令和8年1月の改選後の名簿になし（引退）
 */
const MEMBER_ALIASES: MemberAlias[] = [
  {
    from: '成合円美佳',
    to: '成合まるみか',
    reason:
      '読みが一致（円美佳＝まるみか）。令和8年3月5日の出席議員名簿に「成合 まるみか」があり「成合 円美佳」は無い。'
      + '会派も自由民主党有志会→自民党市民の会で整合。',
  },
];

async function main() {
  const apply = process.argv.includes('--apply');
  const client = await pool.connect();

  try {
    const { rows } = await client.query(
      `SELECT member_name, COUNT(*)::int AS cnt
         FROM question_cards
        GROUP BY member_name`
    );
    const counts = new Map<string, number>(
      rows.map((r: any) => [r.member_name, r.cnt] as [string, number])
    );

    const pending = MEMBER_ALIASES.filter((a) => (counts.get(a.from) || 0) > 0);

    if (pending.length === 0) {
      console.log('統合対象のカードはありません（すべて統合済み）。');
      return;
    }

    for (const alias of pending) {
      const fromCount = counts.get(alias.from) || 0;
      const toCount = counts.get(alias.to) || 0;
      console.log(`「${alias.from}」${fromCount}件 -> 「${alias.to}」（統合先に既存${toCount}件）`);
      console.log(`  根拠: ${alias.reason}`);

      const detail = await client.query(
        `SELECT meeting_title, faction, COUNT(*)::int AS cnt
           FROM question_cards
          WHERE member_name = $1
          GROUP BY meeting_title, faction
          ORDER BY meeting_title`,
        [alias.from]
      );
      for (const d of detail.rows as any[]) {
        console.log(`    ${d.meeting_title}（${d.faction ?? '会派不明'}）${d.cnt}件`);
      }
    }

    if (!apply) {
      console.log('\n--apply を付けて実行すると更新します（dry-run）。');
      return;
    }

    await client.query('BEGIN');
    let total = 0;
    for (const alias of pending) {
      const res = await client.query(
        `UPDATE question_cards
            SET member_name = $2,
                updated_at = NOW()
          WHERE member_name = $1`,
        [alias.from, alias.to]
      );
      total += res.rowCount ?? 0;
      console.log(`「${alias.from}」-> 「${alias.to}」: ${res.rowCount}件を更新`);
    }
    await client.query('COMMIT');
    console.log(`\n合計${total}件を更新しました。`);
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
