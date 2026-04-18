import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * 全トピック一覧を取得するAPI（管理者用）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const result = await pool.query(
      'SELECT * FROM meeting_topics ORDER BY display_order ASC'
    );

    return NextResponse.json({ topics: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Topics list API error:', error);
    return NextResponse.json(
      { error: 'トピック一覧取得中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
