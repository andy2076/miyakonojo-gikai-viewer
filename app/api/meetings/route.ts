import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 議会日程（meeting）の一覧を取得するAPI
 * 公開されているカードがある議会のみを返す
 */
export async function GET(request: NextRequest) {
  try {
    // Supabase設定チェック
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 503 }
      );
    }

    // 公開されているカードから、ユニークなmeeting_titleとmeeting_dateを取得
    const { data, error } = await supabase
      .from('question_cards')
      .select('meeting_title, meeting_date')
      .eq('published', true)
      .not('meeting_title', 'is', null)
      .order('meeting_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch meetings:', error);
      return NextResponse.json(
        { error: '議会日程の取得に失敗しました' },
        { status: 500 }
      );
    }

    // meeting_titleごとにグループ化し、カード数をカウント
    const meetingMap = new Map<string, {
      title: string;
      date: string | null;
      cardCount: number;
    }>();

    data?.forEach((card) => {
      const title = card.meeting_title!;
      if (meetingMap.has(title)) {
        meetingMap.get(title)!.cardCount++;
      } else {
        meetingMap.set(title, {
          title,
          date: card.meeting_date,
          cardCount: 1,
        });
      }
    });

    // Mapを配列に変換し、会議名から年度・回数を抽出してソート（新しい順）
    const meetings = Array.from(meetingMap.values()).sort((a, b) => {
      // 会議名から年度と回数を抽出（例: 令和4年第2回定例会 → 年度=4, 回数=2）
      const extractYearAndSession = (title: string) => {
        const yearMatch = title.match(/令和(\d+)年/);
        const sessionMatch = title.match(/第(\d+)回/);
        const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
        const session = sessionMatch ? parseInt(sessionMatch[1], 10) : 0;
        return { year, session };
      };

      const aInfo = extractYearAndSession(a.title);
      const bInfo = extractYearAndSession(b.title);

      // 年度が異なる場合は年度で比較（新しい順）
      if (aInfo.year !== bInfo.year) {
        return bInfo.year - aInfo.year;
      }

      // 年度が同じ場合は回数で比較（新しい順）
      return bInfo.session - aInfo.session;
    });

    return NextResponse.json({
      meetings,
      total: meetings.length,
    });
  } catch (error) {
    console.error('Meetings API error:', error);
    return NextResponse.json(
      {
        error: '議会日程取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
