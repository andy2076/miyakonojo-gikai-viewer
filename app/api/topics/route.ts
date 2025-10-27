import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MeetingTopic } from '@/types/database';

/**
 * 可決トピックの一覧を取得するAPI
 * クエリパラメータ: meeting_title (オプション)
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const meetingTitle = searchParams.get('meeting_title');

    let query = supabase
      .from('meeting_topics')
      .select('*')
      .eq('published', true)
      .order('display_order', { ascending: true });

    // meeting_titleでフィルタ
    if (meetingTitle) {
      query = query.eq('meeting_title', meetingTitle);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch meeting topics:', error);
      return NextResponse.json(
        { error: '可決トピックの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      topics: data as MeetingTopic[],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Meeting topics API error:', error);
    return NextResponse.json(
      {
        error: '可決トピック取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 可決トピックを作成・更新するAPI
 * リクエストボディ: { meeting_title, title, date, description, content_data, summary, supplementary_budget, total_budget_after, published }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      meeting_title,
      title,
      date,
      description,
      content_data,
      summary,
      supplementary_budget,
      total_budget_after,
      published = false,
    } = body;

    // 必須フィールドのチェック
    if (!meeting_title || !title || !content_data) {
      return NextResponse.json(
        { error: 'meeting_title, title, content_dataは必須です' },
        { status: 400 }
      );
    }

    // 同じmeeting_titleのトピックが既に存在するかチェック
    const { data: existing } = await supabase
      .from('meeting_topics')
      .select('id')
      .eq('meeting_title', meeting_title)
      .single();

    let result;

    if (existing) {
      // 更新
      const { data, error } = await supabase
        .from('meeting_topics')
        .update({
          title,
          date,
          description,
          content_data,
          summary,
          supplementary_budget,
          total_budget_after,
          published,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update meeting topic:', error);
        return NextResponse.json(
          { error: '可決トピックの更新に失敗しました' },
          { status: 500 }
        );
      }

      result = { topic: data, updated: true };
    } else {
      // 新規作成
      const { data, error } = await supabase
        .from('meeting_topics')
        .insert({
          meeting_title,
          title,
          date,
          description,
          content_data,
          summary,
          supplementary_budget,
          total_budget_after,
          published,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create meeting topic:', error);
        return NextResponse.json(
          { error: '可決トピックの作成に失敗しました' },
          { status: 500 }
        );
      }

      result = { topic: data, created: true };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Meeting topics API error:', error);
    return NextResponse.json(
      {
        error: '可決トピック処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
