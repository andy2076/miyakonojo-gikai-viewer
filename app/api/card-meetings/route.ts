import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 公開用: question_cardsに登録済みの会議名一覧を取得するAPI
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

    // 公開済みカードのmeeting_titleのユニークな値を取得
    const { data, error } = await supabase
      .from('question_cards')
      .select('meeting_title')
      .eq('published', true)
      .not('meeting_title', 'is', null)
      .order('meeting_title', { ascending: false });

    if (error) {
      console.error('Failed to fetch meeting titles:', error);
      return NextResponse.json(
        { error: '会議名の取得に失敗しました' },
        { status: 500 }
      );
    }

    // ユニークな会議名のリストを作成
    const uniqueMeetings = Array.from(
      new Set(data?.map(item => item.meeting_title).filter(Boolean))
    );

    return NextResponse.json({
      meetings: uniqueMeetings,
    });
  } catch (error) {
    console.error('Card meetings API error:', error);
    return NextResponse.json(
      {
        error: '会議名取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
