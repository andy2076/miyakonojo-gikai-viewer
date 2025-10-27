'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function GPTImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [meetingName, setMeetingName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    created?: number;
    updated?: number;
    skipped?: number;
    errors?: string[];
    message?: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null); // 前回の結果をクリア
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('CSVファイルを選択してください');
      return;
    }

    if (!meetingName.trim()) {
      alert('会議名を入力してください（例：令和4年第3回定例会）');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('meetingName', meetingName.trim());

      const response = await fetch('/api/admin/import-gpt-analysis', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'アップロードに失敗しました');
      }

      setResult(data);
      setFile(null);
      // ファイル入力をリセット
      const fileInput = document.getElementById('csv-file') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            ダッシュボードに戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">AI分析データのインポート</h1>
          <p className="mt-2 text-gray-600">
            別AIで生成した分析CSVをアップロードして、カードに分析データを追加します
          </p>
        </div>

        {/* CSVフォーマット説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-blue-900 mb-3">📋 CSVフォーマット（1行 = 1テーマ）</h2>
          <p className="text-sm text-blue-800 mb-3">以下のカラムが必要です：</p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>議員名</strong></li>
            <li><strong>会派</strong></li>
            <li><strong>テーマ番号</strong> ← 重要！このカラムがないと旧フォーマットと判定されます</li>
            <li><strong>テーマタイトル</strong></li>
            <li><strong>質問のポイント</strong></li>
            <li><strong>回答のポイント</strong></li>
            <li>議論のポイント（なぜ重要か）</li>
            <li>影響を受ける人</li>
            <li>分野タグ（セミコロンまたはカンマ区切り）</li>
            <li>性質タグ（セミコロンまたはカンマ区切り）</li>
          </ul>
          <p className="text-xs text-blue-700 mt-3">
            ※ 同じ議員が複数のテーマで質問している場合、各テーマを別々の行として記載してください
          </p>
        </div>

        {/* アップロードフォーム */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">CSVファイルをアップロード</h2>

          <div className="mb-4">
            <label
              htmlFor="meeting-name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              会議名 <span className="text-red-500">*</span>
            </label>
            <input
              id="meeting-name"
              type="text"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              placeholder="例：令和4年第3回定例会"
              className="block w-full px-4 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              disabled={uploading}
            />
            <p className="mt-1 text-xs text-gray-500">
              この会議名で同じ議員のテーマがまとめられます
            </p>
          </div>

          <div className="mb-4">
            <label
              htmlFor="csv-file"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              CSVファイル <span className="text-red-500">*</span>
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
              disabled={uploading}
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                選択中: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || !meetingName.trim() || uploading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'アップロード中...' : 'アップロード'}
          </button>
        </div>

        {/* 結果表示 */}
        {result && (
          <div
            className={`rounded-lg p-6 mb-6 ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <h2
              className={`text-xl font-bold mb-3 ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}
            >
              {result.success ? '✅ インポート完了' : '❌ エラー'}
            </h2>

            {result.message && (
              <p
                className={`text-sm mb-3 ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {result.message}
              </p>
            )}

            {result.success && (
              <div className="text-sm text-green-800 space-y-1">
                <p>✅ 更新: {result.updated}件</p>
                <p>⏭️ スキップ: {result.skipped}件</p>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-bold text-red-900 mb-2">
                  エラー詳細 ({result.errors.length}件):
                </p>
                <div className="max-h-60 overflow-y-auto bg-white rounded border border-red-300 p-3">
                  <ul className="text-xs text-red-800 space-y-1">
                    {result.errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 注意事項 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-yellow-900 mb-3">⚠️ 注意事項</h2>
          <ul className="text-sm text-yellow-800 space-y-2 list-disc list-inside">
            <li>CSV の各行から1つずつカードが新規作成されます</li>
            <li>同じ議員でも、テーマごとに別々のカードが作成されます</li>
            <li>議員名は自動的に「○○○議員」の形式に変換されます（スペースは削除されます）</li>
            <li>インポート前に不要なカードを削除することをお勧めします</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
