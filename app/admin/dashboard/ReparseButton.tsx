'use client';

import { useState } from 'react';

export default function ReparseButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleReparse = async () => {
    if (!confirm(
      '全てのカードを削除して、全ファイルを再解析します。\n' +
      'この処理には時間がかかる場合があります。\n' +
      '本当に実行しますか？'
    )) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // 1. 全カードを削除
      setMessage('既存のカードを削除中...');
      const clearResponse = await fetch('/api/admin/cards/clear', {
        method: 'DELETE',
      });

      if (!clearResponse.ok) {
        const errorData = await clearResponse.json();
        throw new Error(errorData.error || 'カードの削除に失敗しました');
      }

      const clearData = await clearResponse.json();
      setMessage(`${clearData.deletedCount || 0}件のカードを削除しました。ファイルを再解析中...`);

      // 2. 全ファイルを再解析
      const reparseResponse = await fetch('/api/admin/reparse', {
        method: 'POST',
      });

      if (!reparseResponse.ok) {
        const errorData = await reparseResponse.json();
        throw new Error(errorData.error || '再解析に失敗しました');
      }

      const reparseData = await reparseResponse.json();
      setMessage(
        `再解析完了！\n` +
        `処理したファイル: ${reparseData.processedFiles}/${reparseData.totalFiles}\n` +
        `生成したカード: ${reparseData.generatedCards}件`
      );

      // ページをリロードして最新の状態を表示
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Reparse error:', error);
      setMessage(
        'エラー: ' + (error instanceof Error ? error.message : '不明なエラー')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleReparse}
        disabled={loading}
        className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
      >
        <svg
          className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {loading ? '再解析中...' : '全ファイルを再解析'}
      </button>

      {message && (
        <div className={`mt-4 p-4 rounded-lg ${
          message.includes('エラー')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          <pre className="whitespace-pre-wrap text-sm font-medium">{message}</pre>
        </div>
      )}
    </div>
  );
}
