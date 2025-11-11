'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { createClient } from '@supabase/supabase-js';

ChartJS.register(ArcElement, Tooltip, Legend);

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MeetingTopicsPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = decodeURIComponent(params.meetingId as string);
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const [meetingData, setMeetingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchTopicData();
  }, [meetingId]);

  const fetchTopicData = async () => {
    try {
      setLoading(true);

      console.log('🔍 Fetching data for meetingId:', meetingId);

      // meeting_topicsテーブルからmeeting_titleで検索
      const { data, error } = await supabase
        .from('meeting_topics')
        .select('*')
        .eq('meeting_title', meetingId)
        .eq('published', true)
        .order('display_order', { ascending: true })
        .limit(1);

      console.log('📦 Raw data from Supabase:', data);
      console.log('❗ Error:', error);

      if (error) throw error;

      const topicData = data?.[0];
      console.log('📋 topicData (first element):', topicData);

      if (topicData) {
        console.log('📥 取得したデータ:', topicData);
        console.log('📋 content_data:', topicData.content_data);
        console.log('📌 topics:', topicData.content_data?.topics);

        // データを整形
        const formattedData = {
          title: topicData.title,
          date: topicData.date || meetingId,
          description: topicData.description,
          topics: topicData.content_data?.topics || [],
          summary: topicData.summary || [],
          supplementaryBudget: topicData.supplementary_budget,
          totalBudgetAfter: topicData.total_budget_after,
          stats: topicData.content_data?.stats,
          keyAchievements: topicData.content_data?.key_achievements,
          visualType: topicData.content_data?.visual_type || 'standard'
        };

        console.log('✅ 整形後のデータ:', formattedData);
        console.log('🔍 topics配列:', formattedData.topics);
        if (formattedData.topics && formattedData.topics.length > 0) {
          console.log('📍 最初のtopic:', formattedData.topics[0]);
          console.log('📍 最初のtopicのitems:', formattedData.topics[0].items);
        }

        setMeetingData(formattedData);
      }
    } catch (err: any) {
      console.error('Error fetching topic data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const highlightText = (text: string) => {
    if (!searchTerm.trim()) return text;

    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, index) => {
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return <mark key={index} className="bg-yellow-300 font-semibold">{part}</mark>;
      }
      return part;
    });
  };

  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error || !meetingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-lg text-gray-600 mb-6">該当する会議が見つかりません</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium underline">
            トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return null;
  }

  // インフォグラフィック版の表示
  const isInfographic = meetingData.stats && meetingData.keyAchievements;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* ヘッダー */}
      <header className="bg-white/70 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent cursor-pointer flex items-center gap-2">
                <span className="text-3xl">🏛️</span>
                みらい議会　都城市版
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

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {/* 議会一覧へのリンク */}
        <div className="mb-8">
          <a
            href="/#meetings"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium transition-colors"
          >
            <span>←</span>
            <span>他の定例会を見る</span>
          </a>
        </div>

        {/* タイトルセクション */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 md:p-12 mb-12 text-white">
          <div className="text-sm font-semibold mb-3 opacity-90">
            {meetingData.date}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-6">
            {meetingData.title}
          </h1>
          <p className="text-lg leading-relaxed opacity-95">
            {meetingData.description}
          </p>
        </div>

        {/* インフォグラフィック版：統計情報カード */}
        {isInfographic && meetingData.stats && (
          <div className="mb-12 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="text-sm text-gray-600 mb-1">審議議案数</div>
              <div className="text-3xl font-bold text-blue-600">{meetingData.stats.total_bills}</div>
              <div className="text-xs text-gray-500 mt-1">可決率 {meetingData.stats.approval_rate}</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="text-sm text-gray-600 mb-1">カテゴリー数</div>
              <div className="text-3xl font-bold text-green-600">{meetingData.stats.categories}</div>
              <div className="text-xs text-gray-500 mt-1">主要分野</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500 col-span-2 md:col-span-1">
              <div className="text-sm text-gray-600 mb-1">補正予算</div>
              <div className="text-2xl md:text-3xl font-bold text-orange-600">{meetingData.stats.total_budget}</div>
            </div>
          </div>
        )}

        {/* インフォグラフィック版：主要実績カード */}
        {isInfographic && meetingData.keyAchievements && (
          <div className="mb-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {meetingData.keyAchievements.map((achievement: any, idx: number) => (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-lg p-6 text-center border-t-4"
                style={{ borderColor: achievement.color }}
              >
                <div className="text-4xl mb-2">{achievement.icon === 'check' ? '✅' : achievement.icon === 'money' ? '💰' : achievement.icon === 'construction' ? '🏗️' : '🤝'}</div>
                <div className="text-sm text-gray-600 mb-1">{achievement.title}</div>
                <div className="text-2xl font-bold mb-1" style={{ color: achievement.color }}>
                  {achievement.value}
                </div>
                <div className="text-xs text-gray-500">{achievement.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* 予算の視覚化セクション */}
        {meetingData.supplementaryBudget && (
          <div className="mb-12 bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-purple-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
              <span className="text-3xl mr-3">💰</span>
              予算の内訳
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 補正予算の円グラフ */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                  {meetingData.supplementaryBudget.description || '補正予算の内訳'}
                </h3>
                <p className="text-center text-lg font-semibold text-purple-600 mb-6">
                  総額: {(meetingData.supplementaryBudget.total / 100000000).toFixed(1)}億円
                </p>
                <div className="max-w-sm mx-auto">
                  <Pie
                    data={{
                      labels: meetingData.supplementaryBudget.breakdown.map((item: any) => item.category),
                      datasets: [{
                        data: meetingData.supplementaryBudget.breakdown.map((item: any) => item.amount),
                        backgroundColor: meetingData.supplementaryBudget.breakdown.map((item: any) => item.color),
                        borderWidth: 2,
                        borderColor: '#ffffff',
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            padding: 15,
                            font: { size: 12 },
                            generateLabels: (chart) => {
                              const data = chart.data;
                              if (data.labels && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                  const value = data.datasets[0].data[i] as number;
                                  const percentage = ((value / meetingData.supplementaryBudget!.total) * 100).toFixed(1);
                                  const bgColors = data.datasets[0].backgroundColor as string[];
                                  return {
                                    text: `${label} (${percentage}%)`,
                                    fillStyle: bgColors?.[i] as string,
                                    hidden: false,
                                    index: i
                                  };
                                });
                              }
                              return [];
                            }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const value = context.parsed;
                              const percentage = ((value / meetingData.supplementaryBudget!.total) * 100).toFixed(1);
                              return `${context.label}: ${(value / 100000000).toFixed(1)}億円 (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
                {/* 内訳リスト */}
                <div className="mt-6 space-y-2">
                  {meetingData.supplementaryBudget.breakdown.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-700">{highlightText(item.category)}</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {(item.amount / 100000000).toFixed(1)}億円
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 補正後の総予算 */}
              {meetingData.totalBudgetAfter && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                    補正後の総予算
                  </h3>
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-600 mb-2">補正前</p>
                    <p className="text-2xl font-bold text-gray-700">
                      {((meetingData.totalBudgetAfter - meetingData.supplementaryBudget.total) / 100000000).toFixed(1)}億円
                    </p>
                    <div className="my-4">
                      <span className="text-3xl text-blue-600">+</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">補正額</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {(meetingData.supplementaryBudget.total / 100000000).toFixed(1)}億円
                    </p>
                    <div className="my-4 border-t-2 border-gray-300"></div>
                    <p className="text-sm text-gray-600 mb-2">補正後の総額</p>
                    <p className="text-4xl font-bold text-blue-600">
                      {(meetingData.totalBudgetAfter / 100000000).toFixed(1)}億円
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* トピックセクション */}
        <div className="space-y-8">
          {meetingData.topics.map((topic: any, idx: number) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border-l-4 hover:shadow-xl transition-shadow"
              style={{ borderColor: topic.color || '#8b5cf6' }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                     style={{ backgroundColor: topic.color || '#8b5cf6' }}>
                  {topic.icon ? (topic.icon === 'emergency' ? '⚡' : topic.icon === 'document' ? '📋' : topic.icon === 'budget' ? '💼' : topic.icon === 'construction' ? '🏗️' : '📌') : idx + 1}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {highlightText(topic.title)}
                  </h2>
                  {topic.count && (
                    <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold mb-2">
                      {topic.count}
                    </span>
                  )}
                  <p className="text-gray-700 font-medium">
                    {highlightText(topic.description)}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {topic.items.map((item: any, itemIdx: number) => (
                  <div
                    key={itemIdx}
                    className="border-l-4 border-purple-200 pl-6 py-2"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                      {item.icon && <span>{item.icon === 'car' ? '🚗' : item.icon === 'safety' ? '🚒' : item.icon === 'health' ? '💊' : ''}</span>}
                      {highlightText(item.subtitle)}
                    </h3>
                    {item.badge && (
                      <div className="inline-block px-3 py-1 rounded-lg font-semibold text-sm mb-3"
                           style={{ backgroundColor: item.badge_color + '20', color: item.badge_color }}>
                        {item.badge}
                      </div>
                    )}
                    {item.budget && (
                      <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold mb-3">
                        {highlightText(`予算: ${item.budget}`)}
                      </div>
                    )}
                    {item.contract_amount && (
                      <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-bold mb-3">
                        {highlightText(`契約金額: ${item.contract_amount}`)}
                      </div>
                    )}
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line mb-3">
                      {highlightText(item.content)}
                    </div>
                    {item.breakdown && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <div className="text-sm font-semibold text-gray-700 mb-2">内訳：</div>
                        {item.breakdown.map((b: any, bIdx: number) => (
                          <div key={bIdx} className="text-sm text-gray-600 ml-4">
                            • {b.category}: {b.amount} ({b.detail})
                          </div>
                        ))}
                      </div>
                    )}
                    {item.impact && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3">
                        <div className="text-sm font-semibold text-yellow-800 mb-1">市民への影響</div>
                        <div className="text-sm text-yellow-700">{item.impact}</div>
                      </div>
                    )}
                    {item.result && (
                      <div className="inline-block px-4 py-2 rounded-lg font-semibold"
                           style={{ backgroundColor: item.badge_color + '20' || '#dbeafe', color: item.badge_color || '#1e40af' }}>
                        {highlightText(item.result)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* カテゴリーサマリー */}
              {topic.summary_stats && (
                <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex flex-wrap gap-4 text-sm">
                    {topic.summary_stats.total_bills && (
                      <div>
                        <span className="text-gray-600">議案数: </span>
                        <span className="font-bold text-gray-900">{topic.summary_stats.total_bills}件</span>
                      </div>
                    )}
                    {topic.summary_stats.unanimous && (
                      <div>
                        <span className="text-gray-600">全会一致: </span>
                        <span className="font-bold text-green-600">{topic.summary_stats.unanimous}件</span>
                      </div>
                    )}
                    {topic.summary_stats.total_budget && (
                      <div>
                        <span className="text-gray-600">予算: </span>
                        <span className="font-bold text-blue-600">{topic.summary_stats.total_budget}</span>
                      </div>
                    )}
                    {topic.summary_stats.total_contract && (
                      <div>
                        <span className="text-gray-600">契約: </span>
                        <span className="font-bold text-purple-600">{topic.summary_stats.total_contract}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* まとめセクション */}
        <div className="mt-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl shadow-lg p-6 md:p-8 border border-purple-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-3xl mr-3">📋</span>
            今回の議会のポイント
          </h2>
          <ul className="space-y-3">
            {meetingData.summary.map((point: any, idx: number) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-gray-800 text-lg"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm mt-1">
                  {idx + 1}
                </span>
                <span className="flex-1 pt-1">{highlightText(point)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href={`/cards?meeting=${encodeURIComponent(meetingId)}`}
            className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
          >
            この議会の議員質問内容を見る →
          </Link>
        </div>

        {/* フッター注記 */}
        <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 leading-relaxed">
            <strong>注記：</strong> {highlightText(`この資料は、${meetingData.date}の都城市議会定例会における市長の提案理由説明と議事録をもとに作成したものです。詳細な議論の内容や各議員の質疑については、市議会の公式議事録をご参照ください。`)}
          </p>
        </div>
      </main>
    </div>
  );
}
