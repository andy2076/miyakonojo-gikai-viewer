import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import pool from '@/lib/db';
import LogoutButton from './LogoutButton';
import ReparseButton from './ReparseButton';

/**
 * カード統計情報を取得
 */
async function getCardStats() {
  try {
    const result = await pool.query('SELECT * FROM question_cards');
    const allCards = result.rows;

    const totalCards = allCards.length;
    const publishedCards = allCards.filter((c: any) => c.published).length;
    const unpublishedCards = totalCards - publishedCards;

    const uniqueMeetings = new Set(allCards.map((c: any) => c.meeting_title).filter(Boolean));
    const totalMeetings = uniqueMeetings.size;

    const topViewedCards = allCards
      .filter((c: any) => c.published)
      .sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5)
      .map((card: any) => ({
        id: card.id,
        member_name: card.member_name,
        question_summary: card.question_summary || card.question_text || '質問内容',
        view_count: card.view_count || 0,
        meeting_title: card.meeting_title || '',
      }));

    return { totalCards, publishedCards, unpublishedCards, totalMeetings, topViewedCards };
  } catch (error) {
    console.error('Error fetching card stats:', error);
    return { totalCards: 0, publishedCards: 0, unpublishedCards: 0, totalMeetings: 0, topViewedCards: [] };
  }
}

/**
 * 管理ダッシュボードページ
 */
export default async function AdminDashboardPage() {
  await requireAuth();
  const stats = await getCardStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">管理ダッシュボード</h1>
              <p className="text-sm text-gray-600 mt-1">都城市議会可視化アプリ 管理画面</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">トップページ</Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* クイックアクション */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/admin/cards" className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 rounded-lg p-3"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
                <div><h3 className="font-semibold text-lg">質問カード管理</h3><p className="text-sm text-green-100">カードの公開/非公開を設定</p></div>
              </div>
            </Link>
            <Link href="/admin/gpt-import" className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 rounded-lg p-3"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div>
                <div><h3 className="font-semibold text-lg">AI分析インポート</h3><p className="text-sm text-orange-100">AI分析CSVをアップロード</p></div>
              </div>
            </Link>
            <Link href="/admin/topics-list" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 rounded-lg p-3"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg></div>
                <div><h3 className="font-semibold text-lg">トピック一覧</h3><p className="text-sm text-purple-100">可決トピックの管理</p></div>
              </div>
            </Link>
          </div>
        </div>

        {/* カード統計 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">カード統計</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalCards}</div><div className="text-sm text-gray-600">総カード数</div></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><div className="text-3xl font-bold text-gray-900 mb-1">{stats.publishedCards}</div><div className="text-sm text-gray-600">公開中</div></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><div className="text-3xl font-bold text-gray-900 mb-1">{stats.unpublishedCards}</div><div className="text-sm text-gray-600">非公開</div></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalMeetings}</div><div className="text-sm text-gray-600">会議数</div></div>
          </div>
        </div>

        {/* 閲覧数トップ5 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">閲覧数トップ5</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {stats.topViewedCards.length === 0 ? (
              <div className="p-6 text-center text-gray-500">公開カードがまだありません</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {stats.topViewedCards.map((card: any, index: number) => (
                  <div key={card.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">{index + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{card.member_name}</p>
                        <p className="text-sm text-gray-600 truncate">{card.question_summary.length > 60 ? card.question_summary.substring(0, 60) + '...' : card.question_summary}</p>
                        <p className="text-xs text-gray-500 mt-1">{card.meeting_title}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-2xl font-bold text-gray-900">{card.view_count}</div>
                        <div className="text-xs text-gray-500">views</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 再解析セクション */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">データ管理</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-2">全ファイル再解析</h3>
            <p className="text-sm text-gray-600 mb-4">既存の全カードを削除し、アップロード済みの全ファイルを新しいロジックで再解析します。</p>
            <ReparseButton />
          </div>
        </div>
      </main>
    </div>
  );
}
