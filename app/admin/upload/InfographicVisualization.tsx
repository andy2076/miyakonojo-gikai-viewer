'use client';

import { SessionAnalysis, OverallAnalysis, getTopicColor } from '@/lib/content-analyzer';

interface InfographicVisualizationProps {
  sessionAnalyses: SessionAnalysis[];
  overallAnalysis: OverallAnalysis;
}

export default function InfographicVisualization({
  sessionAnalyses,
  overallAnalysis,
}: InfographicVisualizationProps) {
  return (
    <div className="space-y-8">
      {/* 全体統計 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl">
        <h3 className="text-xl font-bold text-gray-800 mb-4">全体統計</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="総セッション数"
            value={sessionAnalyses.length}
            icon="📋"
            color="bg-blue-500"
          />
          <StatCard
            label="総質問数"
            value={overallAnalysis.totalQuestions}
            icon="❓"
            color="bg-green-500"
          />
          <StatCard
            label="総答弁数"
            value={overallAnalysis.totalAnswers}
            icon="💬"
            color="bg-purple-500"
          />
          <StatCard
            label="平均質問/セッション"
            value={Math.round(overallAnalysis.totalQuestions / sessionAnalyses.length)}
            icon="📊"
            color="bg-amber-500"
          />
        </div>
      </div>

      {/* トピック分布 */}
      {overallAnalysis.topicDistribution.length > 0 && (
        <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">主要トピック分布</h3>
          <div className="space-y-3">
            {overallAnalysis.topicDistribution.map((topic, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{topic.topic}</span>
                  <span className="text-gray-500">
                    {topic.count}件 ({topic.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${topic.percentage}%`,
                      backgroundColor: getTopicColor(topic.topic),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* キーワードクラウド */}
      <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4">頻出キーワード</h3>
        <div className="flex flex-wrap gap-2">
          {overallAnalysis.topKeywords.slice(0, 30).map((kw, index) => {
            const fontSize = Math.max(12, Math.min(24, 12 + kw.count * 0.5));
            const opacity = Math.max(0.5, Math.min(1, 0.5 + kw.count * 0.05));
            return (
              <span
                key={index}
                className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                style={{
                  fontSize: `${fontSize}px`,
                  opacity,
                }}
                title={`${kw.count}回出現`}
              >
                {kw.keyword}
              </span>
            );
          })}
        </div>
      </div>

      {/* 最も活発な議員 */}
      {overallAnalysis.mostActiveMembers.length > 0 && (
        <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">質問数ランキング</h3>
          <div className="space-y-3">
            {overallAnalysis.mostActiveMembers.slice(0, 5).map((member, index) => (
              <div key={index} className="flex items-center gap-4">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0
                      ? 'bg-yellow-500'
                      : index === 1
                      ? 'bg-gray-400'
                      : index === 2
                      ? 'bg-amber-600'
                      : 'bg-gray-300'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{member.member}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-green-500 h-full rounded-full"
                      style={{
                        width: `${(member.questionCount / overallAnalysis.mostActiveMembers[0].questionCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-lg font-bold text-green-600">
                  {member.questionCount}
                  <span className="text-sm text-gray-500 ml-1">質問</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最も多く答弁した役職 */}
      {overallAnalysis.mostActiveAnswerers.length > 0 && (
        <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">答弁数ランキング</h3>
          <div className="space-y-3">
            {overallAnalysis.mostActiveAnswerers.slice(0, 5).map((answerer, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{answerer.answerer}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-purple-500 h-full rounded-full"
                      style={{
                        width: `${(answerer.answerCount / overallAnalysis.mostActiveAnswerers[0].answerCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-lg font-bold text-purple-600">
                  {answerer.answerCount}
                  <span className="text-sm text-gray-500 ml-1">答弁</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* セッション別詳細 */}
      <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4">セッション別詳細</h3>
        <div className="space-y-6">
          {sessionAnalyses.map((session, index) => (
            <div
              key={index}
              className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-lg text-gray-800">{session.councilMember}</h4>
                  <div className="flex gap-3 mt-1">
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                      質問 {session.questionCount}
                    </span>
                    <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      答弁 {session.answerCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* トピック */}
              {session.mainTopics.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-gray-600 mb-1">主なトピック:</div>
                  <div className="flex flex-wrap gap-2">
                    {session.mainTopics.map((topic, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: getTopicColor(topic) }}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* キーワード */}
              {session.keywords.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-gray-600 mb-1">キーワード:</div>
                  <div className="flex flex-wrap gap-1">
                    {session.keywords.slice(0, 8).map((kw, i) => (
                      <span
                        key={i}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                      >
                        {kw.keyword} ({kw.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 質問プレビュー */}
              {session.questionPreviews.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-gray-600 mb-1">質問内容:</div>
                  <div className="space-y-1">
                    {session.questionPreviews.map((preview, i) => (
                      <div key={i} className="text-sm text-gray-700 bg-white p-2 rounded border-l-2 border-green-400">
                        {preview}...
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 答弁者 */}
              {session.answerSummary.length > 0 && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">答弁者:</div>
                  <div className="flex flex-wrap gap-2">
                    {session.answerSummary.map((ans, i) => (
                      <span
                        key={i}
                        className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded"
                      >
                        {ans.answerer} ({ans.count}回)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <div className={`${color} text-white px-2 py-1 rounded text-xs font-bold`}>統計</div>
      </div>
      <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
