import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Supabaseが正しく設定されているかチェック
export function isSupabaseConfigured(): boolean {
  return (
    !!supabaseUrl &&
    !!supabaseAnonKey &&
    supabaseUrl !== 'your-supabase-project-url' &&
    supabaseAnonKey !== 'your-supabase-anon-key' &&
    supabaseUrl.startsWith('https://')
  );
}

// Supabaseが未設定の場合は警告のみ表示（エラーはスローしない）
if (!isSupabaseConfigured()) {
  console.warn(
    '⚠️ Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

// ダミーURLでクライアントを作成（実際のSupabase機能は使えないが、エラーは回避）
const validUrl = isSupabaseConfigured()
  ? supabaseUrl
  : 'https://placeholder.supabase.co';

const validKey = isSupabaseConfigured()
  ? supabaseAnonKey
  : 'placeholder-key';

export const supabase = createClient(validUrl, validKey);
