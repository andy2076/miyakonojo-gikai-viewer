/**
 * データベース型定義
 */

/**
 * 議事録ファイルテーブル
 */
export interface MinutesFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  file_path: string | null;
  session_date: string | null;
  fiscal_year: number | null;
  session_type: string | null;
  uploaded_at: string;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * ファイルアップロード用の型
 */
export interface UploadFileData {
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
}

/**
 * ファイル統計情報
 */
export interface FileStats {
  total: number;
  pending: number;
  completed: number;
}
