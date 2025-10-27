import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 質問カードを削除するAPI
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const cardId = id;

    // カードを削除
    const { error } = await supabase
      .from('question_cards')
      .delete()
      .eq('id', cardId);

    if (error) {
      console.error('Failed to delete card:', error);
      return NextResponse.json(
        { error: 'カードの削除に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'カードを削除しました',
    });
  } catch (error) {
    console.error('Delete card error:', error);
    return NextResponse.json(
      {
        error: 'カードの削除中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
