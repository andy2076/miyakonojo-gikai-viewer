import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
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
          {/* Supabase未設定警告 */}
          {!isSupabaseConfigured() && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong className="font-medium">Supabaseが未設定です。</strong>
                    <br />
                    ファイルのアップロード機能を使用するには、.env.localファイルで
                    <code className="bg-yellow-100 px-1 py-0.5 rounded">
                      NEXT_PUBLIC_SUPABASE_URL
                    </code>
                    と
                    <code className="bg-yellow-100 px-1 py-0.5 rounded">
                      NEXT_PUBLIC_SUPABASE_ANON_KEY
                    </code>
                    を設定してください。
                  </p>
                </div>
              </div>
            </div>
          )}

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
