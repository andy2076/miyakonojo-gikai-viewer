import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * カード閲覧数をインクリメントするAPIエンドポイント
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'カードIDが指定されていません' }, { status: 400 });
    }

    const result = await pool.query(
      'UPDATE question_cards SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1 RETURNING view_count',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'カードが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ success: true, view_count: result.rows[0].view_count });
  } catch (error) {
    console.error('API エラー:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
