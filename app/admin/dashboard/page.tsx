import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { FileStats } from '@/types/database';
import LogoutButton from './LogoutButton';

/**
 * ファイル統計情報を取得
 */
async function getFileStats(): Promise<FileStats> {
  // Supabaseが未設定の場合は空の統計を返す
  if (!isSupabaseConfigured()) {
    return {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      error: 0,
    };
  }

  try {
    // 全ファイル数を取得
    const { count: total } = await supabase
      .from('minutes_files')
      .select('*', { count: 'exact', head: true });

    // 処理済みの件数を取得
    const { count: completed } = await supabase
      .from('minutes_files')
      .select('*', { count: 'exact', head: true })
      .eq('processed', true);

    // 未処理の件数を取得
    const { count: pending } = await supabase
      .from('minutes_files')
      .select('*', { count: 'exact', head: true })
      .eq('processed', false);

    const stats: FileStats = {
      total: total || 0,
      pending: pending || 0,
      completed: completed || 0,
    };

    return stats;
  } catch (error) {
    console.error('Error fetching file stats:', error);
    return {
      total: 0,
      pending: 0,
      completed: 0,
    };
  }
}

/**
 * 管理ダッシュボードページ
 */
export default async function AdminDashboardPage() {
  // 認証チェック
  await requireAuth();

  // 統計情報を取得
  const stats = await getFileStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                管理ダッシュボード
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                都城市議会可視化アプリ 管理画面
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                トップページ
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Supabase未設定警告 */}
        {!isSupabaseConfigured() && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
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
                  ファイルのアップロードと統計機能を使用するには、.env.localファイルで
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

        {/* クイックアクション */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            クイックアクション
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/admin/upload"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 rounded-lg p-3">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">ファイルアップロード</h3>
                  <p className="text-sm text-blue-100">
                    議事録ファイルをアップロード
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* 統計カード */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            ファイル統計
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 全ファイル数 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stats.total}
              </div>
              <div className="text-sm text-gray-600">アップロード済み</div>
            </div>

            {/* 処理済み */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-50 rounded-lg p-3">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stats.completed}
              </div>
              <div className="text-sm text-gray-600">処理済み</div>
            </div>

            {/* 未処理 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-yellow-50 rounded-lg p-3">
                  <svg
                    className="w-6 h-6 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stats.pending}
              </div>
              <div className="text-sm text-gray-600">未処理</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
