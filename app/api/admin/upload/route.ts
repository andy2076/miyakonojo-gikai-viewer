import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * ファイルアップロードAPI
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
        { error: 'Supabaseが設定されていません。.env.localファイルでNEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_ANON_KEYを設定してください。' },
        { status: 503 }
      );
    }

    // FormDataからファイルを取得
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    // ファイル検証
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'PDF, DOC, DOCX ファイルのみアップロード可能です' },
        { status: 400 }
      );
    }

    // ファイル名の生成（重複を避けるためタイムスタンプを追加）
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${timestamp}_${sanitizedFilename}`;

    // Supabase Storageにアップロード
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('minutes-files')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: `ファイルのアップロードに失敗しました: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // データベースにレコードを挿入
    const { data: dbData, error: dbError } = await supabase
      .from('minutes_files')
      .insert({
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: storagePath,
        uploaded_at: new Date().toISOString(),
        processed: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);

      // データベース挿入に失敗した場合、アップロードしたファイルを削除
      await supabase.storage.from('minutes-files').remove([storagePath]);

      return NextResponse.json(
        { error: `データベースへの保存に失敗しました: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      file: dbData,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'アップロード処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
