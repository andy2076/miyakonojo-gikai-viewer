import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * カード閲覧数をインクリメントするAPIエンドポイント
 * POST /api/cards/[id]/view
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Supabaseが設定されているか確認
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 500 }
      );
    }

    const { id } = await context.params;

    // カードIDの検証
    if (!id) {
      return NextResponse.json(
        { error: 'カードIDが指定されていません' },
        { status: 400 }
      );
    }

    // まず現在のview_countを取得
    const { data: currentCard, error: fetchError } = await supabase
      .from('question_cards')
      .select('view_count')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('カードの取得エラー:', fetchError);
      return NextResponse.json(
        { error: 'カードが見つかりません' },
        { status: 404 }
      );
    }

    // view_countをインクリメント
    const newViewCount = (currentCard.view_count || 0) + 1;

    const { error: updateError } = await supabase
      .from('question_cards')
      .update({ view_count: newViewCount })
      .eq('id', id);

    if (updateError) {
      console.error('閲覧数の更新エラー:', updateError);
      return NextResponse.json(
        { error: '閲覧数の更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      view_count: newViewCount
    });
  } catch (error) {
    console.error('API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
