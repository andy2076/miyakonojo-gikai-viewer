import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * ファイル削除API
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

    // リクエストボディからfile_idsを取得
    const body = await request.json();
    const { file_ids } = body;

    if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) {
      return NextResponse.json(
        { error: 'file_idsが必要です' },
        { status: 400 }
      );
    }

    // ファイル情報を取得
    const { data: files, error: fetchError } = await supabase
      .from('minutes_files')
      .select('*')
      .in('id', file_ids);

    if (fetchError) {
      return NextResponse.json(
        { error: `ファイル情報の取得に失敗しました: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '削除するファイルが見つかりません' },
        { status: 404 }
      );
    }

    // Storageからファイルを削除
    const storageErrors: string[] = [];
    for (const file of files) {
      const { error: storageError } = await supabase.storage
        .from('minutes-files')
        .remove([file.storage_path]);

      if (storageError) {
        console.error(`Storage delete error for ${file.storage_path}:`, storageError);
        storageErrors.push(`${file.file_name}: ${storageError.message}`);
      }
    }

    // データベースからレコードを削除
    const { error: deleteError } = await supabase
      .from('minutes_files')
      .delete()
      .in('id', file_ids);

    if (deleteError) {
      return NextResponse.json(
        { error: `データベースからの削除に失敗しました: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_count: files.length,
      storage_errors: storageErrors.length > 0 ? storageErrors : undefined,
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      {
        error: '削除処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
