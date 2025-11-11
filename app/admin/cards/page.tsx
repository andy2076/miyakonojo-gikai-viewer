'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { QuestionCardRecord } from '@/types/database';

interface CardsResponse {
  cards: QuestionCardRecord[];
  total: number;
  limit: number;
  offset: number;
}

export default function AdminCardsPage() {
  const [cards, setCards] = useState<QuestionCardRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フィルター
  const [publishedFilter, setPublishedFilter] = useState<string>(''); // '', 'true', 'false'
  const [memberFilter, setMemberFilter] = useState('');
  const [meetingFilter, setMeetingFilter] = useState('');

  // 会議名一覧
  const [meetings, setMeetings] = useState<string[]>([]);

  // ページネーション
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // 選択状態
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 会議名一覧を取得
  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/admin/card-meetings');
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    }
  };

  // カードを取得
  const fetchCards = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (publishedFilter) params.append('published', publishedFilter);
      if (memberFilter) params.append('member', memberFilter);
      if (meetingFilter) params.append('meeting', meetingFilter);

      const res = await fetch(`/api/admin/cards?${params.toString()}`);

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
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    fetchCards();
  }, [offset, publishedFilter, memberFilter, meetingFilter]);

  // 公開/非公開を切り替え
  const togglePublished = async (cardId: string, currentPublished: boolean) => {
    try {
      const res = await fetch(`/api/admin/cards/${cardId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentPublished }),
      });

      if (!res.ok) {
        throw new Error('公開状態の更新に失敗しました');
      }

      // 成功したらリストを再取得
      await fetchCards();
    } catch (err) {
      console.error('Failed to toggle published:', err);
      alert(err instanceof Error ? err.message : '更新に失敗しました');
    }
  };

  // カードを削除
  const deleteCard = async (cardId: string, memberName: string) => {
    if (!confirm(`「${memberName}」のカードを削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/cards/${cardId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('カードの削除に失敗しました');
      }

      alert('カードを削除しました');
      // 成功したらリストを再取得
      await fetchCards();
      // 選択状態をクリア
      setSelectedCards(new Set());
    } catch (err) {
      console.error('Failed to delete card:', err);
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  // 一括削除
  const bulkDelete = async () => {
    if (selectedCards.size === 0) {
      alert('削除するカードを選択してください');
      return;
    }

    if (!confirm(`${selectedCards.size}件のカードを削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch('/api/admin/cards/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: Array.from(selectedCards) }),
      });

      if (!res.ok) {
        throw new Error('一括削除に失敗しました');
      }

      const data = await res.json();
      alert(`${data.deleted}件のカードを削除しました`);
      // 成功したらリストを再取得
      await fetchCards();
      // 選択状態をクリア
      setSelectedCards(new Set());
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      alert(err instanceof Error ? err.message : '一括削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  // 一括公開/非公開
  const bulkPublish = async (published: boolean) => {
    if (selectedCards.size === 0) {
      alert('カードを選択してください');
      return;
    }

    const action = published ? '公開' : '非公開';
    if (!confirm(`${selectedCards.size}件のカードを${action}にしますか？`)) {
      return;
    }

    try {
      setPublishing(true);
      const res = await fetch('/api/admin/cards/bulk-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: Array.from(selectedCards), published }),
      });

      if (!res.ok) {
        throw new Error(`一括${action}に失敗しました`);
      }

      const data = await res.json();
      alert(`${data.updated}件のカードを${action}にしました`);
      // 成功したらリストを再取得
      await fetchCards();
      // 選択状態をクリア
      setSelectedCards(new Set());
    } catch (err) {
      console.error('Failed to bulk publish:', err);
      alert(err instanceof Error ? err.message : `一括${action}に失敗しました`);
    } finally {
      setPublishing(false);
    }
  };

  // チェックボックスの処理
  const toggleSelectCard = (cardId: string) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedCards.size === cards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(cards.map(c => c.id)));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          ダッシュボードに戻る
        </Link>
        <h1 className="text-2xl font-bold">質問カード管理</h1>
      </div>

      {/* フィルター */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="published-filter" className="block text-sm font-medium text-gray-700 mb-1">
              公開状態
            </label>
            <select
              id="published-filter"
              value={publishedFilter}
              onChange={(e) => {
                setPublishedFilter(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべて</option>
              <option value="true">公開</option>
              <option value="false">非公開</option>
            </select>
          </div>

          <div>
            <label htmlFor="meeting-filter" className="block text-sm font-medium text-gray-700 mb-1">
              会議名
            </label>
            <select
              id="meeting-filter"
              value={meetingFilter}
              onChange={(e) => {
                setMeetingFilter(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべて</option>
              {meetings.map((meeting) => (
                <option key={meeting} value={meeting}>
                  {meeting}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="member-filter" className="block text-sm font-medium text-gray-700 mb-1">
              議員名
            </label>
            <input
              id="member-filter"
              type="text"
              placeholder="例: 音堅良一"
              value={memberFilter}
              onChange={(e) => {
                setMemberFilter(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              合計: {total}件
            </div>
          </div>
        </div>
      </div>

      {/* 一括操作バー */}
      {selectedCards.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="text-sm font-medium text-blue-900">
            {selectedCards.size}件選択中
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => bulkPublish(true)}
              disabled={publishing || deleting}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {publishing ? '処理中...' : '一括公開'}
            </button>
            <button
              onClick={() => bulkPublish(false)}
              disabled={publishing || deleting}
              className="px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              {publishing ? '処理中...' : '一括非公開'}
            </button>
            <button
              onClick={bulkDelete}
              disabled={deleting || publishing}
              className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deleting ? '削除中...' : '選択したカードを削除'}
            </button>
          </div>
        </div>
      )}

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
          質問カードがありません
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCards.size === cards.length && cards.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    議員名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    質問タイトル
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    会議名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    公開状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCards.has(card.id)}
                        onChange={() => toggleSelectCard(card.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {card.member_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="max-w-md">
                        <div className="font-medium text-gray-900">
                          {card.question_summary || card.theme_title || '-'}
                        </div>
                        {card.theme_title && card.question_summary && (
                          <div className="text-xs text-gray-500 mt-1">
                            {card.theme_title}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {card.meeting_title || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          card.published
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {card.published ? '公開' : '非公開'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/cards/${card.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded-md text-indigo-600 hover:text-indigo-800 border border-indigo-600 hover:border-indigo-800 transition-colors inline-flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          詳細
                        </Link>
                        <button
                          onClick={() => togglePublished(card.id, card.published)}
                          className={`px-3 py-1 rounded-md text-white transition-colors ${
                            card.published
                              ? 'bg-gray-600 hover:bg-gray-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {card.published ? '非公開にする' : '公開する'}
                        </button>
                        <button
                          onClick={() => deleteCard(card.id, card.member_name)}
                          disabled={deleting}
                          className="px-3 py-1 rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {total > limit && (
            <div className="mt-6 flex items-center justify-center gap-4">
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
    </div>
  );
}
