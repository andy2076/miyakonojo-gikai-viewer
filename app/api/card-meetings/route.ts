import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * 公開用: question_cardsに登録済みの会議名一覧を取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    const result = await pool.query(
      "SELECT DISTINCT meeting_title FROM question_cards WHERE published = true AND meeting_title IS NOT NULL ORDER BY meeting_title DESC"
    );

    const uniqueMeetings = result.rows.map((row: any) => row.meeting_title);

    return NextResponse.json({ meetings: uniqueMeetings });
  } catch (error) {
    console.error('Card meetings API error:', error);
    return NextResponse.json(
      { error: '会議名取得中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
