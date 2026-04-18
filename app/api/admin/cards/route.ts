import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * 管理画面用: すべての質問カードを取得するAPI（認証必要）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberName = searchParams.get('member');
    const meetingTitle = searchParams.get('meeting');
    const published = searchParams.get('published');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (memberName) {
      conditions.push(`member_name ILIKE $${paramIndex++}`);
      params.push(`%${memberName}%`);
    }
    if (meetingTitle) {
      conditions.push(`meeting_title = $${paramIndex++}`);
      params.push(meetingTitle);
    }
    if (published === 'true') {
      conditions.push('published = true');
    } else if (published === 'false') {
      conditions.push('published = false');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM question_cards ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT * FROM question_cards ${where} ORDER BY meeting_date DESC NULLS LAST, member_name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    return NextResponse.json({ cards: dataResult.rows, total, limit, offset });
  } catch (error) {
    console.error('Admin cards API error:', error);
    return NextResponse.json(
      { error: 'カード取得中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
