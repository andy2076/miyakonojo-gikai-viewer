import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * 質問カードを一括削除するAPI
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { cardIds } = await request.json();

    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json({ error: '削除するカードIDを指定してください' }, { status: 400 });
    }

    const result = await pool.query(
      'DELETE FROM question_cards WHERE id = ANY($1::uuid[])',
      [cardIds]
    );

    return NextResponse.json({
      success: true,
      deleted: result.rowCount || cardIds.length,
      message: `${result.rowCount || cardIds.length}件のカードを削除しました`,
    });
  } catch (error) {
    console.error('Bulk delete cards error:', error);
    return NextResponse.json(
      { error: 'カードの一括削除中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
