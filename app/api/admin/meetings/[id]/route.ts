import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * 議会日程更新API
 */
export async function PATCH(
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
    const { title, meeting_date, description, published, display_order } = body;

    const sets: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) { sets.push(`title = $${paramIndex++}`); values.push(title); }
    if (meeting_date !== undefined) { sets.push(`meeting_date = $${paramIndex++}`); values.push(meeting_date || null); }
    if (description !== undefined) { sets.push(`description = $${paramIndex++}`); values.push(description || null); }
    if (published !== undefined) { sets.push(`published = $${paramIndex++}`); values.push(published); }
    if (display_order !== undefined) { sets.push(`display_order = $${paramIndex++}`); values.push(display_order); }

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE meetings SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '議会日程が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ meeting: result.rows[0] });
  } catch (error) {
    console.error('Update meeting error:', error);
    return NextResponse.json({ error: '議会日程の更新中にエラーが発生しました' }, { status: 500 });
  }
}

/**
 * 議会日程削除API
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

    const fileCount = await pool.query('SELECT COUNT(*) FROM minutes_files WHERE meeting_id = $1', [id]);
    const cardCount = await pool.query('SELECT COUNT(*) FROM question_cards WHERE meeting_id = $1', [id]);

    const files = parseInt(fileCount.rows[0].count, 10);
    const cards = parseInt(cardCount.rows[0].count, 10);

    if (files > 0 || cards > 0) {
      return NextResponse.json(
        { error: 'この議会日程に紐づくファイルまたはカードが存在します', fileCount: files, cardCount: cards },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM meetings WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete meeting error:', error);
    return NextResponse.json({ error: '議会日程の削除中にエラーが発生しました' }, { status: 500 });
  }
}
