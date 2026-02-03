'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Meeting {
  title: string;
  date: string | null;
  cardCount: number;
}

interface QuestionCard {
  id: string;
  member_name: string;
  question_summary: string;
  meeting_title: string;
  meeting_date: string | null;
  topics: string[];
}

interface Stats {
  totalCards: number;
  totalMembers: number;
  totalTopics: number;
  totalMeetings: number;
  popularTopics: Array<{ topic: string; count: number }>;
  fieldTagRankingByYear: Array<{
    year: string;
    tags: Array<{ tag: string; count: number }>;
  }>;
  memberThemeRankingByYear: Array<{
    year: string;
    members: Array<{ member: string; count: number; faction: string | null }>;
  }>;
  latestMeetingCategories: Array<{ tag: string; count: number }>;
  latestMeetingTitle: string | null;
  viewCountRankingByYear: Array<{
    year: string;
    cards: Array<{
      id: string;
      member_name: string;
      question_summary: string;
      question_text: string;
      view_count: number;
      meeting_title: string;
      meeting_date: string | null;
      topics: string[];
    }>;
  }>;
  keywordRankingByYear: Array<{
    year: string;
    keywords: Array<{ keyword: string; count: number }>;
  }>;
}

export default function Home() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [recentCards, setRecentCards] = useState<QuestionCard[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMeetingYear, setSelectedMeetingYear] = useState<string>('all');

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

  useEffect(() => {
    fetchData();
  }, []);

  // URLハッシュによるアンカーリンク処理（データ読み込み完了後）
  useEffect(() => {
    if (!loading) {
      const hash = window.location.hash;
      if (hash) {
        // データ読み込み完了後、DOMが完全にレンダリングされるのを待つ
        setTimeout(() => {
          const element = document.getElementById(hash.replace('#', ''));
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      }
    }
  }, [loading]);

  // 統計データが読み込まれたら、最新の年をデフォルト選択
  useEffect(() => {
    if (!selectedYear && stats) {
      // いずれかのランキングから最新の年を取得
      const latestYear =
        stats.keywordRankingByYear?.[0]?.year ||
        stats.fieldTagRankingByYear?.[0]?.year ||
        stats.memberThemeRankingByYear?.[0]?.year;

      if (latestYear) {
        setSelectedYear(latestYear);
      }
    }
  }, [stats, selectedYear]);

  // 議会データが読み込まれたら、最新の年をデフォルト選択
  useEffect(() => {
    if (!selectedMeetingYear && meetings.length > 0) {
      // 会議名から年度を抽出（例: 令和4年第2回定例会 → 令和4年）
      const extractYear = (title: string): string | null => {
        const match = title.match(/(令和\d+年|平成\d+年)/);
        return match ? match[1] : null;
      };

      const firstMeetingYear = extractYear(meetings[0].title);
      if (firstMeetingYear) {
        setSelectedMeetingYear(firstMeetingYear);
      }
    }
  }, [meetings, selectedMeetingYear]);

  const fetchData = async () => {
    try {
      // 統計情報、最新カード、議会一覧を並行取得
      const [statsRes, cardsRes, meetingsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/cards?limit=6'),
        fetch('/api/meetings'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (cardsRes.ok) {
        const cardsData = await cardsRes.json();
        setRecentCards(cardsData.cards || []);
      }

      if (meetingsRes.ok) {
        const meetingsData = await meetingsRes.json();
        setMeetings(meetingsData.meetings || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/cards?keyword=${encodeURIComponent(searchQuery)}`);
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
            <Link href="/">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent cursor-pointer flex items-center gap-2">
                <span className="text-3xl">🏛️</span>
                みえる議会　都城市版
              </h1>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/cards"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors font-medium"
              >
                すべてのカード
              </Link>
              <Link
                href="/admin/login"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                管理者
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヒーローセクション */}
        <section className="mb-16 py-12">
          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            {/* 左側：検索セクション */}
            <div className="relative text-center lg:text-left rounded-2xl p-8 lg:p-10 shadow-2xl overflow-hidden flex flex-col justify-center">
              {/* 背景画像 */}
              <div className="absolute inset-0">
                <Image
                  src="/images/city-hall.jpg"
                  alt="都城市役所"
                  fill
                  className="object-cover opacity-60"
                  priority
                />
              </div>

              {/* グラデーションオーバーレイ */}
              <div className="absolute inset-0 bg-gradient-to-bl from-blue-500/70 via-blue-700/75 to-indigo-900/80"></div>

              {/* コンテンツ */}
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                  地方議会をもっと身近に
                </h2>
                <p className="text-xl text-blue-50 mb-8">
                  議員の質問と答弁を簡単に検索・閲覧できます。<br />
                  あなたの関心のあるテーマから、市政の動きをチェックしましょう。
                </p>

                {/* 検索ボックス */}
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="キーワードで質問を検索（例: 教育、防災、高齢者支援）"
                      className="w-full px-6 py-4 pr-32 text-lg border-2 border-white/20 bg-white/95 backdrop-blur rounded-full focus:outline-none focus:border-white focus:bg-white shadow-lg placeholder:text-gray-500"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-white text-blue-600 font-medium rounded-full hover:bg-blue-50 transition-colors shadow-md"
                    >
                      検索
                    </button>
                  </div>
                </form>
                <p className="mt-2 text-sm text-white/70">
                  ※ 質問内容から検索します。議員名での検索はできません。
                </p>

                {/* 次回会期日程 */}
                <div className="mt-8 text-right">
                  <p className="text-sm text-white/90">
                    <span className="font-semibold">次回会期：</span>
                    <br />
                    ２月２１日（金曜日）から３月２０日（木曜日）まで（予定）
                  </p>
                </div>
              </div>
            </div>

            {/* 右側：説明セクション */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">みえる議会って何？</h3>
              </div>

              <div className="space-y-4 text-gray-900">
                <p className="leading-relaxed">
                  「みえる議会 都城」は、市民に開かれた議会を実現するために開発したプラットフォームです。
                </p>
                <p className="leading-relaxed">
                  都城市議会での議論や議員の質問をわかりやすく伝え、従来市民に届きにくかった市議会の議論を可視化し、市政の透明性を高めることを目指しています。
                </p>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3">主な機能</h4>
                  <ul className="space-y-3 text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span><strong>簡単検索</strong>: 議員の質問と答弁をテーマやキーワードから簡単に検索</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span><strong>わかりやすい表示</strong>: 議事録をそのまま読むのではなく、要点を整理して表示</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span><strong>市政の可視化</strong>: 議会で何が話し合われているのか、統計やランキングで一目で把握</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span><strong>AI要約</strong>: 長い議事録をAIが要約し、忙しい市民でもすぐに内容を理解</span>
                    </li>
                  </ul>
                </div>

                <p className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                  ※ 本サービスはNPO法人よかまちLABOが独自に開発した地方議会向けプラットフォームです。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 分野別カテゴリ */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">分野から探す</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { name: '子育て・教育', icon: '👶', color: 'from-blue-500 to-indigo-500' },
              { name: '地域振興', icon: '🏘️', color: 'from-green-500 to-emerald-500' },
              { name: '防災・減災', icon: '🚨', color: 'from-red-500 to-orange-500' },
              { name: 'デジタル化推進', icon: '💻', color: 'from-cyan-500 to-blue-500' },
              { name: '農業・畜産', icon: '🌾', color: 'from-amber-500 to-yellow-500' },
              { name: '環境・エネルギー', icon: '🌱', color: 'from-lime-500 to-green-500' },
              { name: '福祉', icon: '🤝', color: 'from-pink-500 to-rose-500' },
              { name: '高齢者福祉', icon: '👴', color: 'from-purple-400 to-pink-400' },
              { name: '男女共同参画', icon: '⚖️', color: 'from-violet-500 to-purple-500' },
              { name: '行政改革', icon: '🏛️', color: 'from-slate-500 to-gray-600' },
              { name: '医療・健康', icon: '🏥', color: 'from-teal-500 to-cyan-500' },
              { name: '都市計画', icon: '🏗️', color: 'from-stone-500 to-zinc-500' },
            ].map((category) => (
              <Link
                key={category.name}
                href={`/cards?category=${encodeURIComponent(category.name)}`}
                className="group relative bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-transparent"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                <div className="relative p-6 text-center">
                  <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform duration-300">
                    {category.icon}
                  </div>
                  <div className="text-sm font-bold text-gray-900 group-hover:text-white transition-colors duration-300">
                    {category.name}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 統計情報ダッシュボード */}
        {stats && (
          <section className="mb-16">
            {/* 年度選択 */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">年度別ランキング</h3>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-4 py-2 border-2 border-blue-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="all">すべての年</option>
                {(() => {
                  // すべてのランキングから年度を抽出してユニークなリストを作成
                  const years = new Set<string>();
                  stats.keywordRankingByYear?.forEach((d) => years.add(d.year));
                  stats.fieldTagRankingByYear?.forEach((d) => years.add(d.year));
                  stats.memberThemeRankingByYear?.forEach((d) => years.add(d.year));

                  // 年度順にソート（新しい順）
                  return Array.from(years)
                    .sort((a, b) => {
                      const yearNumA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
                      const yearNumB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
                      return yearNumB - yearNumA;
                    })
                    .map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ));
                })()}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. 質問ジャンルランキング */}
              {stats.fieldTagRankingByYear && stats.fieldTagRankingByYear.length > 0 && (() => {
                // 選択された年度のデータを取得（すべての年の場合は全データを統合）
                let displayTags: Array<{ tag: string; count: number }> = [];

                if (!selectedYear || selectedYear === 'all') {
                  // すべての年のデータを統合
                  const tagCounts = new Map<string, number>();
                  stats.fieldTagRankingByYear.forEach((yearData) => {
                    yearData.tags.forEach((item) => {
                      tagCounts.set(item.tag, (tagCounts.get(item.tag) || 0) + item.count);
                    });
                  });
                  displayTags = Array.from(tagCounts.entries())
                    .map(([tag, count]) => ({ tag, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);
                } else {
                  // 指定された年度のデータを取得
                  const yearData = stats.fieldTagRankingByYear.find((d) => d.year === selectedYear);
                  displayTags = yearData?.tags || [];
                }

                return displayTags.length > 0 ? (
                  <div className="bg-white rounded-2xl shadow-md p-6 border border-blue-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <span className="text-2xl mr-2">📋</span>
                      質問ジャンルランキング
                    </h3>
                    <div className="space-y-3">
                      {displayTags.slice(0, 5).map((item, idx) => (
                        <Link
                          key={item.tag}
                          href={`/cards?category=${encodeURIComponent(item.tag)}`}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-blue-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                              {idx + 1}
                            </div>
                            <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {item.tag}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-blue-600">
                            {item.count}件
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* 2. 期間別頻出キーワードランキング */}
              {stats.keywordRankingByYear && stats.keywordRankingByYear.length > 0 && (() => {
                // 選択された年度のデータを取得（すべての年の場合は全データを統合）
                let displayKeywords: Array<{ keyword: string; count: number }> = [];

                if (!selectedYear || selectedYear === 'all') {
                  // すべての年のデータを統合
                  const keywordCounts = new Map<string, number>();
                  stats.keywordRankingByYear.forEach((yearData) => {
                    yearData.keywords.forEach((item) => {
                      keywordCounts.set(item.keyword, (keywordCounts.get(item.keyword) || 0) + item.count);
                    });
                  });
                  displayKeywords = Array.from(keywordCounts.entries())
                    .map(([keyword, count]) => ({ keyword, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);
                } else {
                  // 指定された年度のデータを取得
                  const yearData = stats.keywordRankingByYear.find((d) => d.year === selectedYear);
                  displayKeywords = yearData?.keywords || [];
                }

                return displayKeywords.length > 0 ? (
                  <div className="bg-white rounded-2xl shadow-md p-6 border border-purple-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <span className="text-2xl mr-2">📊</span>
                      期間別頻出キーワードランキング
                    </h3>
                    <div className="space-y-2">
                      {displayKeywords.slice(0, 5).map((item, idx) => (
                        <div
                          key={item.keyword}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-purple-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                              {idx + 1}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {item.keyword}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-purple-600">
                            {item.count}件
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* 3. よく見られている質問 */}
              {stats.viewCountRankingByYear && stats.viewCountRankingByYear.length > 0 && (() => {
                // 選択された年度のデータを取得
                let displayCards: Array<{
                  id: string;
                  member_name: string;
                  question_summary: string;
                  question_text: string;
                  view_count: number;
                  meeting_title: string;
                  meeting_date: string | null;
                  topics: string[];
                }> = [];

                if (!selectedYear || selectedYear === 'all') {
                  // すべての年のデータを統合してview_countでソート
                  const allCards: typeof displayCards = [];
                  stats.viewCountRankingByYear.forEach((yearData) => {
                    allCards.push(...yearData.cards);
                  });
                  displayCards = allCards
                    .sort((a, b) => b.view_count - a.view_count)
                    .slice(0, 5);
                } else {
                  // 選択された年度のデータを取得
                  const yearData = stats.viewCountRankingByYear.find((y) => y.year === selectedYear);
                  displayCards = yearData ? yearData.cards.slice(0, 5) : [];
                }

                if (displayCards.length === 0) return null;

                return (
                  <div className="bg-white rounded-2xl shadow-md p-6 border border-orange-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <span className="text-2xl mr-2">👁️</span>
                      よく見られている質問
                    </h3>
                    <div className="space-y-3">
                      {displayCards.map((card, idx) => {
                        // question_summaryが空または短い場合、question_textの最初の部分を使用
                        const displayText = card.question_summary && card.question_summary.length > 5
                          ? card.question_summary
                          : card.question_text
                            ? card.question_text.substring(0, 100) + (card.question_text.length > 100 ? '...' : '')
                            : '質問内容が見つかりません';

                        return (
                        <Link
                          key={card.id}
                          href={`/cards/${card.id}`}
                          className="block p-3 rounded-lg hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-200"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 mb-1 line-clamp-2">
                                  {displayText}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                  <span className="font-medium">{card.member_name}</span>
                                  {card.topics && card.topics.length > 0 && (
                                    <>
                                      <span className="text-gray-400">•</span>
                                      <span className="text-purple-600">{card.topics[0]}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1 text-orange-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="text-sm font-bold">{card.view_count}</span>
                            </div>
                          </div>
                        </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 4. 質問テーマ数ランキング（議員別） */}
              {stats.memberThemeRankingByYear && stats.memberThemeRankingByYear.length > 0 && (() => {
                // 選択された年度のデータを取得（すべての年の場合は全データを統合）
                let displayMembers: Array<{ member: string; count: number; faction: string | null }> = [];

                if (!selectedYear || selectedYear === 'all') {
                  // すべての年のデータを統合
                  const memberCounts = new Map<string, { count: number; faction: string | null }>();
                  stats.memberThemeRankingByYear.forEach((yearData) => {
                    yearData.members.forEach((item) => {
                      const existing = memberCounts.get(item.member);
                      if (existing) {
                        existing.count += item.count;
                      } else {
                        memberCounts.set(item.member, { count: item.count, faction: item.faction });
                      }
                    });
                  });
                  displayMembers = Array.from(memberCounts.entries())
                    .map(([member, data]) => ({ member, count: data.count, faction: data.faction }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);
                } else {
                  // 指定された年度のデータを取得
                  const yearData = stats.memberThemeRankingByYear.find((d) => d.year === selectedYear);
                  displayMembers = yearData?.members || [];
                }

                return displayMembers.length > 0 ? (
                  <div className="bg-white rounded-2xl shadow-md p-6 border border-green-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <span className="text-2xl mr-2">👥</span>
                      質問テーマ数ランキング
                    </h3>
                    <div className="space-y-3">
                      {displayMembers.slice(0, 5).map((item, idx) => (
                        <div
                          key={item.member}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-green-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${getFactionColor(item.faction)} flex items-center justify-center text-white font-bold text-sm`}>
                              {idx + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {item.member}
                              </div>
                              {item.faction && (
                                <div className="text-xs text-gray-500">
                                  {item.faction}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-bold text-green-600">
                            {item.count}テーマ
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </section>
        )}

        {/* 人気トピック */}
        {stats && stats.popularTopics.length > 0 && (
          <section className="mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-8">人気のトピック</h3>
            <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
              <div className="flex flex-wrap gap-3">
                {stats.popularTopics.map((topic, idx) => (
                  <Link
                    key={idx}
                    href={`/cards?topic=${encodeURIComponent(topic.topic)}`}
                    className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 font-medium rounded-full transition-all shadow-sm hover:shadow-md border border-blue-200"
                  >
                    {topic.topic}
                    <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                      {topic.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 議会から探す */}
        {meetings.length > 0 && (() => {
          // 全角数字を半角数字に変換
          const toHalfWidth = (str: string) => {
            return str.replace(/[０-９]/g, (s) => {
              return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
            });
          };

          // 会議名から年度を抽出（全角数字に対応）
          const extractYear = (title: string): string | null => {
            const normalized = toHalfWidth(title);
            const match = normalized.match(/(令和\d+年|平成\d+年)/);
            if (!match) return null;

            // 元の文字列から該当部分を抽出（全角のまま返す）
            const yearPattern = match[1];
            const fullWidthMatch = title.match(new RegExp(yearPattern.replace(/\d/g, '[０-９\\d]')));
            return fullWidthMatch ? fullWidthMatch[0] : match[1];
          };

          // 年度ごとの色を返す関数
          const getYearColor = (year: string): string => {
            const normalized = toHalfWidth(year);
            const yearNum = parseInt(normalized.match(/\d+/)?.[0] || '0', 10);
            const colors = [
              'text-blue-600',      // 令和5年
              'text-green-600',     // 令和4年
              'text-purple-600',    // 令和3年
              'text-orange-600',    // 令和2年
              'text-pink-600',      // 令和1年/元年
            ];
            return colors[(5 - yearNum) % colors.length] || 'text-gray-900';
          };

          // すべての年度を抽出してユニークなリストを作成
          const years = new Set<string>();
          meetings.forEach((meeting) => {
            const year = extractYear(meeting.title);
            if (year) years.add(year);
          });

          // 年度順にソート（新しい順）
          const sortedYears = Array.from(years).sort((a, b) => {
            const normalizedA = toHalfWidth(a);
            const normalizedB = toHalfWidth(b);
            const yearNumA = parseInt(normalizedA.match(/\d+/)?.[0] || '0', 10);
            const yearNumB = parseInt(normalizedB.match(/\d+/)?.[0] || '0', 10);
            return yearNumB - yearNumA;
          });

          // フィルタリング
          const filteredMeetings = (!selectedMeetingYear || selectedMeetingYear === 'all')
            ? meetings
            : meetings.filter((meeting) => extractYear(meeting.title) === selectedMeetingYear);

          return (
            <section id="meetings" className="mb-16">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-3xl font-bold text-gray-900">議会から探す</h3>
                <select
                  value={selectedMeetingYear}
                  onChange={(e) => setSelectedMeetingYear(e.target.value)}
                  className="px-4 py-2 border-2 border-blue-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="all">すべての年</option>
                  {sortedYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMeetings.slice(0, 6).map((meeting, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
                >
                  <div className="p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-3">
                      {(() => {
                        const year = extractYear(meeting.title);
                        if (year) {
                          const parts = meeting.title.split(year);
                          return (
                            <>
                              <span className={getYearColor(year)}>{year}</span>
                              {parts[1]}
                            </>
                          );
                        }
                        return meeting.title;
                      })()}
                    </h4>
                    {meeting.date && (
                      <p className="text-sm text-gray-500 mb-4">
                        {formatDate(meeting.date)}
                      </p>
                    )}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">質問カード</span>
                        <span className="text-xl font-bold text-blue-600">
                          {meeting.cardCount}件
                        </span>
                      </div>
                    </div>

                    {/* ボタン */}
                    <div className="flex flex-col gap-3">
                      <Link
                        href={`/cards?meeting=${encodeURIComponent(meeting.title)}`}
                        className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                      >
                        議員質問内容を見る
                        <svg
                          className="ml-2 w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                      <Link
                        href={`/meetings/${encodeURIComponent(meeting.title)}/topics`}
                        className="flex items-center justify-center px-4 py-3 bg-white border-2 border-purple-600 text-purple-600 font-medium rounded-lg hover:bg-purple-600 hover:text-white transition-all shadow-md hover:shadow-lg"
                      >
                        可決トピック
                        <svg
                          className="ml-2 w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              </div>
              {filteredMeetings.length > 6 && (
                <div className="mt-8 text-center">
                  <Link
                    href="/cards"
                    className="inline-flex items-center px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-md hover:shadow-lg"
                  >
                    すべての議会を見る
                    <svg
                      className="ml-2 w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </Link>
                </div>
              )}
            </section>
          );
        })()}

        {/* ローディング状態 */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">読み込んでいます...</p>
          </div>
        )}

        {/* エラー状態 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* データなし */}
        {!loading && !error && recentCards.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-600 text-lg">
              公開されている質問カードはまだありません。
            </p>
            <p className="text-sm text-gray-500 mt-2">
              管理画面で質問カードを公開してください。
            </p>
          </div>
        )}

        {/* 掲載コンテンツについて・免責事項 */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 掲載コンテンツについて */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">掲載コンテンツについて</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              掲載されている質疑情報は、都城市議会の公開された議事録を基に、AIを活用しながら議員の質問内容や議論のポイントを整理したものです。市民の皆様が議会での議論をより理解しやすくすることを目的としています。
            </p>
          </div>

          {/* 免責事項 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">免責事項</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              本サイトで公開する情報は、可能な限り正確かつ最新の情報を反映するよう努めていますが、その正確性・完全性・即時性について保証するものではありません。また、AI要約は不正確または誤解を招く内容を生成する可能性があります。正確な情報は、公式文書や一次資料をご確認ください。
            </p>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-200 bg-white/50 backdrop-blur-sm py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
            <span className="text-lg">🏛️</span>
            みえる議会　都城市版 by NPO法人よかまちLABO
          </p>
          <p className="text-xs text-gray-500 mt-2">
            市民の皆様が議会の情報にアクセスしやすくなることを目指しています
          </p>
        </div>
      </footer>
    </div>
  );
}
