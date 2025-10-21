import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LoginForm from './LoginForm';
import { loginAction } from './actions';

/**
 * ログインページ
 */
export default async function AdminLoginPage() {
  // 既にログイン済みの場合はダッシュボードへリダイレクト
  const session = await getSession();
  if (session) {
    redirect('/admin/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              管理者ログイン
            </h1>
            <p className="text-gray-600 text-sm">
              都城市議会可視化アプリ 管理画面
            </p>
          </div>

          {/* ログインフォーム */}
          <LoginForm loginAction={loginAction} />
        </div>

        {/* フッター */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            ← トップページに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
