'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QuestionCardRecord } from '@/types/database';

// トピックごとのアイコンと色
const topicStyles: Record<string, { emoji: string; color: string; bgColor: string }> = {
  '健康・福祉': { emoji: '❤️', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
  '教育': { emoji: '📚', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  '都市整備・インフラ': { emoji: '🏗️', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' },
  '経済・産業': { emoji: '💼', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  '環境': { emoji: '🌱', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  '防災・安全': { emoji: '🚨', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  '行政・財政': { emoji: '🏛️', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
};

const defaultTopicStyle = { emoji: '📋', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' };

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

export default function CardDetailPage() {
  const params = useParams();
  const cardId = params.id as string;

  const [card, setCard] = useState<QuestionCardRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullText, setShowFullText] = useState(false);
  const [showFullQuestion, setShowFullQuestion] = useState(false);
  const [showFullAnswers, setShowFullAnswers] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    const fetchCard = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/cards/${cardId}`);

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('カードが見つかりません');
          }
          throw new Error('カードの取得に失敗しました');
        }

        const data = await res.json();
        setCard(data.card);
      } catch (err) {
        console.error('Failed to fetch card:', err);
        setError(err instanceof Error ? err.message : '不明なエラー');
      } finally {
        setLoading(false);
      }
    };

    if (cardId) {
      fetchCard();
    }
  }, [cardId]);

  // カードが読み込まれたら閲覧数をインクリメント
  useEffect(() => {
    const incrementViewCount = async () => {
      try {
        await fetch(`/api/cards/${cardId}/view`, {
          method: 'POST',
        });
      } catch (err) {
        // 閲覧数の更新は失敗しても表示には影響させない
        console.error('Failed to increment view count:', err);
      }
    };

    if (card) {
      incrementViewCount();
    }
  }, [card, cardId]);

  useEffect(() => {
    console.log('🔍 Search keyword changed:', searchKeyword);
  }, [searchKeyword]);

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

  // 質問の要点を抽出（最初の2文または200文字）
  const getQuestionSummary = (text: string) => {
    const sentences = text.split(/[。！？]/);
    const firstTwoSentences = sentences.slice(0, 2).join('。') + '。';
    if (firstTwoSentences.length > 200) {
      return text.substring(0, 200) + '...';
    }
    return firstTwoSentences;
  };

  // 答弁の要点を抽出
  const getAnswerSummary = (texts: string[]) => {
    if (!texts || texts.length === 0) return '';
    const firstAnswer = texts[0];
    const sentences = firstAnswer.split(/[。！？]/);
    const firstSentence = sentences[0] + '。';
    if (firstSentence.length > 150) {
      return firstAnswer.substring(0, 150) + '...';
    }
    return firstSentence;
  };

  // テキスト内のキーワードをハイライトする関数
  const getHighlightedHTML = useCallback((text: string, keyword: string) => {
    if (!text) {
      console.log('🔍 No text provided');
      return '';
    }
    if (!keyword || !keyword.trim()) {
      console.log('🔍 No keyword provided');
      return text;
    }

    console.log('🔍 Highlighting:', { keyword, textLength: text.length, textPreview: text.substring(0, 50) });

    try {
      // 正規表現の特殊文字をエスケープ
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedKeyword})`, 'gi');

      // HTMLエスケープしてからハイライト
      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      const result = escapedText.replace(regex, '<mark style="background-color: #fde047; color: #111827; font-weight: 600; padding: 0 4px; border-radius: 3px;">$1</mark>');
      const hasMatches = result.includes('<mark');
      console.log('🔍 Highlight result:', { hasMatches, resultLength: result.length });

      return result;
    } catch (e) {
      console.error('Highlight error:', e);
      return text;
    }
  }, []);

  // メイントピックのスタイルを取得
  const getMainTopicStyle = () => {
    if (!card?.topics || card.topics.length === 0) return defaultTopicStyle;
    return topicStyles[card.topics[0]] || defaultTopicStyle;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-red-700">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-3">エラー</h2>
            <p className="mb-6">{error || 'カードが見つかりません'}</p>
            <Link
              href="/cards"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const mainTopicStyle = getMainTopicStyle();
  // DBから取得した要約を使用、なければフロントエンドで生成
  const questionSummary = card.question_summary || (card.question_text ? getQuestionSummary(card.question_text) : '');
  const answerSummary = card.answer_summary || getAnswerSummary(card.answer_texts || []);

  // 構造化された答弁要約をパース（新形式はJSON、旧形式はプレーンテキスト）
  let structuredAnswerSummary: { issues: string; future: string } | null = null;
  try {
    structuredAnswerSummary = JSON.parse(answerSummary);
  } catch (e) {
    // 旧形式（プレーンテキスト）の場合はnullのまま
  }

  const isQuestionLong = (card.question_text || '').length > 300;
  const areAnswersLong = (card.answer_texts || []).some(a => a.length > 300);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-3">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              トップ
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/cards"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              カード一覧
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="text-4xl">{mainTopicStyle.emoji}</div>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {card.member_name}の質問
                  {card.faction && (
                    <span className="ml-3 text-lg font-semibold text-purple-600">
                      ({card.faction})
                    </span>
                  )}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  {card.meeting_title && (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {card.meeting_title}
                    </span>
                  )}
                  {card.meeting_date && <span>{formatDate(card.meeting_date)}</span>}
                </div>
              </div>
            </div>

            {/* カード内キーワード検索 */}
            <div className="max-w-md">
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-200">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="カード内を検索..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-900 placeholder-gray-400"
                />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                該当箇所がハイライトされます
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* トピックとキーワードのサマリー（トピック、答弁者、キーワードのいずれかがある場合のみ表示） */}
        {((card.topics && card.topics.length > 0) || (card.answerers && card.answerers.length > 0) || (card.keywords && Array.isArray(card.keywords) && card.keywords.length > 0)) && (
          <div className={`rounded-2xl border-2 p-6 mb-8 ${mainTopicStyle.bgColor}`}>
            <div className="flex items-center justify-between mb-4">
              {/* トピック */}
              {card.topics && card.topics.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">カテゴリー</h3>
                  <div className="flex flex-wrap gap-2">
                    {card.topics.map((topic, idx) => {
                      const style = topicStyles[topic] || defaultTopicStyle;
                      return (
                        <span
                          key={idx}
                          className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-full ${style.color} bg-white shadow-sm`}
                        >
                          <span className="mr-2">{style.emoji}</span>
                          {topic}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 答弁者数 */}
              {card.answerers && card.answerers.length > 0 && (
                <div className="text-center bg-white rounded-xl px-6 py-4 shadow-sm">
                  <div className={`text-4xl font-bold ${mainTopicStyle.color}`}>
                    {card.answerers.length}
                  </div>
                  <div className="text-xs font-medium text-gray-600 mt-1">名が答弁</div>
                </div>
              )}
            </div>

            {/* キーワード */}
            {card.keywords && Array.isArray(card.keywords) && card.keywords.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">キーワード</h3>
                <div className="flex flex-wrap gap-2">
                  {card.keywords.slice(0, 8).map((kw: any, idx: number) => (
                    <span
                      key={idx}
                      className="inline-block px-3 py-1 text-sm bg-white/70 text-gray-800 rounded-full shadow-sm font-medium"
                    >
                      {kw.keyword} <span className="text-gray-500 text-xs">×{kw.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Q&A形式の要約セクション - GPT風（question_textまたはanswer_textsがある場合のみ表示） */}
        {((card.question_text && card.question_text.trim()) || (card.answer_texts && card.answer_texts.length > 0)) && (
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-blue-100">
              {/* テーマヘッダー */}
              {card.topics && card.topics.length > 0 && (
                <div className="mb-6 pb-4 border-b-2 border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <span className="text-3xl mr-3">{mainTopicStyle.emoji}</span>
                    【{card.topics[0]}】
                  </h2>
                </div>
              )}

              {/* 質問要約（question_textが空でない場合のみ表示） */}
              {(() => {
                console.log('🔍 Question text check:', {
                  hasQuestionText: !!card.question_text,
                  questionTextLength: card.question_text?.length || 0,
                  questionSummary: questionSummary.substring(0, 50)
                });
                return card.question_text && card.question_text.trim();
              })() && (
                <div className="mb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getFactionColor(card.faction)} flex items-center justify-center text-white text-lg font-bold shadow-md`}>
                        {card.member_name.charAt(0)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-blue-50 rounded-xl p-5 border-l-4 border-blue-600">
                        <div className="text-sm font-bold text-blue-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {card.member_name}議員の質問
                        </div>
                        <div
                          className="text-gray-900 font-medium leading-relaxed whitespace-pre-line text-base"
                          dangerouslySetInnerHTML={{ __html: getHighlightedHTML(questionSummary, searchKeyword) }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 答弁要約 */}
              {card.answer_texts && card.answer_texts.length > 0 && structuredAnswerSummary && structuredAnswerSummary.issues && (
                <div className="mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
                        {card.answerers && card.answerers[0] ? card.answerers[0].charAt(0) : '答'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-green-50 rounded-xl p-5 border-l-4 border-green-600">
                        <div className="text-sm font-bold text-green-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {card.answerers && card.answerers.length > 0 ? card.answerers.join('、') : '答弁者'}の答弁
                        </div>
                        <div
                          className="text-gray-900 font-medium leading-relaxed text-base"
                          dangerouslySetInnerHTML={{ __html: getHighlightedHTML(structuredAnswerSummary.issues, searchKeyword) }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 全文を読むボタン */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowFullText(!showFullText)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showFullText ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                  </svg>
                  {showFullText ? '全文を閉じる' : '質問と答弁の全文を読む'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GPT分析データ */}
        {(card.themes && card.themes.length > 0) || card.theme_title || card.gpt_question_point1 || card.gpt_answer_point1 || card.gpt_question_point2 || card.gpt_answer_point2 || card.gpt_question_point3 || card.gpt_answer_point3 || card.gpt_discussion_point || card.gpt_affected_people || (card.gpt_field_tags && card.gpt_field_tags.length > 0) || (card.gpt_nature_tags && card.gpt_nature_tags.length > 0) ? (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-md p-6 mb-8 border-2 border-purple-200">

            {/* 新形式：テーマ配列 */}
            {card.themes && card.themes.length > 0 && (() => {
              // テーマタイトルを解析する関数（大項目（小項目）形式）
              const parseThemeTitle = (title: string) => {
                const match = title.match(/^(.+?)（(.+?)）$/);
                if (match) {
                  return { major: match[1], minor: match[2] };
                }
                return { major: title, minor: null };
              };

              // 大項目でグループ化（theme_titleを優先）
              const groupedByMajor: Map<string, typeof card.themes> = new Map();
              card.themes.forEach((theme) => {
                const { major } = parseThemeTitle(theme.theme_title || '');
                if (!groupedByMajor.has(major)) {
                  groupedByMajor.set(major, []);
                }
                groupedByMajor.get(major)!.push(theme);
              });

              return (
              <div className="mb-4">
                <h3 className="text-lg font-bold text-purple-800 mb-3">質問テーマ</h3>
                <div className="space-y-6">
                  {Array.from(groupedByMajor.entries()).map(([majorTitle, themes], majorIdx) => (
                    <div key={majorIdx} className="space-y-4">
                      {/* 大項目セクション見出し */}
                      <h4 className="text-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 rounded-lg shadow-md">
                        {majorTitle || '（タイトルなし）'}
                      </h4>

                      {/* 質問項目（subtopics） */}
                      {themes[0]?.subtopics && themes[0].subtopics.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-4">
                          <p className="text-sm font-bold text-blue-800 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            質問項目
                          </p>
                          <ul className="space-y-1">
                            {themes[0].subtopics.map((sub: string, subIdx: number) => (
                              <li key={subIdx} className="text-sm text-gray-700 flex items-start">
                                <span className="text-blue-400 mr-2 mt-0.5 flex-shrink-0">▸</span>
                                <span dangerouslySetInnerHTML={{ __html: getHighlightedHTML(sub, searchKeyword) }} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 小項目リスト */}
                      <div className="space-y-4">
                        {themes.map((theme, themeIdx) => {
                          const { minor } = parseThemeTitle(theme.theme_title || '');
                          return (
                          <div key={themeIdx} className="bg-white rounded-lg p-5 border-2 border-purple-200 shadow-sm">
                      {/* テーマヘッダー（小項目がある場合のみ表示） */}
                      {minor && (
                        <div className="mb-4 pb-3 border-b border-purple-100">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="inline-block px-3 py-1 text-base font-bold text-white bg-purple-600 rounded-lg flex-shrink-0">
                              テーマ {themeIdx + 1}
                            </span>
                            <span className="text-base font-bold text-purple-900">
                              {minor}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 質問のポイント */}
                      {theme.question_point && (
                        <div className="mb-3">
                          <div className="flex items-start">
                            <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-blue-600 rounded mr-2 flex-shrink-0">Q</span>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-blue-800 mb-1">質問のポイント</p>
                              <p
                                className="text-gray-800"
                                dangerouslySetInnerHTML={{ __html: getHighlightedHTML(theme.question_point, searchKeyword) }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 回答のポイント */}
                      {theme.answer_point && (
                        <div className="mb-3">
                          <div className="flex items-start">
                            <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-green-600 rounded mr-2 flex-shrink-0">A</span>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-green-800 mb-1">回答のポイント</p>
                              <p
                                className="text-gray-700"
                                dangerouslySetInnerHTML={{ __html: getHighlightedHTML(theme.answer_point, searchKeyword) }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 分野タグ */}
                      {theme.field_tag && (
                        <div className="mb-3">
                          <span className="inline-block px-3 py-1 text-xs font-bold text-white bg-indigo-500 rounded-full">
                            🏷️ {theme.field_tag}
                          </span>
                        </div>
                      )}

                      {/* 議論のポイント */}
                      {theme.discussion_point && (
                        <div className="mb-3">
                          <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded-r-lg">
                            <p className="text-xs font-bold text-orange-800 mb-1">💭 議論のポイント（なぜ重要か）</p>
                            <p
                              className="text-gray-800 text-sm"
                              dangerouslySetInnerHTML={{ __html: getHighlightedHTML(theme.discussion_point, searchKeyword) }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 影響を受ける人 */}
                      {theme.affected_people && (
                        <div>
                          <div className="bg-pink-50 border-l-4 border-pink-500 p-3 rounded-r-lg">
                            <p className="text-xs font-bold text-pink-800 mb-1">👥 影響を受ける人</p>
                            <p
                              className="text-gray-800 text-sm"
                              dangerouslySetInnerHTML={{ __html: getHighlightedHTML(theme.affected_people, searchKeyword) }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              );
            })()}

            {/* 旧形式：個別のポイント（下位互換性のため残す） */}
            {!card.themes && (
              <>
                {/* テーマタイトル */}
                {card.theme_title && (
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-purple-800 mb-2">テーマ</h3>
                    <p className="text-gray-800 font-semibold">{card.theme_title}</p>
                  </div>
                )}

                {/* 質問と回答のポイント */}
                {(card.gpt_question_point1 || card.gpt_answer_point1 || card.gpt_question_point2 || card.gpt_answer_point2 || card.gpt_question_point3 || card.gpt_answer_point3) && (
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-purple-800 mb-3">質問と回答のポイント</h3>
                    <div className="space-y-4">
                      {card.gpt_question_point1 && (
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                          <div className="flex items-start mb-2">
                            <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-blue-600 rounded mr-2">Q1</span>
                            <p className="text-gray-800 flex-1">{card.gpt_question_point1}</p>
                          </div>
                          {card.gpt_answer_point1 && (
                            <div className="flex items-start mt-2 ml-6">
                              <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-green-600 rounded mr-2">A1</span>
                              <p className="text-gray-700 flex-1">{card.gpt_answer_point1}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {card.gpt_question_point2 && (
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                          <div className="flex items-start mb-2">
                            <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-blue-600 rounded mr-2">Q2</span>
                            <p className="text-gray-800 flex-1">{card.gpt_question_point2}</p>
                          </div>
                          {card.gpt_answer_point2 && (
                            <div className="flex items-start mt-2 ml-6">
                              <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-green-600 rounded mr-2">A2</span>
                              <p className="text-gray-700 flex-1">{card.gpt_answer_point2}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {card.gpt_question_point3 && (
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                          <div className="flex items-start mb-2">
                            <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-blue-600 rounded mr-2">Q3</span>
                            <p className="text-gray-800 flex-1">{card.gpt_question_point3}</p>
                          </div>
                          {card.gpt_answer_point3 && (
                            <div className="flex items-start mt-2 ml-6">
                              <span className="inline-block px-2 py-1 text-xs font-bold text-white bg-green-600 rounded mr-2">A3</span>
                              <p className="text-gray-700 flex-1">{card.gpt_answer_point3}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 議論のポイント */}
                {card.gpt_discussion_point && (
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-purple-800 mb-2">議論のポイント（なぜ重要か）</h3>
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <p className="text-gray-800">{card.gpt_discussion_point}</p>
                    </div>
                  </div>
                )}

                {/* 影響を受ける人 */}
                {card.gpt_affected_people && (
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-purple-800 mb-2">影響を受ける人</h3>
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <p className="text-gray-800">{card.gpt_affected_people}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* タグ */}
            {((card.gpt_field_tags && card.gpt_field_tags.length > 0) || (card.gpt_nature_tags && card.gpt_nature_tags.length > 0)) && (
              <div>
                <h3 className="text-lg font-bold text-purple-800 mb-3">タグ</h3>
                <div className="space-y-3">
                  {card.gpt_field_tags && card.gpt_field_tags.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-purple-700 mb-2">分野</p>
                      <div className="flex flex-wrap gap-2">
                        {card.gpt_field_tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-3 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded-full border border-blue-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {card.gpt_nature_tags && card.gpt_nature_tags.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-purple-700 mb-2">性質</p>
                      <div className="flex flex-wrap gap-2">
                        {card.gpt_nature_tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-3 py-1 text-sm font-medium text-green-800 bg-green-100 rounded-full border border-green-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* 全文表示セクション */}
        {showFullText && (
        <div id="full-text-section" className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <svg className="w-7 h-7 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            全文
          </h3>

          {/* 質問全文（question_textが空でない場合のみ表示） */}
          {card.question_text && card.question_text.trim() && (
            <div className="mb-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getFactionColor(card.faction)} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                    {card.member_name.charAt(0)}
                  </div>
                  <div className="text-center mt-2 text-xs font-medium text-gray-600">質問者</div>
                  {card.faction && (
                    <div className="text-center text-xs font-semibold text-purple-600">
                      {card.faction}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="bg-white rounded-2xl rounded-tl-none shadow-lg p-6 relative">
                    <div className="absolute -left-3 top-4 w-0 h-0 border-t-[12px] border-t-transparent border-r-[12px] border-r-white border-b-[12px] border-b-transparent"></div>

                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <span className="text-2xl mr-2">💭</span>
                      {card.member_name}の質問
                    </h3>

                    <p
                      className="text-gray-700 whitespace-pre-wrap leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: getHighlightedHTML(card.question_text, searchKeyword) }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 答弁全文 */}
          {card.answer_texts && card.answer_texts.length > 0 && (
            <div className="mb-8">
              <div className="flex items-start gap-4 flex-row-reverse">
                {/* 答弁者アイコン */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {card.answerers && card.answerers[0] ? card.answerers[0].charAt(0) : '答'}
                  </div>
                  <div className="text-center mt-2 text-xs font-medium text-gray-600">答弁者</div>
                </div>

                {/* 答弁内容 */}
                <div className="flex-1">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl rounded-tr-none shadow-lg p-6 relative">
                    <div className="absolute -right-3 top-4 w-0 h-0 border-t-[12px] border-t-transparent border-l-[12px] border-l-green-50 border-b-[12px] border-b-transparent"></div>

                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-bold text-gray-900 flex items-center">
                        <span className="text-2xl mr-2">💬</span>
                        答弁
                      </h2>
                    </div>

                  {/* 答弁者リスト */}
                  {card.answerers && card.answerers.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {card.answerers.map((answerer, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 text-sm font-medium bg-white text-green-700 rounded-full shadow-sm"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {answerer}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 答弁の要点（構造化 or 旧形式） */}
                  <div className="mb-4">
                    {structuredAnswerSummary ? (
                      <div className="space-y-3">
                        {/* 主な論点 */}
                        <div className="bg-white border-l-4 border-purple-600 p-4 rounded-r-lg shadow-sm">
                          <div className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-2 flex items-center">
                            <span className="mr-2">💭</span>
                            主な論点
                          </div>
                          <p className="text-gray-900 font-medium leading-relaxed">
                            {structuredAnswerSummary.issues}
                          </p>
                        </div>

                        {/* 今後の課題 */}
                        <div className="bg-white border-l-4 border-orange-600 p-4 rounded-r-lg shadow-sm">
                          <div className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-2 flex items-center">
                            <span className="mr-2">🔮</span>
                            今後の課題
                          </div>
                          <p className="text-gray-900 font-medium leading-relaxed">
                            {structuredAnswerSummary.future}
                          </p>
                        </div>
                      </div>
                    ) : (
                      // 旧形式のプレーンテキスト要約
                      <div className="bg-white border-l-4 border-green-600 p-4 rounded-r-lg shadow-sm">
                        <div className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2">要点</div>
                        <p className="text-gray-900 font-medium leading-relaxed">
                          {answerSummary}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 全文表示（展開可能） */}
                  {areAnswersLong && (
                    <div className="mt-4">
                      {showFullAnswers ? (
                        <>
                          <div className="space-y-4">
                            {card.answer_texts.map((answerText, idx) => (
                              <div key={idx}>
                                {card.answer_texts.length > 1 && (
                                  <div className="text-sm font-bold text-green-700 mb-2">
                                    答弁 {idx + 1}
                                  </div>
                                )}
                                <p
                                  className="text-gray-700 whitespace-pre-wrap leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: getHighlightedHTML(answerText, searchKeyword) }}
                                />
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => setShowFullAnswers(false)}
                            className="mt-4 text-sm text-green-600 hover:text-green-800 font-medium flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            閉じる
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setShowFullAnswers(true)}
                          className="text-sm text-green-600 hover:text-green-800 font-medium flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          全文を読む
                        </button>
                      )}
                    </div>
                  )}

                  {!areAnswersLong && (
                    <div className="space-y-4 mt-4">
                      {card.answer_texts.map((answerText, idx) => (
                        <div key={idx}>
                          {card.answer_texts.length > 1 && (
                            <div className="text-sm font-bold text-green-700 mb-2">
                              答弁 {idx + 1}
                            </div>
                          )}
                          <p
                            className="text-gray-700 whitespace-pre-wrap leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: getHighlightedHTML(answerText, searchKeyword) }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
        )}

        {/* 戻るボタン */}
        <div className="mt-12 text-center">
          <Link
            href="/cards"
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            カード一覧に戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
