import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 質問カードを一括削除するAPI
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

    const body = await request.json();
    const { cardIds } = body as { cardIds: string[] };

    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json(
        { error: '削除するカードIDを指定してください' },
        { status: 400 }
      );
    }

    console.log(`一括削除開始: ${cardIds.length}件`);

    // カードを一括削除
    const { error, count } = await supabase
      .from('question_cards')
      .delete()
      .in('id', cardIds);

    if (error) {
      console.error('Failed to bulk delete cards:', error);
      return NextResponse.json(
        { error: 'カードの一括削除に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    console.log(`一括削除完了: ${count || cardIds.length}件`);

    return NextResponse.json({
      success: true,
      deleted: count || cardIds.length,
      message: `${count || cardIds.length}件のカードを削除しました`,
    });
  } catch (error) {
    console.error('Bulk delete cards error:', error);
    return NextResponse.json(
      {
        error: 'カードの一括削除中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
