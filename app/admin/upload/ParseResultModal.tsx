'use client';

import { useState } from 'react';
import InfographicVisualization from './InfographicVisualization';
import { SessionAnalysis, OverallAnalysis } from '@/lib/content-analyzer';

interface ParseResultModalProps {
  result: {
    file_id: string;
    file_name: string;
    extractedText: string;
    statements: Array<{
      speaker: string;
      text: string;
      type: 'question' | 'answer' | 'other';
    }>;
    councilMembers: string[];
    questionCounts: Record<string, number>;
    stats: {
      totalStatements: number;
      totalQuestions: number;
      totalAnswers: number;
      councilMembers: number;
      totalSessions?: number;
      sessionQuestions?: number;
      sessionAnswers?: number;
    };
    sessions?: Array<{
      councilMember: string;
      statements: Array<{
        speaker: string;
        text: string;
        type: 'question' | 'answer' | 'other';
      }>;
      startText: string;
      endText: string;
    }>;
    sessionSummaries?: Array<{
      councilMember: string;
      questionCount: number;
      answerCount: number;
      answerers: string[];
      preview: string;
    }>;
    answererCounts?: Record<string, number>;
    sessionAnalyses?: SessionAnalysis[];
    overallAnalysis?: OverallAnalysis;
  };
  onClose: () => void;
}

export default function ParseResultModal({ result, onClose }: ParseResultModalProps) {
  const [activeTab, setActiveTab] = useState<'infographic' | 'details' | 'raw'>(
    result.sessionAnalyses && result.overallAnalysis ? 'infographic' : 'details'
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">解析結果</h2>
              <p className="text-sm text-blue-100 mt-1">{result.file_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* タブ */}
          <div className="flex gap-2">
            {result.sessionAnalyses && result.overallAnalysis && (
              <button
                onClick={() => setActiveTab('infographic')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'infographic'
                    ? 'bg-white text-blue-600'
                    : 'bg-blue-700/50 text-white hover:bg-blue-700'
                }`}
              >
                インフォグラフィック
              </button>
            )}
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'details'
                  ? 'bg-white text-blue-600'
                  : 'bg-blue-700/50 text-white hover:bg-blue-700'
              }`}
            >
              詳細データ
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'raw'
                  ? 'bg-white text-blue-600'
                  : 'bg-blue-700/50 text-white hover:bg-blue-700'
              }`}
            >
              抽出テキスト
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {/* インフォグラフィックタブ */}
          {activeTab === 'infographic' && result.sessionAnalyses && result.overallAnalysis && (
            <InfographicVisualization
              sessionAnalyses={result.sessionAnalyses}
              overallAnalysis={result.overallAnalysis}
            />
          )}

          {/* 詳細データタブ */}
          {activeTab === 'details' && (
            <>
              {/* 統計情報 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {result.stats.totalSessions !== undefined ? (
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-indigo-600">
                  {result.stats.totalSessions}
                </div>
                <div className="text-sm text-gray-600">質疑応答セッション</div>
              </div>
            ) : (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {result.stats.totalStatements}
                </div>
                <div className="text-sm text-gray-600">総発言数</div>
              </div>
            )}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {result.stats.sessionQuestions || result.stats.totalQuestions}
              </div>
              <div className="text-sm text-gray-600">質問数</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {result.stats.sessionAnswers || result.stats.totalAnswers}
              </div>
              <div className="text-sm text-gray-600">答弁数</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600">
                {result.stats.councilMembers}
              </div>
              <div className="text-sm text-gray-600">議員数</div>
            </div>
          </div>

          {/* 議員一覧と質問回数 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              議員別質問回数
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(result.questionCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([member, count]) => (
                    <div
                      key={member}
                      className="flex items-center justify-between bg-white rounded-lg px-4 py-2 shadow-sm"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {member}
                      </span>
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {count}回
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* セッション一覧（新しい解析結果がある場合） */}
          {result.sessionSummaries && result.sessionSummaries.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                質疑応答セッション（全{result.stats.totalSessions}件）
              </h3>
              <div className="space-y-3">
                {result.sessionSummaries.map((summary, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-gray-900 text-lg">
                        {summary.councilMember}
                      </div>
                      <div className="flex gap-2">
                        <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          質問 {summary.questionCount}
                        </span>
                        <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          答弁 {summary.answerCount}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">答弁者:</span>{' '}
                      {summary.answerers.length > 0
                        ? summary.answerers.join('、')
                        : 'なし'}
                    </div>
                    <div className="text-sm text-gray-700 line-clamp-2">
                      {summary.preview}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 発言プレビュー */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              発言プレビュー（最初の10件）
            </h3>
            <div className="space-y-3">
              {result.statements.slice(0, 10).map((statement, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-4 ${
                    statement.type === 'question'
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : statement.type === 'answer'
                      ? 'bg-green-50 border-l-4 border-green-500'
                      : 'bg-gray-50 border-l-4 border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        statement.type === 'question'
                          ? 'bg-blue-100 text-blue-800'
                          : statement.type === 'answer'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {statement.type === 'question'
                        ? '質問'
                        : statement.type === 'answer'
                        ? '答弁'
                        : 'その他'}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {statement.speaker}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {statement.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

              </>
            )}

          {/* 抽出テキストタブ */}
          {activeTab === 'raw' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                抽出テキスト（最初の1000文字）
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                  {result.extractedText}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
