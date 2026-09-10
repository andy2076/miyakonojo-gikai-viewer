import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { expandCategory } from '@/lib/field-categories';

/**
 * 公開されている質問カードを取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberName = searchParams.get('member');
    const topic = searchParams.get('topic');
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');
    const meetingTitle = searchParams.get('meeting');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const conditions: string[] = ['published = true'];
    const params: any[] = [];
    let paramIndex = 1;

    if (meetingTitle) {
      conditions.push(`meeting_title = $${paramIndex++}`);
      params.push(meetingTitle);
    }

    if (memberName) {
      conditions.push(`member_name ILIKE $${paramIndex++}`);
      params.push(`%${memberName}%`);
    }

    if (topic) {
      conditions.push(`topics @> $${paramIndex++}::jsonb`);
      params.push(JSON.stringify([topic]));
    }

    if (category) {
      // 12分野名は対応する短いタグにも展開して検索する（会期により表記が異なるため）
      const tags = expandCategory(category);
      const ors = tags.map((tag) => {
        params.push(JSON.stringify([tag]));
        return `gpt_field_tags @> $${paramIndex++}::jsonb`;
      });
      // themes[].field_tag に12分野名が入っている会期（令和7年第4回以降）にも対応
      params.push(JSON.stringify([{ field_tag: category }]));
      ors.push(`themes @> $${paramIndex++}::jsonb`);
      conditions.push(`(${ors.join(' OR ')})`);
    }

    if (keyword) {
      // 令和7年第4回以降のカードは question_text / full_content を持たず
      // 内容がすべて themes に入っているため、themes も検索対象に含める
      conditions.push(
        `(question_text ILIKE $${paramIndex}` +
          ` OR full_content ILIKE $${paramIndex}` +
          ` OR question_summary ILIKE $${paramIndex}` +
          ` OR themes::text ILIKE $${paramIndex})`
      );
      params.push(`%${keyword}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM question_cards ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT * FROM question_cards ${where} ORDER BY meeting_date DESC NULLS LAST, member_name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    return NextResponse.json({
      cards: dataResult.rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Cards API error:', error);
    return NextResponse.json(
      { error: 'カード取得中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
