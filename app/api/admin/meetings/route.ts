import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 議会日程一覧取得API
 */
export async function GET(request: NextRequest) {
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

    // 議会日程を取得（display_order順）
    const { data: meetings, error } = await supabase
      .from('meetings')
      .select('*')
      .order('display_order', { ascending: true })
      .order('meeting_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch meetings:', error);
      return NextResponse.json(
        { error: '議会日程の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      meetings: meetings || [],
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    return NextResponse.json(
      { error: '議会日程の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * 議会日程作成API
 */
export async function POST(request: NextRequest) {
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

    // リクエストボディを取得
    const body = await request.json();
    const { title, meeting_date, description, published, display_order } = body;

    // バリデーション
    if (!title) {
      return NextResponse.json(
        { error: 'タイトルは必須です' },
        { status: 400 }
      );
    }

    // 議会日程を作成
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        title,
        meeting_date: meeting_date || null,
        description: description || null,
        published: published ?? false,
        display_order: display_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create meeting:', error);
      return NextResponse.json(
        { error: '議会日程の作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      meeting,
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    return NextResponse.json(
      { error: '議会日程の作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
