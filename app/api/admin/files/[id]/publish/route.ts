import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * ファイル公開/非公開切り替えAPI
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // リクエストボディから公開フラグを取得
    const body = await request.json();
    const { published } = body;

    if (typeof published !== 'boolean') {
      return NextResponse.json(
        { error: 'published フラグが必要です' },
        { status: 400 }
      );
    }

    // ファイル情報を更新
    const { data, error } = await supabase
      .from('minutes_files')
      .update({ published })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update published status:', error);
      return NextResponse.json(
        { error: '公開状態の更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        published: data.published,
      },
    });
  } catch (error) {
    console.error('Error updating publish status:', error);
    return NextResponse.json(
      { error: '公開状態の更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
