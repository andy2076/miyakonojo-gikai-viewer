'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function MeetingTopicsPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = decodeURIComponent(params.meetingId as string);
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 会議データの定義
  const meetingDataMap: Record<string, any> = {
    '令和4年第5回定例会': {
      title: '令和4年第5回定例会 審議内容まとめ',
      date: '令和4年12月16日',
      description: '令和4年12月16日に開かれた都城市議会では、物価高騰対策や台風14号被害への対応を中心とした補正予算約97億円が可決されました。また、市職員の給与改定や定年延長に関する条例改正も決定されました。',
      topics: [
      {
        title: '緊急支援',
        description: '物価高・台風被害への対応 補正予算：約97億円',
        items: [
          {
            subtitle: '専決処分（緊急対応）の事後承認',
            content: '市長が議会を待たずに緊急対応した案件を事後承認しました。具体的には、台風14号による災害復旧工事費として、約3億4,000万円の補正予算を専決処分で執行したものです。これにより、被災した道路や河川の迅速な復旧が可能となりました。',
            result: '全会一致で承認'
          },
          {
            subtitle: '一般会計補正予算（第9号）',
            budget: '97億301万円追加',
            content: '総務費（ふるさと納税の基金積立金など）：約84億円\n災害復旧費（台風14号による復旧工事費）：約7億円\nその他、物価高騰対策や公共施設の修繕費など',
            result: '全会一致で可決'
          }
        ]
      },
      {
        title: '給与・人事制度の改定',
        description: '市職員の給与改定と定年延長',
        items: [
          {
            subtitle: '職員給与の改定',
            content: '人事院勧告に基づき、市職員の給与を改定しました。初任給を4,000円引き上げるほか、若年層を中心に給与水準を引き上げ、人材確保と職員の士気向上を図ります。',
            result: '全会一致で可決'
          },
          {
            subtitle: '定年延長の実施',
            content: '国家公務員に準じて、市職員の定年を段階的に65歳まで引き上げます。令和5年度から2年ごとに1歳ずつ引き上げ、令和13年度に65歳となります。これにより、豊富な経験と知識を持つ職員の活用を図ります。',
            result: '全会一致で可決'
          }
        ]
      },
      {
        title: 'その他の条例改正',
        description: '各種条例の整備',
        items: [
          {
            subtitle: '企業立地促進条例の改正',
            content: '企業誘致を促進するため、奨励措置を拡充しました。新たに対象となる業種を追加し、地域経済の活性化を図ります。',
            result: '全会一致で可決'
          },
          {
            subtitle: 'デジタル田園都市国家構想交付金事業',
            content: '国のデジタル田園都市国家構想に基づき、地域のデジタル化を推進する事業を実施します。具体的には、行政手続きのオンライン化や、地域企業のDX支援などを行います。',
            result: '全会一致で可決'
          }
        ]
      }
    ],
    summary: [
      '物価高騰と台風被害への迅速な対応として、約97億円の補正予算が可決されました',
      '市職員の給与改定により、初任給を4,000円引き上げ、若年層の給与水準を改善しました',
      '定年を段階的に65歳まで引き上げることで、経験豊富な職員の活用を図ります',
      '企業誘致の促進や地域のデジタル化推進など、地域経済活性化に向けた施策が決定されました'
    ],
    supplementaryBudget: {
      total: 9700301000,
      breakdown: [
        { category: 'ふるさと納税基金積立', amount: 8400000000, color: '#3B82F6' },
        { category: '災害復旧費', amount: 700000000, color: '#EF4444' },
        { category: '物価高騰対策', amount: 400000000, color: '#10B981' },
        { category: 'その他', amount: 200301000, color: '#F59E0B' }
      ]
    },
    totalBudgetAfter: 116500000000
    },
    '令和4年第2回定例会': {
      title: '令和4年第2回定例会 審議内容まとめ',
      date: '令和4年2月22日 - 3月22日',
      description: '令和4年2月22日から3月22日まで29日間開催された第2回定例会では、令和3年度の補正予算や令和4年度当初予算、組織改正に伴う条例整備などが審議されました。',
      topics: [
        {
          title: '予算審議',
          description: '令和3年度補正予算および令和4年度当初予算',
          items: [
            {
              subtitle: '令和3年度一般会計補正予算（第10号）',
              content: '国・県支出金や事業費の確定等に伴う補正として、約91億3,350万円を増額し、補正後の予算総額を1,214億7,496万6千円としました。主な補正は、総務費（基金積立等）、民生費、土木費、商工費、農林水産業費などです。',
              result: '委員会審査を経て可決'
            },
            {
              subtitle: '令和4年度当初予算',
              content: '令和4年度都城市一般会計予算（議案第21号）および各特別会計・事業会計予算（議案第22号〜第33号）が審議され、一括して採決されました。',
              result: '全て可決'
            }
          ]
        },
        {
          title: '制度・条例の改正',
          description: '組織変更、育児休業、子育て支援関連',
          items: [
            {
              subtitle: '組織変更に伴う条例整理',
              content: '令和4年度の組織見直しに伴い、関係条例の整備が行われました。',
              result: '可決'
            },
            {
              subtitle: '育児休業条例の改正',
              content: '育児休業取得要件の見直しが行われ、職員の育児と仕事の両立支援が強化されました。',
              result: '可決'
            },
            {
              subtitle: '保育所・子育て支援条例の改正',
              content: '特定教育・保育施設の基準改正や地域子育て支援センター条例の改正が審議され、子育て支援体制が整備されました。',
              result: '可決'
            }
          ]
        },
        {
          title: '職員給与関連',
          description: '人事院勧告に基づく給与改定',
          items: [
            {
              subtitle: '職員給与・期末手当の改正',
              content: '人事院勧告に準じた職員給与・期末手当等の一部改正が議論されました。賛否の討論がありました。',
              result: '可決'
            }
          ]
        },
        {
          title: '公共事業',
          description: '工事契約や施設管理',
          items: [
            {
              subtitle: '公共下水道・廃棄物処分場等の工事',
              content: '公共下水道や廃棄物処分場等の工事契約および議決事項の変更が審議されました。',
              result: '可決'
            }
          ]
        }
      ],
      summary: [
        '補正予算で約91億円増額し、社会資本や基金積立が強化されました',
        '育児・保育関係の制度整備により、地域の子育て支援が向上しました',
        '職員制度の見直しについては議論がありましたが、可決されました',
        '工業用地・産業振興の補正も実施され、企業誘致や産業支援に備えました'
      ]
    },
    '令和4年第3回定例会': {
      title: '令和4年第3回定例会 審議内容まとめ',
      date: '令和4年6月6日 - 6月23日',
      description: '令和4年6月6日から23日までの18日間にわたり開催された第3回定例会では、コロナ禍における市民生活支援や物価高騰対策のための補正予算、職員の公務災害補償、公共施設整備契約などが審議されました。',
      topics: [
        {
          title: '緊急支援',
          description: 'コロナ禍と物価高騰への対応 補正予算総額：約24億円',
          items: [
            {
              subtitle: '一般会計補正予算（第二号）',
              budget: '2億9,012万9,000円追加',
              content: '新型コロナウイルス感染症の影響が長期化する中、低所得の子育て世帯に対し「子育て世帯生活支援特別給付金」を給付するために必要な経費を計上。財源は国庫支出金。',
              result: '賛成多数で可決'
            },
            {
              subtitle: '一般会計補正予算（第三号）',
              budget: '7億9,772万6,000円追加',
              content: '総務費（+4.1億円）：本庁舎北別館改修整備事業費、ウクライナ避難民支援基金、デジタル化推進事業費の増額\n衛生費（+2.2億円）：新型コロナウイルスワクチン接種費の増額、小・中学校の新型コロナウイルス対策費\n民生費（+6,581万円）：ウクライナ避難民支援事業費、新型コロナウイルス感染症生活困窮者自立支援金支給事業費等の増額\n教育費（+6,410万円）：小・中学校の新型コロナウイルス対策に係る教材整備事業費等',
              result: '全会一致で原案可決'
            },
            {
              subtitle: '一般会計補正予算（第四号）',
              budget: '14億161万6,000円追加',
              content: 'コロナ禍における原油価格・物価高騰等総合緊急対策への対応として以下を実施：\n1. 住民税非課税世帯等に対する臨時特別給付金（一世帯あたり10万円、約3,000世帯、3億円を計上）\n2. 都城市プレミアム付スマイル商品券発行事業（第三弾）：発行数を8万セットから16万セットへ増加\n3. 原油・原材料高対策特別貸付の利子補給金（中小企業支援）',
              result: '全会一致で原案可決'
            }
          ]
        },
        {
          title: '制度・条例変更',
          description: '市民生活と行政運営のルール見直し',
          items: [
            {
              subtitle: '専決処分（事後承認）',
              content: '都城市税条例等の一部改正（住宅ローン控除見直し、固定資産税の負担調整措置など）、都城市消防団員等公務災害補償条例の一部改正（介護補償額の改定等）、都城市国民健康保険税条例の一部改正（賦課限度額の改定）など、緊急を要する条例改正が専決処分され、事後承認されました。',
              result: '承認（一部は賛成多数、一部は全会一致）'
            },
            {
              subtitle: '都城市手数料条例の一部改正',
              content: '住民基本台帳法の改正に伴い、除票等の保管期間が5年間から150年間に延長されたため、除票の写し等の交付に係る手数料を新たに規定しました。',
              result: '全会一致で可決'
            },
            {
              subtitle: 'ウクライナ避難民支援基金条例の制定',
              content: 'ウクライナからの避難民受入れ表明に伴い、市に寄せられる生活支援のための指定寄附金を適正に管理するため、新たに条例を制定しました。',
              result: '全会一致で可決'
            },
            {
              subtitle: '地方活力向上地域における固定資産税の不均一課税に関する条例の一部改正',
              content: '地方活力向上地域等特定業務施設整備計画の認定を受ける期間の延長及び税制措置の適用対象である特別償却設備の整備期限を延長しました。',
              result: '全会一致で可決'
            }
          ]
        },
        {
          title: 'インフラ整備',
          description: '施設整備と財産取得',
          items: [
            {
              subtitle: '山之口総合支所複合施設整備事業',
              content: '（仮称）山之口地域交流センター耐震補強・大規模改造（建築主体）工事の請負契約を締結しました。',
              result: '全会一致で可決'
            },
            {
              subtitle: '財産の取得',
              content: '高規格救急自動車および小型動力ポンプ付積載車の取得について議決されました。',
              result: '全会一致で可決'
            },
            {
              subtitle: '工業用地造成事業特別会計補正予算',
              content: '都城インター第三工業団地に係る工業用地造成事業費として、1億2,993万2,000円を追加。用地取得業務委託料や補償費に充当されます。',
              result: '全会一致で可決'
            }
          ]
        },
        {
          title: 'その他の主要議論',
          description: '地域活性化、スポーツ、環境対策',
          items: [
            {
              subtitle: '地域活性化・移住定住策',
              content: '山之口、山田地区が新たに過疎地域に指定され、令和3年度策定の「都城市過疎地域持続的発展計画」に両地区を含める改定作業を進めています。令和3年度の移住者実績は179世帯、362人で過去最高となり、世帯主の7割超が20〜40歳代の子育て世代でした。',
              result: '報告事項'
            },
            {
              subtitle: 'スポーツランド都城',
              content: '来春、読売ジャイアンツのファームキャンプが高城運動公園で行われることが報告されました。高城運動公園の改修費（約5,890万円）が補正予算に計上され、山之口運動公園や都城運動公園の整備も令和6〜7年度の供用開始に向けて進められています。',
              result: '報告事項'
            },
            {
              subtitle: 'スケートボードパーク建設請願',
              content: '既存施設の老朽化と利用者の増加に伴う危険性、本格的な練習環境の不足を理由に新たなスケートボードパークの建設が請願されましたが、請願者側の組織体制が整っていないという認識が多数を占め、不採択となりました。',
              result: '賛成少数で不採択'
            }
          ]
        }
      ],
      summary: [
        '3回の補正予算で総額約24億円を追加し、コロナ禍と物価高騰への緊急対策を実施',
        'ウクライナ避難民支援基金条例を制定し、人道支援の体制を整備',
        '移住者数が過去最高を記録し、子育て世代の流入が顕著に',
        '読売ジャイアンツファームキャンプ誘致など、スポーツランド都城の取り組みが進展'
      ]
    },
    '令和4年第4回定例会': {
      title: '令和4年第4回定例会 審議内容まとめ',
      date: '令和4年9月9日 - 10月4日',
      description: '令和4年9月9日から10月4日にかけて開催された定例会では、台風14号や物価高騰に対応するための複数の補正予算が緊急上程されました。また、令和3年度の決算認定13件について集中的な審議が行われました。',
      topics: [
        {
          title: '緊急対応・経済対策',
          description: '台風14号災害と物価高騰への対応 補正予算4件',
          items: [
            {
              subtitle: '一般会計補正予算（第5号）',
              content: '物価高騰対策（飼料価格高騰対策、省エネ設備導入支援など）、マイナンバーカード普及促進事業費（QUOカード配布）、山之口運動公園整備事業費を計上しました。',
              result: '賛成多数で可決（マイナンバー事業に反対討論あり）'
            },
            {
              subtitle: '一般会計補正予算（第6号）',
              content: '新型コロナウイルス・オミクロン株対応ワクチン接種費、7月豪雨に伴う単独耕地災害復旧費を計上しました。',
              result: '賛成多数で可決'
            },
            {
              subtitle: '一般会計補正予算（第7号）',
              budget: '6億4,484万6千円',
              content: '台風14号災害の復旧費として、市有財産・公立学校施設・社会教育施設等の災害復旧に必要な経費を計上しました。',
              result: '賛成多数で可決'
            },
            {
              subtitle: '一般会計補正予算（第8号）',
              content: '電力・ガス・食料品等価格高騰緊急支援給付金（低所得世帯向け）、台風14号被災世帯への災害見舞金の拡充を実施しました。災害見舞金は大規模半壊で最大45万円、全壊で最大60万円に拡充され、他制度との併用が可能となりました。',
              result: '賛成多数で可決'
            }
          ]
        },
        {
          title: '条例・契約・土地利用',
          description: '育児休業制度の改正、公共施設の整備',
          items: [
            {
              subtitle: '職員育児休業等条例の改正',
              content: '国家公務員の措置に準じ、男性職員の育児休業促進および会計年度任用職員の育休取得要件を柔軟化しました。',
              result: '全会一致で可決'
            },
            {
              subtitle: '歴史資料館等条例の改正',
              content: '都城歴史資料館、都城島津邸など4施設の入館料減免・不徴収の範囲を条例に具体的に位置づけ、手続の適正化を図りました。',
              result: '全会一致で可決'
            },
            {
              subtitle: '都市公園条例の改正',
              content: '国民スポーツ大会に向けた都城運動公園テニスコート（16面）整備に伴い、シャワー室の使用料を規定。山之口運動公園の公園予定区域を設定しました。',
              result: '全会一致で可決'
            },
            {
              subtitle: '過疎地域持続的発展計画の改定',
              content: '令和2年国勢調査結果に基づき、山之口地区及び山田地区が過疎地域とみなされたことに伴い、計画を改定しました。',
              result: '全会一致で可決'
            },
            {
              subtitle: '乙房小校舎新増改築工事',
              content: '乙房小学校の校舎新増改築（建築主体）工事の請負契約を締結しました。',
              result: '全会一致で可決'
            }
          ]
        },
        {
          title: '決算認定',
          description: '令和3年度決算13件の認定',
          items: [
            {
              subtitle: '一般会計決算（議案第123号）',
              content: '令和3年度の一般会計歳入歳出決算を認定しました。都城夜間急病センターの利用状況や学校給食の異物混入対応などが審査ポイントとなりました。',
              result: '賛成多数で認定'
            },
            {
              subtitle: '国民健康保険特別会計決算（議案第124号）',
              content: '令和3年度の国民健康保険特別会計歳入歳出決算を認定しました。決算が剰余金（黒字）となったものの、所得200万円以下の世帯で滞納が多い現状に対し、剰余金を均等割の国保税引き下げに活用すべきではないかという意見が出ました。',
              result: '賛成多数で認定（一部反対討論あり）'
            },
            {
              subtitle: 'その他特別会計・事業会計決算（11件）',
              content: '各種特別会計および事業会計の令和3年度決算が認定されました。工業用地造成事業や温泉施設の民間公募状況などが報告されました。',
              result: '全て認定'
            }
          ]
        },
        {
          title: '一般質問の主要テーマ',
          description: '農政、ふるさと納税、災害対策など',
          items: [
            {
              subtitle: '農政と工業団地造成',
              content: '農業振興地域整備計画において、白地の農地を青地の農用地区域へ編入する事業が計画されたことに対し、地権者から強い反対が起こっていることが議論されました。一方、都城インター工業団地（穂満坊・桜木地区）では約342筆の農地が取得されたことが報告されました。',
              result: '継続審議'
            },
            {
              subtitle: 'ふるさと納税の返礼品問題',
              content: 'ウナギの返礼品について、地場産品基準を満たしているかという市民からの疑問に対し、市は市内事業者が市外で生産された原材料を使用し市内で加工・品質保守を一元管理しているため、総務省告示に基づいて地場産品として認められていると説明しました。',
              result: '説明実施'
            },
            {
              subtitle: '旧統一協会関連イベントへの名義後援',
              content: '「PEACE ROAD 2022 in 宮崎」について都城市が名義後援を承認していたことが確認されました。市は7月30日付の報道で初めて主催団体が旧統一協会の関連団体であることを把握したとし、今後は慎重に判断するとしました。',
              result: '今後の対応方針を表明'
            },
            {
              subtitle: '災害時の医療情報共有とマイナンバー活用',
              content: 'マイナンバーカードを活用した救急業務の迅速化に関する実証実験に都城市が採択され（全国6消防本部の一つ）、10月上旬から12月下旬に実施予定となりました。',
              result: '実証実験を実施予定'
            }
          ]
        }
      ],
      summary: [
        '台風14号災害復旧費など4件の補正予算を可決し、迅速な災害対応を実施',
        '災害見舞金制度を拡充し、大規模半壊で最大45万円、全壊で最大60万円に引き上げ',
        '令和3年度決算13件を認定し、事業の適正性を確認',
        '男性職員の育児休業促進など、働き方改革を推進する条例改正を実施'
      ]
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

  // meetingIdに対応するデータを取得
  const meetingData = meetingDataMap[meetingId];

  // データが存在しない場合は404表示
  if (!meetingData) {
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
                  補正予算（第9号）の内訳
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
                    補正後の令和4年度予算
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
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {highlightText('約97億円の補正予算により、令和4年度の総予算は約1,165億円となりました。主にふるさと納税の基金積立金（約84億円）と台風14号の災害復旧費（約7億円）が大きな割合を占めています。')}
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
              className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-purple-100 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {highlightText(topic.title)}
                  </h2>
                  <p className="text-purple-600 font-semibold">
                    {highlightText(topic.description)}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {topic.items.map((item: any, itemIdx: number) => (
                  <div
                    key={itemIdx}
                    className="border-l-4 border-purple-300 pl-6 py-2"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {highlightText(item.subtitle)}
                    </h3>
                    {item.budget && (
                      <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold mb-3">
                        {highlightText(`予算: ${item.budget}`)}
                      </div>
                    )}
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line mb-3">
                      {highlightText(item.content)}
                    </div>
                    {item.result && (
                      <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
                        {highlightText(item.result)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
