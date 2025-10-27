import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 全カードを削除するAPI
 */
export async function DELETE(request: NextRequest) {
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

    // 全カードを削除
    const { error, count } = await supabase
      .from('question_cards')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 全件削除（ダミー条件）

    if (error) {
      console.error('Failed to delete all cards:', error);
      return NextResponse.json(
        { error: 'カードの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: count,
    });
  } catch (error) {
    console.error('Clear cards error:', error);
    return NextResponse.json(
      { error: 'カード削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
