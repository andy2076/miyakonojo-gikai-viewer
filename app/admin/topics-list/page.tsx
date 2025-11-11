'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MeetingTopic {
  id: string;
  meeting_title: string;
  title: string;
  date: string | null;
  description: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  display_order: number;
}

export default function TopicsListPage() {
  const [topics, setTopics] = useState<MeetingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/topics-list');

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.details || errorData.error || 'トピック一覧の取得に失敗しました');
      }

      const data = await response.json();
      console.log('✅ フロント: トピックデータ取得成功', data);
      setTopics(data.topics || []);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  };

  const togglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/topics-list/${id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('公開状態の変更に失敗しました');
      }

      // 一覧を再取得
      await fetchTopics();
    } catch (err) {
      console.error('Failed to toggle published:', err);
      alert(err instanceof Error ? err.message : '公開状態の変更に失敗しました');
    }
  };

  const deleteTopic = async (id: string, meetingTitle: string) => {
    if (!confirm(`「${meetingTitle}」のトピックを削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/topics-list/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('トピックの削除に失敗しました');
      }

      // 一覧を再取得
      await fetchTopics();
      alert('トピックを削除しました');
    } catch (err) {
      console.error('Failed to delete topic:', err);
      alert(err instanceof Error ? err.message : 'トピックの削除に失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">トピック一覧</h1>
              <p className="text-sm text-gray-600 mt-1">
                登録されている可決トピックの管理
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin/topics"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                トピックアップロード
              </Link>
              <Link
                href="/admin/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                ダッシュボード
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            エラー: {error}
          </div>
        ) : topics.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <p className="text-yellow-800 mb-4">トピックが登録されていません</p>
            <Link
              href="/admin/topics"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              トピックをアップロード
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      会議名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      タイトル
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      開催日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      公開状態
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      表示順
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topics.map((topic) => (
                    <tr key={topic.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {topic.meeting_title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md truncate">
                          {topic.title}
                        </div>
                        {topic.description && (
                          <div className="text-xs text-gray-500 mt-1 max-w-md truncate">
                            {topic.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {topic.date || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            topic.published
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {topic.published ? '公開' : '非公開'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {topic.display_order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => togglePublished(topic.id, topic.published)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              topic.published
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {topic.published ? '非公開にする' : '公開する'}
                          </button>
                          <a
                            href={`/meetings/${encodeURIComponent(topic.meeting_title)}/topics`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-colors"
                          >
                            表示
                          </a>
                          <button
                            onClick={() => deleteTopic(topic.id, topic.meeting_title)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 統計情報 */}
        {topics.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">総トピック数</div>
              <div className="text-2xl font-bold text-gray-900">{topics.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">公開中</div>
              <div className="text-2xl font-bold text-green-600">
                {topics.filter((t) => t.published).length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">非公開</div>
              <div className="text-2xl font-bold text-gray-600">
                {topics.filter((t) => !t.published).length}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
