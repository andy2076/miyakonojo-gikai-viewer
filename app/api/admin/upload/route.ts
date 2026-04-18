import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

// アップロード先ディレクトリ
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');

/**
 * ファイルアップロードAPI
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // FormDataからファイルを取得
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
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

    // アップロードディレクトリを作成
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // ファイル名の生成（重複を避けるためタイムスタンプを追加）
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${timestamp}_${sanitizedFilename}`;

    // ローカルファイルシステムに保存
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(UPLOAD_DIR, storagePath);
    await fs.writeFile(filePath, fileBuffer);

    // データベースにレコードを挿入
    try {
      const result = await pool.query(
        `INSERT INTO minutes_files (file_name, file_size, file_type, storage_path, uploaded_at, processed)
         VALUES ($1, $2, $3, $4, NOW(), false)
         RETURNING *`,
        [file.name, file.size, file.type, storagePath]
      );

      return NextResponse.json({
        success: true,
        file: result.rows[0],
      });
    } catch (dbError) {
      // DB挿入失敗時、保存したファイルを削除
      await fs.unlink(filePath).catch(() => {});
      console.error('Database insert error:', dbError);
      return NextResponse.json(
        { error: `データベースへの保存に失敗しました: ${dbError instanceof Error ? dbError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'アップロード処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
