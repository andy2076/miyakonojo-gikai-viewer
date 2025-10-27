import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * ファイル情報更新API（会議日・タイトル）
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

    // リクエストボディから更新情報を取得
    const body = await request.json();
    const { meeting_date, meeting_title } = body;

    const updateData: any = {};
    if (meeting_date !== undefined) updateData.meeting_date = meeting_date;
    if (meeting_title !== undefined) updateData.meeting_title = meeting_title;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '更新する情報が指定されていません' },
        { status: 400 }
      );
    }

    // ファイル情報を更新
    const { data, error } = await supabase
      .from('minutes_files')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update file info:', error);
      return NextResponse.json(
        { error: 'ファイル情報の更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        meeting_date: data.meeting_date,
        meeting_title: data.meeting_title,
      },
    });
  } catch (error) {
    console.error('Error updating file info:', error);
    return NextResponse.json(
      { error: 'ファイル情報の更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
