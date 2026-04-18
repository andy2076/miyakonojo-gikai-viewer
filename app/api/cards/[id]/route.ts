import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * 個別の質問カードを取得するAPI
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const isAuthenticated = !!session;

    let query: string;
    const queryParams = [id];

    if (isAuthenticated) {
      query = 'SELECT * FROM question_cards WHERE id = $1';
    } else {
      query = 'SELECT * FROM question_cards WHERE id = $1 AND published = true';
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'カードが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ card: result.rows[0] });
  } catch (error) {
    console.error('Card API error:', error);
    return NextResponse.json(
      { error: 'カード取得中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
