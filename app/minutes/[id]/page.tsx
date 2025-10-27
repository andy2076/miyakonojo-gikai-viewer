'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import InfographicVisualization from '@/app/admin/upload/InfographicVisualization';
import { SessionAnalysis, OverallAnalysis } from '@/lib/content-analyzer';

interface MinuteDetail {
  id: string;
  fileName: string;
  meetingDate: string | null;
  meetingTitle: string | null;
  uploadedAt: string;
  sessionAnalyses: SessionAnalysis[];
  overallAnalysis: OverallAnalysis | null;
  stats: {
    totalSessions: number;
    sessionQuestions: number;
    sessionAnswers: number;
  } | null;
}

export default function MinuteDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [minute, setMinute] = useState<MinuteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchMinuteDetail();
    }
  }, [id]);

  const fetchMinuteDetail = async () => {
    try {
      const response = await fetch(`/api/minutes/${id}`);
      if (!response.ok) {
        throw new Error('議事録の取得に失敗しました');
      }
      const data = await response.json();
      setMinute(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '日付不明';
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* ヘッダー */}
      <header className="bg-white/70 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <span className="text-3xl">🏛️</span>
              都城市議会 議事録ビューアー
            </Link>
            <Link
              href="/admin/login"
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              管理者ログイン
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 戻るボタン */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
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
            一覧に戻る
          </Link>
        </div>

        {/* ローディング状態 */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">議事録を読み込んでいます...</p>
          </div>
        )}

        {/* エラー状態 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">エラー</h2>
            <p className="text-red-700">{error}</p>
            <Link
              href="/"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700 underline"
            >
              一覧に戻る
            </Link>
          </div>
        )}

        {/* 議事録詳細 */}
        {!loading && !error && minute && (
          <div>
            {/* タイトルセクション */}
            <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {minute.meetingTitle || minute.fileName}
              </h1>
              <p className="text-lg text-gray-600">
                {formatDate(minute.meetingDate || minute.uploadedAt)}
              </p>
            </div>

            {/* インフォグラフィック */}
            {minute.sessionAnalyses &&
              minute.sessionAnalyses.length > 0 &&
              minute.overallAnalysis && (
                <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
                  <InfographicVisualization
                    sessionAnalyses={minute.sessionAnalyses}
                    overallAnalysis={minute.overallAnalysis}
                  />
                </div>
              )}

            {/* 解析データがない場合 */}
            {(!minute.sessionAnalyses ||
              minute.sessionAnalyses.length === 0 ||
              !minute.overallAnalysis) && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                <p className="text-gray-600 text-lg">
                  この議事録の解析データはまだ準備されていません。
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-200 bg-white/50 backdrop-blur-sm py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-600">
            都城市議会可視化プロジェクト - オープンデータで実現する透明な議会
          </p>
        </div>
      </footer>
    </div>
  );
}
