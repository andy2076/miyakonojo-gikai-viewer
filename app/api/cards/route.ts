import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

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
      conditions.push(`gpt_field_tags @> $${paramIndex++}::jsonb`);
      params.push(JSON.stringify([category]));
    }

    if (keyword) {
      conditions.push(`(question_text ILIKE $${paramIndex} OR full_content ILIKE $${paramIndex})`);
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
