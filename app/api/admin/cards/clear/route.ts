import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * 全カードを削除するAPI
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const result = await pool.query('DELETE FROM question_cards');

    return NextResponse.json({ success: true, deletedCount: result.rowCount });
  } catch (error) {
    console.error('Clear cards error:', error);
    return NextResponse.json({ error: 'カード削除中にエラーが発生しました' }, { status: 500 });
  }
}
