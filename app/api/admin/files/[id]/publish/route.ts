import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * ファイル公開/非公開切り替えAPI
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { published } = body;

    if (typeof published !== 'boolean') {
      return NextResponse.json({ error: 'published フラグが必要です' }, { status: 400 });
    }

    const result = await pool.query(
      'UPDATE minutes_files SET published = $1, updated_at = NOW() WHERE id = $2 RETURNING id, published',
      [published, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating publish status:', error);
    return NextResponse.json({ error: '公開状態の更新中にエラーが発生しました' }, { status: 500 });
  }
}
