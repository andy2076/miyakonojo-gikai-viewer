import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * カードの一括公開/非公開API
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Supabase設定チェック
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 503 }
      );
    }

    const { cardIds, published } = await request.json();

    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json(
        { error: 'カードIDが指定されていません' },
        { status: 400 }
      );
    }

    if (typeof published !== 'boolean') {
      return NextResponse.json(
        { error: '公開状態が指定されていません' },
        { status: 400 }
      );
    }

    // 一括更新
    const { data, error } = await supabase
      .from('question_cards')
      .update({ published, updated_at: new Date().toISOString() })
      .in('id', cardIds)
      .select('id');

    if (error) {
      console.error('Bulk publish error:', error);
      return NextResponse.json(
        { error: '一括公開/非公開に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
      published,
    });
  } catch (error) {
    console.error('Bulk publish error:', error);
    return NextResponse.json(
      {
        error: '一括公開/非公開処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
