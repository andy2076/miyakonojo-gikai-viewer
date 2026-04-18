import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * 質問カードの公開/非公開を切り替えるAPI
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { published } = body;

    if (typeof published !== 'boolean') {
      return NextResponse.json({ error: 'publishedフィールドが必要です（boolean）' }, { status: 400 });
    }

    const result = await pool.query(
      'UPDATE question_cards SET published = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [published, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'カードが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ success: true, card: result.rows[0] });
  } catch (error) {
    console.error('Publish API error:', error);
    return NextResponse.json(
      { error: '更新処理中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
