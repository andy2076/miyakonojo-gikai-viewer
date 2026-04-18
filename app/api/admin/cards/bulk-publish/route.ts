import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * カードの一括公開/非公開API
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { cardIds, published } = await request.json();

    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json({ error: 'カードIDが指定されていません' }, { status: 400 });
    }
    if (typeof published !== 'boolean') {
      return NextResponse.json({ error: '公開状態が指定されていません' }, { status: 400 });
    }

    const result = await pool.query(
      'UPDATE question_cards SET published = $1, updated_at = NOW() WHERE id = ANY($2::uuid[]) RETURNING id',
      [published, cardIds]
    );

    return NextResponse.json({ success: true, updated: result.rows.length, published });
  } catch (error) {
    console.error('Bulk publish error:', error);
    return NextResponse.json(
      { error: '一括公開/非公開処理中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
