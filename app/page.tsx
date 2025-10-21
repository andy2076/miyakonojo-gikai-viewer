export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* メインタイトル */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            都城市議会 見える化
          </h1>

          {/* サブタイトル */}
          <p className="text-xl sm:text-2xl text-gray-700 mb-8 leading-relaxed">
            議員の質問活動を可視化して、透明性の高い議会を実現します
          </p>

          {/* 説明文 */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 sm:p-8 mb-12 border border-gray-100">
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-4">
              都城市議会における各議員の質問回数や内容を、わかりやすく可視化します。
            </p>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-4">
              市民の皆様が議員の活動状況を簡単に把握できるようにすることで、
              より開かれた議会運営と、地方政治への関心向上を目指しています。
            </p>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
              データに基づいた情報提供により、市民と議会をつなぐ架け橋となります。
            </p>
          </div>

          {/* CTAボタン */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              データを見る
            </button>
          </div>

          {/* 特徴セクション */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
              <div className="text-blue-600 text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                わかりやすい可視化
              </h3>
              <p className="text-sm text-gray-600">
                質問回数や内容をグラフで直感的に表示
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
              <div className="text-indigo-600 text-3xl mb-3">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                詳細な検索機能
              </h3>
              <p className="text-sm text-gray-600">
                議員名、テーマ別に質問内容を検索
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
              <div className="text-purple-600 text-3xl mb-3">📈</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                活動の透明性
              </h3>
              <p className="text-sm text-gray-600">
                議員の活動状況を客観的に把握
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-200 bg-white/50 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-600">
            都城市議会可視化プロジェクト - オープンデータで実現する透明な議会
          </p>
        </div>
      </footer>
    </div>
  );
}
