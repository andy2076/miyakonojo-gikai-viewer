/**
 * データベース型定義
 */

/**
 * 議会日程マスターテーブル
 */
export interface Meeting {
  id: string;
  title: string;
  meeting_date: string | null;
  description: string | null;
  published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * 議事録ファイルテーブル
 */
export interface MinutesFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  file_path: string | null;
  session_date: string | null;
  fiscal_year: number | null;
  session_type: string | null;
  uploaded_at: string;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  published: boolean;
  meeting_date: string | null;
  meeting_title: string | null;
  meeting_id: string | null;
  analysis_data: any;
}

/**
 * ファイルアップロード用の型
 */
export interface UploadFileData {
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
}

/**
 * ファイル統計情報
 */
export interface FileStats {
  total: number;
  pending: number;
  completed: number;
}

/**
 * テーマの型定義
 */
export interface Theme {
  theme_number: string;
  theme_title: string;
  question_point: string;
  answer_point: string;
  discussion_point: string | null;
  affected_people: string | null;
}

/**
 * 質問カードテーブル
 */
export interface QuestionCardRecord {
  id: string;
  minute_file_id: string;
  member_name: string;
  question_index: number;
  question_text: string;
  question_summary: string | null;
  answer_texts: string[];
  answerers: string[];
  answer_summary: string | null;
  full_content: string;
  content_data: any;
  topics: string[];
  keywords: any;
  meeting_date: string | null;
  meeting_title: string | null;
  meeting_id: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  // GPT分析データ（旧形式：下位互換性のため残す）
  faction: string | null;
  theme_title: string | null;
  gpt_question_point1: string | null;
  gpt_answer_point1: string | null;
  gpt_question_point2: string | null;
  gpt_answer_point2: string | null;
  gpt_question_point3: string | null;
  gpt_answer_point3: string | null;
  gpt_discussion_point: string | null;
  gpt_affected_people: string | null;
  gpt_field_tags: string[] | null;
  gpt_nature_tags: string[] | null;
  // 新形式：テーマ配列
  themes: Theme[] | null;
  // 閲覧数
  view_count: number | null;
}

/**
 * CSV行の型定義
 */
export interface GPTAnalysisCSVRow {
  '議員名': string;
  '会派': string;
  'テーマ番号': string;
  'テーマタイトル': string;
  'テーマ'?: string;
  '大項目'?: string;
  '小項目'?: string;
  '質問のポイント': string;
  '質問の要点'?: string;
  '回答のポイント': string;
  '答弁の要点'?: string;
  '議論のポイント（なぜ重要か）': string;
  '議論のポイント（なぜ重要か？）'?: string;
  'なぜ重要か（ポイント）'?: string;
  'なぜ重要か'?: string;
  '影響を受ける人': string;
  '分野タグ': string;
  '性質タグ': string;
  // インデックスシグネチャでその他のフィールドも許可
  [key: string]: string | undefined;
}

/**
 * 可決トピック（議会審議内容まとめ）テーブル
 */
export interface MeetingTopic {
  id: string;
  meeting_id: string | null;
  meeting_title: string;
  title: string;
  date: string | null;
  description: string | null;
  content_data: any; // JSON形式でトピックデータを保存
  summary: string[] | null;
  supplementary_budget: any | null; // 補正予算データ
  total_budget_after: number | null;
  published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * 可決トピックのコンテンツデータ型
 */
export interface TopicContentData {
  topics: Array<{
    title: string;
    description: string;
    items: Array<{
      subtitle: string;
      content: string;
      budget?: string;
      result?: string;
    }>;
  }>;
}
