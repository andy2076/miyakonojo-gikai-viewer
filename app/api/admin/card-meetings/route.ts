import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * 管理画面用: question_cardsに登録済みの会議名一覧を取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const result = await pool.query(
      "SELECT DISTINCT meeting_title FROM question_cards WHERE meeting_title IS NOT NULL ORDER BY meeting_title DESC"
    );

    const uniqueMeetings = result.rows.map((row: any) => row.meeting_title);

    return NextResponse.json({ meetings: uniqueMeetings });
  } catch (error) {
    console.error('Admin card meetings API error:', error);
    return NextResponse.json(
      { error: '会議名取得中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
