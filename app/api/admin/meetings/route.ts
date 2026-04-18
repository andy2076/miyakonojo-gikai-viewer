import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * 議会日程一覧取得API
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const result = await pool.query(
      'SELECT * FROM meetings ORDER BY display_order ASC, meeting_date DESC NULLS LAST'
    );

    return NextResponse.json({ meetings: result.rows });
  } catch (error) {
    console.error('Get meetings error:', error);
    return NextResponse.json({ error: '議会日程の取得中にエラーが発生しました' }, { status: 500 });
  }
}

/**
 * 議会日程作成API
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { title, meeting_date, description, published, display_order } = body;

    if (!title) {
      return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO meetings (title, meeting_date, description, published, display_order) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, meeting_date || null, description || null, published ?? false, display_order ?? 0]
    );

    return NextResponse.json({ meeting: result.rows[0] });
  } catch (error) {
    console.error('Create meeting error:', error);
    return NextResponse.json({ error: '議会日程の作成中にエラーが発生しました' }, { status: 500 });
  }
}
