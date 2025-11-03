import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * トピックを削除するAPI
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

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 503 }
      );
    }

    const { id } = await params;

    // トピックを削除
    const { error } = await supabase
      .from('meeting_topics')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete topic:', error);
      return NextResponse.json(
        { error: 'トピックの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'トピックを削除しました',
    });
  } catch (error) {
    console.error('Topic delete API error:', error);
    return NextResponse.json(
      {
        error: 'トピック削除中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
