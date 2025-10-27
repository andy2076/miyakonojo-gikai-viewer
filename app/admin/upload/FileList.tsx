'use client';

import { useEffect, useState } from 'react';
import { MinutesFile } from '@/types/database';
import ParseResultModal from './ParseResultModal';

/**
 * 処理状態のバッジ
 */
function StatusBadge({ processed }: { processed: boolean }) {
  const style = processed
    ? 'bg-green-100 text-green-800'
    : 'bg-yellow-100 text-yellow-800';
  const label = processed ? '処理済み' : '未処理';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}

/**
 * 公開状態のバッジ
 */
function PublishedBadge({ published }: { published: boolean }) {
  const style = published
    ? 'bg-blue-100 text-blue-800'
    : 'bg-gray-100 text-gray-800';
  const label = published ? '公開中' : '非公開';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}

/**
 * 解析結果の型
 */
interface ParseResult {
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
  };
}

/**
 * 日時フォーマット
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * ファイル一覧コンポーネント
 */
export default function FileList() {
  const [files, setFiles] = useState<MinutesFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsingFileId, setParsingFileId] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editMeetingDate, setEditMeetingDate] = useState<string>('');
  const [editMeetingTitle, setEditMeetingTitle] = useState<string>('');
  const [publishingFileId, setPublishingFileId] = useState<string | null>(null);

  /**
   * ファイル一覧を取得
   */
  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setParsingFileId(null); // 解析状態をリセット

      const response = await fetch('/api/admin/files');

      if (!response.ok) {
        throw new Error('ファイル一覧の取得に失敗しました');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ファイルを解析
   */
  const handleParse = async (fileId: string) => {
    try {
      setParsingFileId(fileId);
      setError(null);

      const response = await fetch('/api/admin/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_id: fileId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || '解析に失敗しました';
        const errorDetails = errorData.details ? `\n${errorData.details}` : '';
        throw new Error(errorMessage + errorDetails);
      }

      const result = await response.json();
      setParseResult(result.data);
      setShowModal(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '解析中にエラーが発生しました';
      setError(errorMessage);
      console.error('Parse error:', err);
    } finally {
      setParsingFileId(null);
    }
  };

  /**
   * 選択したファイルを一括解析
   */
  const handleBatchParse = async (fileIds: string[]) => {
    if (fileIds.length === 0) return;

    const confirmMessage = `選択した${fileIds.length}件のファイルを一括解析しますか？\n処理には時間がかかる場合があります。`;

    if (!confirm(confirmMessage)) return;

    try {
      setError(null);
      let successCount = 0;
      let failCount = 0;

      // 順次解析を実行
      for (let i = 0; i < fileIds.length; i++) {
        const fileId = fileIds[i];
        const file = files.find(f => f.id === fileId);

        try {
          setParsingFileId(fileId);
          console.log(`[${i + 1}/${fileIds.length}] 解析中: ${file?.file_name || fileId}`);

          const response = await fetch('/api/admin/parse', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file_id: fileId }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '解析に失敗しました');
          }

          successCount++;
          console.log(`✓ 解析成功: ${file?.file_name || fileId}`);
        } catch (err) {
          failCount++;
          console.error(`✗ 解析失敗: ${file?.file_name || fileId}`, err);
        }
      }

      // 完了メッセージ
      alert(`一括解析が完了しました。\n成功: ${successCount}件\n失敗: ${failCount}件`);

      // ファイルリストを再取得
      await fetchFiles();

      // 選択をクリア
      setSelectedFiles(new Set());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '一括解析中にエラーが発生しました';
      setError(errorMessage);
      console.error('Batch parse error:', err);
    } finally {
      setParsingFileId(null);
    }
  };

  /**
   * チェックボックスのトグル
   */
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  /**
   * 全選択のトグル
   */
  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
  };

  /**
   * ファイルを削除
   */
  const handleDelete = async (fileIds: string[]) => {
    if (fileIds.length === 0) return;

    const confirmMessage =
      fileIds.length === 1
        ? '選択したファイルを削除してもよろしいですか？'
        : `選択した${fileIds.length}件のファイルを削除してもよろしいですか？`;

    if (!confirm(confirmMessage)) return;

    try {
      setIsDeleting(true);
      setError(null);

      const response = await fetch('/api/admin/files/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_ids: fileIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }

      const result = await response.json();

      // 成功メッセージ
      alert(`${result.deleted_count}件のファイルを削除しました`);

      // 選択をクリア
      setSelectedFiles(new Set());

      // ファイル一覧を再取得
      await fetchFiles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '削除中にエラーが発生しました';
      setError(errorMessage);
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * 公開/非公開を切り替え
   */
  const handleTogglePublish = async (fileId: string, currentPublished: boolean) => {
    try {
      setPublishingFileId(fileId);
      setError(null);

      const response = await fetch(`/api/admin/files/${fileId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: !currentPublished }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '公開状態の更新に失敗しました');
      }

      // ファイル一覧を再取得
      await fetchFiles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '公開状態の更新中にエラーが発生しました';
      setError(errorMessage);
      console.error('Publish error:', err);
    } finally {
      setPublishingFileId(null);
    }
  };

  /**
   * 編集モード開始
   */
  const startEditing = (file: MinutesFile) => {
    setEditingFileId(file.id);
    setEditMeetingDate(file.meeting_date || '');
    setEditMeetingTitle(file.meeting_title || '');
  };

  /**
   * 編集キャンセル
   */
  const cancelEditing = () => {
    setEditingFileId(null);
    setEditMeetingDate('');
    setEditMeetingTitle('');
  };

  /**
   * 会議情報を保存
   */
  const saveEditMeetingInfo = async (fileId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/admin/files/${fileId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meeting_date: editMeetingDate || null,
          meeting_title: editMeetingTitle || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '会議情報の更新に失敗しました');
      }

      // 編集モード終了
      cancelEditing();

      // ファイル一覧を再取得
      await fetchFiles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '会議情報の更新中にエラーが発生しました';
      setError(errorMessage);
      console.error('Update error:', err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-4 text-sm text-gray-600">
          アップロードされたファイルはありません
        </p>
      </div>
    );
  }

  return (
    <>
      {/* 解析結果モーダル */}
      {showModal && parseResult && (
        <ParseResultModal
          result={parseResult}
          onClose={() => {
            setShowModal(false);
            setParseResult(null);
            fetchFiles(); // ファイル一覧を再取得してprocessed状態を更新
          }}
        />
      )}

      {/* デバッグ情報 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 bg-gray-100 border border-gray-300 px-4 py-2 rounded text-xs">
          <strong>Debug:</strong> parsingFileId = {parsingFileId || 'null'}
        </div>
      )}

      {/* エラーメッセージ */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}

      {/* 一括操作ボタン */}
      {selectedFiles.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg">
          <span className="text-sm text-blue-800">
            {selectedFiles.size}件のファイルを選択中
          </span>
          <div className="flex items-center gap-2">
            {/* 一括解析ボタン */}
            <button
              onClick={() => handleBatchParse(Array.from(selectedFiles))}
              disabled={parsingFileId !== null}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {parsingFileId !== null ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  解析中...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  選択したファイルを一括解析
                </>
              )}
            </button>

            {/* 一括削除ボタン */}
            <button
              onClick={() => handleDelete(Array.from(selectedFiles))}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  削除中...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  選択したファイルを削除
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={files.length > 0 && selectedFiles.size === files.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ファイル名
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              会議日
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              会議タイトル
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              処理状態
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
          {files.map((file) => (
            <tr key={file.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleFileSelection(file.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-gray-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">
                    {file.file_name}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {editingFileId === file.id ? (
                  <input
                    type="date"
                    value={editMeetingDate}
                    onChange={(e) => setEditMeetingDate(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                  />
                ) : (
                  file.meeting_date || '-'
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {editingFileId === file.id ? (
                  <input
                    type="text"
                    value={editMeetingTitle}
                    onChange={(e) => setEditMeetingTitle(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                    placeholder="会議タイトル"
                  />
                ) : (
                  <div className="max-w-xs truncate" title={file.meeting_title || ''}>
                    {file.meeting_title || '-'}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge processed={file.processed} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <PublishedBadge published={file.published} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 解析ボタン */}
                  <button
                    onClick={() => handleParse(file.id)}
                    disabled={parsingFileId === file.id}
                    className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1 text-xs"
                  >
                    {parsingFileId === file.id ? (
                      <>
                        <svg
                          className="animate-spin h-3 w-3"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        解析中
                      </>
                    ) : (
                      file.processed ? '再解析' : '解析'
                    )}
                  </button>

                  {/* 編集/保存/キャンセルボタン */}
                  {editingFileId === file.id ? (
                    <>
                      <button
                        onClick={() => saveEditMeetingInfo(file.id)}
                        className="text-green-600 hover:text-green-800 font-medium text-xs"
                      >
                        保存
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-gray-600 hover:text-gray-800 font-medium text-xs"
                      >
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEditing(file)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                      title="会議情報を編集"
                    >
                      編集
                    </button>
                  )}

                  {/* 公開/非公開ボタン */}
                  {file.processed && (
                    <button
                      onClick={() => handleTogglePublish(file.id, file.published)}
                      disabled={publishingFileId === file.id}
                      className={`${
                        file.published
                          ? 'text-orange-600 hover:text-orange-800'
                          : 'text-blue-600 hover:text-blue-800'
                      } font-medium disabled:opacity-50 disabled:cursor-not-allowed text-xs`}
                      title={file.published ? '非公開にする' : '公開する'}
                    >
                      {publishingFileId === file.id ? '...' : file.published ? '非公開化' : '公開'}
                    </button>
                  )}

                  {/* 削除ボタン */}
                  <button
                    onClick={() => handleDelete([file.id])}
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="削除"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
