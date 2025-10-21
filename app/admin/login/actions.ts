'use server';

import { redirect } from 'next/navigation';
import { verifyPassword, createSession } from '@/lib/auth';

export interface LoginState {
  error?: string;
}

/**
 * ログインアクション（Server Action）
 */
export async function loginAction(
  previousState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const password = formData.get('password') as string;

  if (!password) {
    return { error: 'パスワードを入力してください' };
  }

  if (verifyPassword(password)) {
    await createSession();
    redirect('/admin/dashboard');
  } else {
    return { error: 'パスワードが正しくありません' };
  }
}
