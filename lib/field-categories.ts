/**
 * 分野（ジャンル）の定義とタグの対応表
 *
 * トップページの「分野から探す」は12分野の名称でリンクしているが、
 * question_cards.gpt_field_tags には会期によって
 *   - 短いタグ（教育／行政／防災 …）… 令和4年〜令和7年第3回
 *   - 12分野に対応した短いタグ … 令和7年第4回以降
 * が入っており、themes[].field_tag には令和7年第4回以降のみ12分野名が入っている。
 *
 * そのため分野で絞り込む際は「12分野名 + それに対応する短いタグ」に展開して検索する。
 */

export interface FieldCategory {
  name: string;
  icon: string;
  color: string;
}

/** トップページ「分野から探す」に並べる12分野 */
export const FIELD_CATEGORIES: FieldCategory[] = [
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
];

/** 12分野 -> gpt_field_tags に実際に入っている短いタグ */
export const CATEGORY_TAG_MAP: Record<string, string[]> = {
  '子育て・教育': ['子育て', '教育', '食育'],
  '地域振興': ['地域振興', '地域活性化', '定住', '観光', '文化'],
  '防災・減災': ['防災'],
  'デジタル化推進': ['デジタル化', 'DX', '科学技術'],
  '農業・畜産': ['農業'],
  '環境・エネルギー': ['環境'],
  '福祉': ['福祉'],
  '高齢者福祉': ['高齢者'],
  '男女共同参画': ['男女共同参画'],
  '行政改革': ['行政', '組織', '財政', '法令'],
  '医療・健康': ['医療', '健康'],
  '都市計画': ['インフラ', 'まちづくり', '交通'],
};

/**
 * 絞り込みに使うタグ一覧へ展開する。
 * 12分野以外（ランキングから渡ってくる短いタグなど）はそのまま返す。
 */
export function expandCategory(category: string): string[] {
  const mapped = CATEGORY_TAG_MAP[category] || [];
  return Array.from(new Set([category, ...mapped]));
}

/** テーマ（themes の1要素）が指定分野に該当するか */
export function themeMatchesCategory(
  theme: { tags?: string[] | null; field_tag?: string | null },
  category: string
): boolean {
  const wanted = new Set(expandCategory(category));
  if (theme.field_tag && wanted.has(theme.field_tag)) return true;
  return (theme.tags || []).some((t) => wanted.has(t));
}
