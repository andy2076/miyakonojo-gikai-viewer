import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 管理画面用: question_cardsに登録済みの会議名一覧を取得するAPI（認証必要）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // Supabase設定チェック
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 503 }
      );
    }

    // meeting_titleのユニークな値を取得
    const { data, error } = await supabase
      .from('question_cards')
      .select('meeting_title')
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
    console.error('Admin card meetings API error:', error);
    return NextResponse.json(
      {
        error: '会議名取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
