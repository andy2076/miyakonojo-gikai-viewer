import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 全トピック一覧を取得するAPI（管理者用）
 * published状態に関わらず全て取得
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 503 }
      );
    }

    // publishedに関わらず全てのトピックを取得
    const { data, error } = await supabase
      .from('meeting_topics')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch all topics:', error);
      return NextResponse.json(
        { error: 'トピック一覧の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      topics: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Topics list API error:', error);
    return NextResponse.json(
      {
        error: 'トピック一覧取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
