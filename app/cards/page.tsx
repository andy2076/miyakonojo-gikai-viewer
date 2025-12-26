'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QuestionCardRecord } from '@/types/database';

export const dynamic = 'force-dynamic';

interface CardsResponse {
  cards: QuestionCardRecord[];
  total: number;
  limit: number;
  offset: number;
}

function CardsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const meetingParam = searchParams.get('meeting');
  const categoryParam = searchParams.get('category'); // 分野カテゴリ
  const keywordParam = searchParams.get('keyword'); // キーワード検索

  console.log('URL Parameters:', { meetingParam, categoryParam, keywordParam });

  const [cards, setCards] = useState<QuestionCardRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 議会一覧
  const [meetings, setMeetings] = useState<string[]>([]);

  // フィルター状態
  const [memberFilter, setMemberFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // ページネーション
  const [offset, setOffset] = useState(0);
  const limit = 12;

  // 議会一覧を取得
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/card-meetings');
      if (!res.ok) {
        throw new Error('議会一覧の取得に失敗しました');
      }
      const data = await res.json();
      setMeetings(data.meetings || []);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  }, []);

  // カードを取得
  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (meetingParam) params.append('meeting', meetingParam);
      if (categoryParam) params.append('category', categoryParam); // 分野カテゴリ
      if (keywordParam) params.append('keyword', keywordParam); // キーワード検索
      if (memberFilter) params.append('member', memberFilter);

      // 絶対URLを使用してキャッシュを回避
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const apiUrl = `${baseUrl}/api/cards?${params.toString()}`;
      console.log('Fetching cards from:', apiUrl);
      const res = await fetch(apiUrl, {
        cache: 'no-store',
        next: { revalidate: 0 },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!res.ok) {
        throw new Error('カードの取得に失敗しました');
      }

      const data: CardsResponse = await res.json();
      setCards(data.cards);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch cards:', err);
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, meetingParam, categoryParam, keywordParam, memberFilter]);

  useEffect(() => {
    console.log('useEffect triggered with:', { meetingParam, categoryParam, keywordParam });
    // 会期一覧は常に取得（カテゴリフィルターでも使用するため）
    fetchMeetings();
    if (meetingParam || categoryParam || keywordParam) {
      console.log('Calling fetchCards()');
      fetchCards();
    }
  }, [meetingParam, categoryParam, keywordParam, fetchCards, fetchMeetings]);

  // 分野内キーワード検索ハンドラー
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    const params = new URLSearchParams();
    if (categoryParam) params.append('category', categoryParam);
    if (meetingParam) params.append('meeting', meetingParam);
    if (searchInput.trim()) params.append('keyword', searchInput.trim());

    router.push(`/cards?${params.toString()}`);
  };

  // 質問テキストを短縮
  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // 日付フォーマット
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '日付未設定';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 会派別の色を取得
  const getFactionColor = (faction: string | null) => {
    if (!faction) return 'from-gray-500 to-slate-600';

    const factionName = faction.trim();

    // 自民党系（自由民主党有志会、進政会など保守系）
    if (factionName.includes('自民') || factionName.includes('自由民主党') || factionName.includes('進政会')) {
      return 'from-indigo-600 to-indigo-700';
    }
    // 立憲民主
    else if (factionName.includes('立憲')) {
      return 'from-blue-600 to-blue-700';
    }
    // 公明（淡いピンク）
    else if (factionName.includes('公明')) {
      return 'from-pink-400 to-pink-500';
    }
    // 共産党
    else if (factionName.includes('共産')) {
      return 'from-red-400 to-red-500';
    }
    // 国民民主
    else if (factionName.includes('国民')) {
      return 'from-yellow-500 to-amber-500';
    }
    // 維新
    else if (factionName.includes('維新')) {
      return 'from-green-600 to-emerald-600';
    }
    // その他の会派（青雲、一心会、令和創生など）
    else {
      return 'from-teal-500 to-cyan-600';
    }
  };

  // 議会一覧表示（meetingParam, categoryParam, keywordParamのいずれもない場合）
  if (!meetingParam && !categoryParam && !keywordParam) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                トップページに戻る
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">議会質問カード</h1>
            <p className="mt-2 text-gray-600">
              議会を選択して質問カードをご覧ください
            </p>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              エラー: {error}
            </div>
          ) : meetings.length === 0 ? (
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-8 text-center text-gray-600">
              公開されている議会がありません
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetings.map((meeting) => (
                <Link
                  key={meeting}
                  href={`/cards?meeting=${encodeURIComponent(meeting)}`}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-gray-200 hover:border-blue-500 group"
                >
                  <div className="p-8">
                    <div className="flex items-center justify-center mb-4">
                      <svg
                        className="w-16 h-16 text-blue-600 group-hover:text-blue-700 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 text-center group-hover:text-blue-700 transition-colors">
                      {meeting}
                    </h3>
                    <div className="mt-4 text-center">
                      <span className="text-sm text-blue-600 group-hover:text-blue-700 font-medium">
                        質問カードを見る →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // 議員カード一覧表示（meetingParamまたはcategoryParamがある場合）
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={categoryParam || keywordParam ? "/" : "/cards"}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {categoryParam || keywordParam ? 'トップページに戻る' : '議会一覧に戻る'}
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {categoryParam ? `${categoryParam}` : keywordParam ? `「${keywordParam}」の検索結果` : meetingParam}
          </h1>
          <p className="mt-2 text-gray-600">
            {categoryParam ? '分野別の質問カード一覧' : keywordParam ? 'キーワードに関連する質問カード一覧' : 'この議会の質問カード一覧'}
          </p>
          {/* 可決トピックへのリンク（議会表示時のみ） */}
          {meetingParam && !categoryParam && !keywordParam && (
            <Link
              href={`/meetings/${encodeURIComponent(meetingParam)}/topics`}
              className="inline-flex items-center mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <span className="mr-2">📋</span>
              この議会の可決トピックを見る
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* フィルター */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 会期フィルター（カテゴリ・キーワード検索時のみ表示） */}
            {(categoryParam || keywordParam) && (
              <div>
                <label htmlFor="meeting-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  会期で絞り込み
                </label>
                <select
                  id="meeting-filter"
                  value={meetingParam || ''}
                  onChange={(e) => {
                    const params = new URLSearchParams();
                    if (categoryParam) params.append('category', categoryParam);
                    if (keywordParam) params.append('keyword', keywordParam);
                    if (e.target.value) params.append('meeting', e.target.value);
                    router.push(`/cards?${params.toString()}`);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">すべての会期</option>
                  {meetings.map((meeting) => (
                    <option key={meeting} value={meeting}>
                      {meeting}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="member-filter" className="block text-sm font-medium text-gray-700 mb-1">
                議員名で絞り込み
              </label>
              <input
                id="member-filter"
                type="text"
                placeholder="例: 音堅良一"
                value={memberFilter}
                onChange={(e) => {
                  setMemberFilter(e.target.value);
                  setOffset(0); // フィルター変更時は最初のページに戻る
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <form onSubmit={handleSearch}>
              <label htmlFor="keyword-search" className="block text-sm font-medium text-gray-700 mb-1">
                {categoryParam || meetingParam ? 'この分野内でキーワード検索' : 'キーワードで検索'}
              </label>
              <div className="flex gap-2">
                <input
                  id="keyword-search"
                  type="text"
                  placeholder="例: 教育、防災、高齢者"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                >
                  検索
                </button>
              </div>
            </form>
          </div>

          {/* 検索結果数 */}
          <div className="mt-4 text-sm text-gray-600">
            {total > 0 ? `${total}件の質問カードが見つかりました` : '質問カードが見つかりませんでした'}
          </div>
        </div>

        {/* カード一覧 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            エラー: {error}
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-8 text-center text-gray-600">
            公開されている質問カードがありません
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {cards.map((card) => (
                <Link
                  key={card.id}
                  href={`/cards/${card.id}`}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-blue-400 group"
                >
                  {/* ヘッダー部分 */}
                  <div className={`bg-gradient-to-r ${getFactionColor(card.faction)} p-5 text-white`}>
                    <h3 className="text-xl font-bold mb-2 transition-colors">
                      {card.member_name}
                    </h3>
                    <div className="flex items-center justify-between">
                      {card.meeting_title && (
                        <p className="text-sm opacity-90">
                          {card.meeting_title}
                        </p>
                      )}
                      {card.faction && (
                        <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full text-gray-800 font-semibold">
                          {card.faction}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* コンテンツ部分 */}
                  <div className="p-6">
                    {/* 主な質問テーマ */}
                    {card.themes && Array.isArray(card.themes) && card.themes.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">主な質問テーマ</h4>
                        {(() => {
                          // カテゴリフィルターがある場合は該当テーマのみ表示
                          const filteredThemes = categoryParam
                            ? card.themes.filter((theme: any) => {
                                const themeTags = theme.tags || [];
                                const fieldTag = theme.field_tag || '';
                                // タグ配列またはfield_tagにカテゴリが含まれるか
                                return themeTags.some((t: string) => t.includes(categoryParam)) ||
                                       fieldTag.includes(categoryParam);
                              })
                            : card.themes;

                          const displayThemes = filteredThemes.length > 0 ? filteredThemes : card.themes;

                          return (
                            <>
                              {displayThemes.slice(0, 3).map((theme: any, idx: number) => (
                                <div key={idx} className="border-l-4 border-blue-500 pl-3 py-1">
                                  <p className="text-base font-medium text-gray-900 leading-relaxed">
                                    {typeof theme === 'string' ? theme : (theme.question_point || theme.theme_title || 'テーマ未設定')}
                                  </p>
                                </div>
                              ))}
                              {displayThemes.length > 3 && (
                                <p className="text-sm text-gray-500 pl-3">
                                  他 {displayThemes.length - 3} テーマ
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : card.question_text && card.question_text.trim() ? (
                      /* themesがない場合は質問テキストを表示 */
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">質問内容</h4>
                        <p className="text-sm text-gray-700 line-clamp-4">
                          {truncateText(card.question_text, 200)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">質問内容が登録されていません</p>
                    )}

                    {/* トピックタグ */}
                    {card.topics && card.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {card.topics.slice(0, 3).map((topic, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* フッター */}
                  <div className="px-6 pb-5 flex items-center justify-end text-xs">
                    <span className="text-blue-600 group-hover:text-blue-700 font-medium">
                      詳細を見る →
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* ページネーション */}
            {total > limit && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  前へ
                </button>

                <span className="text-sm text-gray-600">
                  {offset + 1} - {Math.min(offset + limit, total)} / {total}
                </span>

                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function CardsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <CardsPageContent />
    </Suspense>
  );
}
