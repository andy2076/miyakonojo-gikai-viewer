import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * 質問カードを削除するAPI
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

    await pool.query('DELETE FROM question_cards WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'カードを削除しました' });
  } catch (error) {
    console.error('Delete card error:', error);
    return NextResponse.json(
      { error: 'カードの削除中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
