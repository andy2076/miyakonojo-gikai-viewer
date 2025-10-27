import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

/**
 * 個別の質問カードを取得するAPI
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Supabase設定チェック
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 503 }
      );
    }

    // Next.js 15ではparamsは非同期
    const { id } = await params;

    // 認証チェック（認証済みなら非公開カードも見られる）
    const session = await getSession();
    const isAuthenticated = !!session;

    // クエリビルダーを作成
    let query = supabase
      .from('question_cards')
      .select('*')
      .eq('id', id);

    // 認証されていない場合は公開カードのみ
    if (!isAuthenticated) {
      query = query.eq('published', true);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが見つからない
        return NextResponse.json(
          { error: 'カードが見つかりません' },
          { status: 404 }
        );
      }

      console.error('Failed to fetch question card:', error);
      return NextResponse.json(
        { error: 'カードの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ card: data });
  } catch (error) {
    console.error('Card API error:', error);
    return NextResponse.json(
      {
        error: 'カード取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
