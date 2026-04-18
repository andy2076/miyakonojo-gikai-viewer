import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * ファイル情報更新API（会議日・タイトル）
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
    const { meeting_date, meeting_title } = body;

    const sets: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (meeting_date !== undefined) { sets.push(`meeting_date = $${paramIndex++}`); values.push(meeting_date); }
    if (meeting_title !== undefined) { sets.push(`meeting_title = $${paramIndex++}`); values.push(meeting_title); }

    if (sets.length === 0) {
      return NextResponse.json({ error: '更新する情報が指定されていません' }, { status: 400 });
    }

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE minutes_files SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING id, meeting_date, meeting_title`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating file info:', error);
    return NextResponse.json({ error: 'ファイル情報の更新中にエラーが発生しました' }, { status: 500 });
  }
}
