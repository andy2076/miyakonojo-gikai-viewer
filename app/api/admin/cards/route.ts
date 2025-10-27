import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 管理画面用: すべての質問カードを取得するAPI（認証必要）
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

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const memberName = searchParams.get('member');
    const meetingTitle = searchParams.get('meeting');
    const published = searchParams.get('published'); // 'true', 'false', または指定なし
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // ベースクエリ: すべてのカード（公開・非公開問わず）
    let query = supabase
      .from('question_cards')
      .select('*', { count: 'exact' })
      .order('meeting_date', { ascending: false })
      .order('member_name', { ascending: true });

    // 議員名でフィルタ
    if (memberName) {
      query = query.ilike('member_name', `%${memberName}%`);
    }

    // 会議名でフィルタ
    if (meetingTitle) {
      query = query.eq('meeting_title', meetingTitle);
    }

    // 公開状態でフィルタ
    if (published === 'true') {
      query = query.eq('published', true);
    } else if (published === 'false') {
      query = query.eq('published', false);
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch question cards:', error);
      return NextResponse.json(
        { error: 'カードの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      cards: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Admin cards API error:', error);
    return NextResponse.json(
      {
        error: 'カード取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
