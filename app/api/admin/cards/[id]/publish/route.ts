import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 質問カードの公開/非公開を切り替えるAPI
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { published } = body;

    if (typeof published !== 'boolean') {
      return NextResponse.json(
        { error: 'publishedフィールドが必要です（boolean）' },
        { status: 400 }
      );
    }

    // カードの公開状態を更新
    const { data, error } = await supabase
      .from('question_cards')
      .update({ published })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update card:', error);
      return NextResponse.json(
        { error: 'カードの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      card: data,
    });
  } catch (error) {
    console.error('Publish API error:', error);
    return NextResponse.json(
      {
        error: '更新処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
