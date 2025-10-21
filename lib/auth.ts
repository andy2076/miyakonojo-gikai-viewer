import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-in-production';

/**
 * パスワード検証
 */
export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set');
    return false;
  }

  return password === adminPassword;
}

/**
 * セッションを作成（ログイン）
 */
export async function createSession(): Promise<void> {
  const cookieStore = await cookies();

  // セッショントークンを生成（簡易版）
  const sessionToken = Buffer.from(`admin:${Date.now()}`).toString('base64');

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7日間
    path: '/',
  });
}

/**
 * セッションを削除（ログアウト）
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * セッションの存在確認
 */
export async function getSession(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * 認証チェック（未ログイン時はリダイレクト）
 */
export async function requireAuth(): Promise<void> {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }
}
