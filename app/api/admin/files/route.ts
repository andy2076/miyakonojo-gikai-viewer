import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * ファイル一覧取得API
 */
export async function GET() {
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
      // 空のファイルリストを返す
      return NextResponse.json({
        files: [],
        warning: 'Supabaseが設定されていません',
      });
    }

    // ファイル一覧を取得（新しい順）
    const { data: files, error } = await supabase
      .from('minutes_files')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: 'ファイル一覧の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      files: files || [],
    });
  } catch (error) {
    console.error('Get files error:', error);
    return NextResponse.json(
      { error: 'ファイル一覧の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
