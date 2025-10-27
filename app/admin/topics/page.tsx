'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TopicsUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.md')) {
        setFile(selectedFile);
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: 'MDファイルのみアップロード可能です' });
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      // ファイルを読み込む
      const content = await file.text();

      // MDファイルの内容をパースしてデータを抽出
      const parsedData = parseMDFile(content);

      // APIに送信
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'アップロードに失敗しました');
      }

      const result = await response.json();
      setMessage({
        type: 'success',
        text: result.updated ? '可決トピックを更新しました' : '可決トピックを作成しました',
      });
      setFile(null);

      // フォームをリセット
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Upload error:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'アップロード中にエラーが発生しました',
      });
    } finally {
      setUploading(false);
    }
  };

  // MDファイルをパースする関数
  const parseMDFile = (content: string) => {
    const lines = content.split('\n');
    let meeting_title = '';
    let title = '';
    let date: string | null = null;
    let description = '';
    const topics: any[] = [];
    const summary: string[] = [];
    let supplementary_budget: any = null;
    let total_budget_after: number | null = null;

    let currentSection: 'header' | 'topics' | 'summary' | 'budget' = 'header';
    let currentTopic: any = null;
    let currentItem: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // タイトル（H1）
      if (line.startsWith('# ')) {
        title = line.substring(2).trim();
        // タイトルから会議名を抽出
        const match = title.match(/【(.+?)】/);
        if (match) {
          meeting_title = match[1];
        }
      }
      // 日付
      else if (line.startsWith('**開催日**:')) {
        date = line.split(':')[1]?.trim() || null;
      }
      // 説明
      else if (line.startsWith('**説明**:')) {
        description = line.split(':')[1]?.trim() || '';
      }
      // トピック（H2）
      else if (line.startsWith('## ')) {
        if (currentTopic) {
          if (currentItem) {
            currentTopic.items.push(currentItem);
            currentItem = null;
          }
          topics.push(currentTopic);
        }

        const topicText = line.substring(3).trim();
        const topicMatch = topicText.match(/【(.+?)】(.+)/);

        currentTopic = {
          title: topicMatch ? topicMatch[1] : topicText,
          description: '',
          items: [],
        };

        if (topicMatch && topicMatch[2]) {
          currentTopic.description = topicMatch[2].trim();
        }
        currentSection = 'topics';
      }
      // サブタイトル（H3）
      else if (line.startsWith('### ')) {
        if (currentItem && currentTopic) {
          currentTopic.items.push(currentItem);
        }
        currentItem = {
          subtitle: line.substring(4).trim(),
          content: '',
        };
      }
      // 箇条書き
      else if (line.startsWith('- ') && currentItem) {
        const text = line.substring(2).trim();
        if (text.startsWith('**予算**:')) {
          currentItem.budget = text.split(':')[1]?.trim();
        } else if (text.startsWith('**結果**:')) {
          currentItem.result = text.split(':')[1]?.trim();
        } else {
          currentItem.content += (currentItem.content ? '\n' : '') + text;
        }
      }
      // まとめセクション
      else if (line.startsWith('## まとめ')) {
        if (currentTopic) {
          if (currentItem) {
            currentTopic.items.push(currentItem);
            currentItem = null;
          }
          topics.push(currentTopic);
          currentTopic = null;
        }
        currentSection = 'summary';
      }
      // まとめの箇条書き
      else if (currentSection === 'summary' && line.startsWith('- ')) {
        summary.push(line.substring(2).trim());
      }
    }

    // 最後のトピックを追加
    if (currentTopic) {
      if (currentItem) {
        currentTopic.items.push(currentItem);
      }
      topics.push(currentTopic);
    }

    return {
      meeting_title,
      title,
      date,
      description,
      content_data: { topics },
      summary: summary.length > 0 ? summary : null,
      supplementary_budget,
      total_budget_after,
      published: true,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">可決トピック管理</h1>
              <p className="text-sm text-gray-600 mt-1">
                議会審議内容まとめのアップロード
              </p>
            </div>
            <div className="flex items-center gap-4">
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">MDファイルアップロード</h2>

          {/* 使い方の説明 */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">使い方</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>議会審議内容をまとめたMDファイルをアップロードしてください</li>
              <li>ファイル名は任意ですが、「会議名.md」の形式を推奨します</li>
              <li>同じ会議名のトピックが存在する場合は上書きされます</li>
            </ul>
          </div>

          {/* ファイル選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              MDファイルを選択
            </label>
            <input
              id="file-input"
              type="file"
              accept=".md"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
          </div>

          {/* 選択されたファイル名 */}
          {file && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">選択されたファイル:</span> {file.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                サイズ: {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}

          {/* メッセージ */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* アップロードボタン */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                !file || uploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
              }`}
            >
              {uploading ? 'アップロード中...' : 'アップロード'}
            </button>

            {file && !uploading && (
              <button
                onClick={() => {
                  setFile(null);
                  setMessage(null);
                  const fileInput = document.getElementById('file-input') as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            )}
          </div>
        </div>

        {/* MDファイルフォーマット例 */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">MDファイルフォーマット例</h2>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm overflow-x-auto">
{`# 【令和4年第5回定例会】令和4年第5回定例会 審議内容まとめ

**開催日**: 令和4年12月16日
**説明**: 令和4年12月16日に開かれた都城市議会では...

## 【緊急支援】物価高・台風被害への対応

補正予算：約97億円

### 専決処分（緊急対応）の事後承認

- 市長が議会を待たずに緊急対応した案件
- **結果**: 全会一致で承認

### 一般会計補正予算（第9号）

- **予算**: 97億301万円追加
- 総務費（ふるさと納税の基金積立金など）
- 災害復旧費（台風14号による復旧工事費）

## まとめ

- 物価高騰と台風被害への迅速な対応が可決
- 市職員の給与改定と定年延長を決定`}
          </pre>
        </div>
      </main>
    </div>
  );
}
