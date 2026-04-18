import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * トピックを削除するAPI
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;

    await pool.query('DELETE FROM meeting_topics WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'トピックを削除しました' });
  } catch (error) {
    console.error('Topic delete API error:', error);
    return NextResponse.json(
      { error: 'トピック削除中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
