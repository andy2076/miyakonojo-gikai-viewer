import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * 議会日程（meeting）の一覧を取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    // meeting_topicsから公開トピックのmeeting_titleを取得
    const topicsResult = await pool.query(
      "SELECT DISTINCT meeting_title FROM meeting_topics WHERE published = true"
    );

    // 公開カードからmeeting_titleとmeeting_dateを取得
    const cardsResult = await pool.query(
      "SELECT meeting_title, meeting_date FROM question_cards WHERE published = true AND meeting_title IS NOT NULL ORDER BY meeting_date DESC"
    );

    // meeting_titleごとにグループ化
    const meetingMap = new Map<string, { title: string; date: string | null; cardCount: number }>();

    // meeting_topicsの会議を追加
    topicsResult.rows.forEach((topic: any) => {
      if (!meetingMap.has(topic.meeting_title)) {
        meetingMap.set(topic.meeting_title, { title: topic.meeting_title, date: null, cardCount: 0 });
      }
    });

    // question_cardsからカード数をカウント
    cardsResult.rows.forEach((card: any) => {
      const title = card.meeting_title;
      if (meetingMap.has(title)) {
        meetingMap.get(title)!.cardCount++;
        if (!meetingMap.get(title)!.date && card.meeting_date) {
          meetingMap.get(title)!.date = card.meeting_date;
        }
      }
    });

    // 全角数字を半角数字に変換
    const toHalfWidth = (str: string) => {
      return str.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    };

    const meetings = Array.from(meetingMap.values()).sort((a, b) => {
      const extractYearAndSession = (title: string) => {
        const normalized = toHalfWidth(title);
        const yearMatch = normalized.match(/令和(\d+)年/);
        const sessionMatch = normalized.match(/第(\d+)回/);
        return {
          year: yearMatch ? parseInt(yearMatch[1], 10) : 0,
          session: sessionMatch ? parseInt(sessionMatch[1], 10) : 0,
        };
      };
      const aInfo = extractYearAndSession(a.title);
      const bInfo = extractYearAndSession(b.title);
      if (aInfo.year !== bInfo.year) return bInfo.year - aInfo.year;
      return bInfo.session - aInfo.session;
    });

    return NextResponse.json({ meetings, total: meetings.length });
  } catch (error) {
    console.error('Meetings API error:', error);
    return NextResponse.json(
      { error: '議会日程取得中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
