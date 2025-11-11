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

    // meeting_topicsから公開されているトピックのmeeting_titleを取得
    const { data: topicsData, error: topicsError } = await supabase
      .from('meeting_topics')
      .select('meeting_title')
      .eq('published', true);

    if (topicsError) {
      console.error('Failed to fetch meeting topics:', topicsError);
      return NextResponse.json(
        { error: '議会トピックの取得に失敗しました' },
        { status: 500 }
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

    // まず、meeting_topicsに存在する会議をすべて追加（カード数は0で初期化）
    topicsData?.forEach((topic) => {
      if (!meetingMap.has(topic.meeting_title)) {
        meetingMap.set(topic.meeting_title, {
          title: topic.meeting_title,
          date: null,
          cardCount: 0,
        });
      }
    });

    // 次に、question_cardsからカード数をカウント
    data?.forEach((card) => {
      const title = card.meeting_title!;

      if (meetingMap.has(title)) {
        // 既存の会議のカード数を増やす
        meetingMap.get(title)!.cardCount++;
        // 日付が設定されていない場合は更新
        if (!meetingMap.get(title)!.date && card.meeting_date) {
          meetingMap.get(title)!.date = card.meeting_date;
        }
      }
    });

    // Mapを配列に変換し、会議名から年度・回数を抽出してソート（新しい順）
    const meetings = Array.from(meetingMap.values()).sort((a, b) => {
      // 全角数字を半角数字に変換
      const toHalfWidth = (str: string) => {
        return str.replace(/[０-９]/g, (s) => {
          return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        });
      };

      // 会議名から年度と回数を抽出（例: 令和４年第２回定例会 → 年度=4, 回数=2）
      const extractYearAndSession = (title: string) => {
        const normalizedTitle = toHalfWidth(title);
        const yearMatch = normalizedTitle.match(/令和(\d+)年/);
        const sessionMatch = normalizedTitle.match(/第(\d+)回/);
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
