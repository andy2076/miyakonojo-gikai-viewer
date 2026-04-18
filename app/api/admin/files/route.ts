import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * ファイル一覧取得API
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const result = await pool.query(
      'SELECT * FROM minutes_files ORDER BY uploaded_at DESC'
    );

    return NextResponse.json({ files: result.rows });
  } catch (error) {
    console.error('Get files error:', error);
    return NextResponse.json({ error: 'ファイル一覧の取得中にエラーが発生しました' }, { status: 500 });
  }
}
