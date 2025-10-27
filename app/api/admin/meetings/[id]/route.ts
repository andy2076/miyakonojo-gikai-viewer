import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 議会日程更新API
 */
export async function PATCH(
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

    // リクエストボディを取得
    const body = await request.json();
    const { title, meeting_date, description, published, display_order } = body;

    // 更新データを準備
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (meeting_date !== undefined) updateData.meeting_date = meeting_date || null;
    if (description !== undefined) updateData.description = description || null;
    if (published !== undefined) updateData.published = published;
    if (display_order !== undefined) updateData.display_order = display_order;

    // 議会日程を更新
    const { data: meeting, error } = await supabase
      .from('meetings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update meeting:', error);
      return NextResponse.json(
        { error: '議会日程の更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      meeting,
    });
  } catch (error) {
    console.error('Update meeting error:', error);
    return NextResponse.json(
      { error: '議会日程の更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * 議会日程削除API
 */
export async function DELETE(
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

    // 紐づくファイルやカードがあるかチェック
    const { count: fileCount } = await supabase
      .from('minutes_files')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_id', id);

    const { count: cardCount } = await supabase
      .from('question_cards')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_id', id);

    if ((fileCount || 0) > 0 || (cardCount || 0) > 0) {
      return NextResponse.json(
        {
          error: 'この議会日程に紐づくファイルまたはカードが存在します',
          fileCount,
          cardCount
        },
        { status: 400 }
      );
    }

    // 議会日程を削除
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete meeting:', error);
      return NextResponse.json(
        { error: '議会日程の削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete meeting error:', error);
    return NextResponse.json(
      { error: '議会日程の削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
