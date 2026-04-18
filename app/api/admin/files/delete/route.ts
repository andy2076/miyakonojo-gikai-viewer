import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * ファイル削除API
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { file_ids } = body;

    if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) {
      return NextResponse.json({ error: 'file_idsが必要です' }, { status: 400 });
    }

    // データベースからレコードを削除
    const result = await pool.query(
      'DELETE FROM minutes_files WHERE id = ANY($1::uuid[]) RETURNING id',
      [file_ids]
    );

    return NextResponse.json({
      success: true,
      deleted_count: result.rowCount || 0,
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: '削除処理中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
