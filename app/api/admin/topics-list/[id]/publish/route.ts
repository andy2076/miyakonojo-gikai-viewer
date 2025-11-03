import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * トピックの公開/非公開を切り替えるAPI
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { published } = body;

    if (typeof published !== 'boolean') {
      return NextResponse.json(
        { error: 'publishedはboolean型である必要があります' },
        { status: 400 }
      );
    }

    // トピックの公開状態を更新
    const { error } = await supabase
      .from('meeting_topics')
      .update({ published })
      .eq('id', id);

    if (error) {
      console.error('Failed to update topic published status:', error);
      return NextResponse.json(
        { error: '公開状態の更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      published,
      message: published ? 'トピックを公開しました' : 'トピックを非公開にしました',
    });
  } catch (error) {
    console.error('Topic publish API error:', error);
    return NextResponse.json(
      {
        error: '公開状態の更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
