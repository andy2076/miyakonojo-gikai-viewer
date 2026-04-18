import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import UploadArea from './UploadArea';
import FileList from './FileList';

/**
 * ファイルアップロードページ
 */
export default async function AdminUploadPage() {
  // 認証チェック
  await requireAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ファイルアップロード
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                議事録ファイルをアップロードして管理します
              </p>
            </div>
            <Link
              href="/admin/dashboard"
              className="text-sm bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* アップロードエリア */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              新規ファイルをアップロード
            </h2>
            <UploadArea />
          </div>

          {/* ファイル一覧 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              アップロード済みファイル
            </h2>
            <FileList />
          </div>
        </div>
      </main>
    </div>
  );
}
