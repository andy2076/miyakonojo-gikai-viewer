import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 公開されている質問カードを取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    // Supabase設定チェック
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 503 }
      );
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const memberName = searchParams.get('member');
    const topic = searchParams.get('topic');
    const category = searchParams.get('category'); // 分野カテゴリ（gpt_field_tags用）
    const keyword = searchParams.get('keyword');
    const meetingTitle = searchParams.get('meeting');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // ベースクエリ: 公開されているカードのみ
    let query = supabase
      .from('question_cards')
      .select('*', { count: 'exact' })
      .eq('published', true)
      .order('meeting_date', { ascending: false })
      .order('member_name', { ascending: true });

    // 会議タイトルでフィルタ
    if (meetingTitle) {
      query = query.eq('meeting_title', meetingTitle);
    }

    // 議員名でフィルタ
    if (memberName) {
      query = query.ilike('member_name', `%${memberName}%`);
    }

    // トピックでフィルタ（配列に含まれるかチェック）
    if (topic) {
      query = query.contains('topics', [topic]);
    }

    // 分野カテゴリでフィルタ（gpt_field_tags配列に含まれるかチェック）
    if (category) {
      query = query.contains('gpt_field_tags', [category]);
    }

    // キーワードでフィルタ（質問テキストまたは全文内を検索）
    if (keyword) {
      console.log('Searching for keyword:', keyword);
      // Supabaseの正しいOR構文を使用（*はPostgRESTワイルドカード）
      query = query.or(`question_text.ilike.*${keyword}*,full_content.ilike.*${keyword}*`);
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch question cards:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'カードの取得に失敗しました' },
        { status: 500 }
      );
    }

    console.log('Search results:', data?.length, 'cards found');

    return NextResponse.json({
      cards: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Cards API error:', error);
    return NextResponse.json(
      {
        error: 'カード取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
