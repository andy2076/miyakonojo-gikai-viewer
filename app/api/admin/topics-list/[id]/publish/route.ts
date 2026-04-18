import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * トピックの公開/非公開を切り替えるAPI
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
      return NextResponse.json({ error: 'publishedはboolean型である必要があります' }, { status: 400 });
    }

    await pool.query(
      'UPDATE meeting_topics SET published = $1, updated_at = NOW() WHERE id = $2',
      [published, id]
    );

    return NextResponse.json({
      success: true,
      published,
      message: published ? 'トピックを公開しました' : 'トピックを非公開にしました',
    });
  } catch (error) {
    console.error('Topic publish API error:', error);
    return NextResponse.json(
      { error: '公開状態の更新中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
