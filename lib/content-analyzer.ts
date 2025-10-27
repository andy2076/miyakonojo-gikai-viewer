/**
 * 質疑応答内容の分析ユーティリティ
 */

import { QuestionAnswerSession, Statement } from './session-parser';

export interface KeywordFrequency {
  keyword: string;
  count: number;
  category?: string;
}

export interface TopicCategory {
  name: string;
  keywords: string[];
  color: string;
}

export interface SessionAnalysis {
  member: string; // card-generatorと統一
  councilMember: string;
  questionCount: number;
  answerCount: number;
  mainTopics: string[];
  topics: string[]; // card-generatorと統一
  keywords: KeywordFrequency[];
  questionPreviews: string[];
  answerSummary: {
    answerer: string;
    count: number;
  }[];
  // 質問と答弁の詳細データを追加
  questions: Array<{ speaker: string; text: string }>;
  answers: Array<{ speaker: string; text: string }>;
}

export interface OverallAnalysis {
  totalQuestions: number;
  totalAnswers: number;
  topKeywords: KeywordFrequency[];
  topicDistribution: {
    topic: string;
    count: number;
    percentage: number;
  }[];
  mostActiveMembers: {
    member: string;
    questionCount: number;
  }[];
  mostActiveAnswerers: {
    answerer: string;
    answerCount: number;
  }[];
}

/**
 * トピックカテゴリの定義
 */
const TOPIC_CATEGORIES: TopicCategory[] = [
  {
    name: '健康・福祉',
    keywords: ['健康', '福祉', '介護', '医療', '病院', '保健', 'ワクチン', 'コロナ', '感染'],
    color: '#10b981', // green
  },
  {
    name: '教育',
    keywords: ['教育', '学校', '児童', '生徒', '学習', '給食', '子ども', '保育'],
    color: '#3b82f6', // blue
  },
  {
    name: '都市整備・インフラ',
    keywords: ['道路', '交通', '公園', '施設', '整備', 'インフラ', '建設', '開発'],
    color: '#f59e0b', // amber
  },
  {
    name: '経済・産業',
    keywords: ['経済', '産業', '商業', '観光', '企業', '雇用', '就労', 'ビジネス'],
    color: '#8b5cf6', // purple
  },
  {
    name: '環境',
    keywords: ['環境', 'ごみ', '廃棄物', 'リサイクル', '自然', '気候', '公害'],
    color: '#22c55e', // lime
  },
  {
    name: '防災・安全',
    keywords: ['防災', '災害', '地震', '避難', '消防', '安全', '防犯', '警察'],
    color: '#ef4444', // red
  },
  {
    name: '行政・財政',
    keywords: ['予算', '財政', '税', '行政', '市政', '条例', '議会', '市長'],
    color: '#6366f1', // indigo
  },
];

/**
 * 日本語のストップワード（除外する一般的な単語）
 */
const STOP_WORDS = new Set([
  'こと', 'もの', 'ため', 'よう', 'これ', 'それ', 'あれ', 'どれ',
  'です', 'ます', 'ました', 'ません', 'ある', 'いる', 'なる', 'する',
  'できる', 'ください', 'おります', 'おる', 'いただく', 'れる', 'られる',
  'せる', 'させる', 'ない', 'たい', 'そう', 'らしい', 'みたい',
  'について', 'における', 'として', 'により', 'から', 'まで', 'など',
  'また', 'さらに', 'しかし', 'ただし', 'なお', 'では',
]);

/**
 * テキストからキーワードを抽出
 */
export function extractKeywords(text: string, minLength: number = 2): KeywordFrequency[] {
  // カタカナ、漢字、ひらがなの連続を抽出
  const pattern = /[一-龠ぁ-んァ-ヴー]+/g;
  const matches = text.match(pattern) || [];

  const keywordMap = new Map<string, number>();

  matches.forEach((word) => {
    // 短すぎる単語、ストップワードを除外
    if (word.length < minLength || STOP_WORDS.has(word)) {
      return;
    }

    const count = keywordMap.get(word) || 0;
    keywordMap.set(word, count + 1);
  });

  // 頻度順にソート
  return Array.from(keywordMap.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * トピックを分類
 */
export function categorizeTopics(keywords: KeywordFrequency[]): string[] {
  const topicScores = new Map<string, number>();

  TOPIC_CATEGORIES.forEach((category) => {
    let score = 0;
    keywords.forEach((kw) => {
      if (category.keywords.some((ck) => kw.keyword.includes(ck) || ck.includes(kw.keyword))) {
        score += kw.count;
      }
    });
    if (score > 0) {
      topicScores.set(category.name, score);
    }
  });

  // スコア順にソート
  return Array.from(topicScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);
}

/**
 * セッション単位の分析
 */
export function analyzeSession(session: QuestionAnswerSession): SessionAnalysis {
  const questions = session.statements.filter((s) => s.type === 'question');
  const answers = session.statements.filter((s) => s.type === 'answer');

  // 全テキストを結合してキーワード抽出
  const allText = session.statements.map((s) => s.text).join(' ');
  const keywords = extractKeywords(allText, 2).slice(0, 20); // 上位20個

  // トピック分類
  const mainTopics = categorizeTopics(keywords).slice(0, 3); // 上位3つ

  // 質問のプレビュー（最初の3つ）
  const questionPreviews = questions
    .slice(0, 3)
    .map((q) => q.text.substring(0, 100).replace(/\n/g, ' '));

  // 答弁者のサマリー
  const answererMap = new Map<string, number>();
  answers.forEach((a) => {
    const count = answererMap.get(a.speaker) || 0;
    answererMap.set(a.speaker, count + 1);
  });

  const answerSummary = Array.from(answererMap.entries())
    .map(([answerer, count]) => ({ answerer, count }))
    .sort((a, b) => b.count - a.count);

  // 質問と答弁の詳細データを構築
  const questionDetails = questions.map((q) => ({
    speaker: q.speaker,
    text: q.text,
  }));

  const answerDetails = answers.map((a) => ({
    speaker: a.speaker,
    text: a.text,
  }));

  return {
    member: session.councilMember, // card-generatorと統一
    councilMember: session.councilMember,
    questionCount: questions.length,
    answerCount: answers.length,
    mainTopics,
    topics: mainTopics, // card-generatorと統一
    keywords: keywords.slice(0, 10), // 上位10個
    questionPreviews,
    answerSummary,
    questions: questionDetails,
    answers: answerDetails,
  };
}

/**
 * 全体の分析
 */
export function analyzeOverall(sessions: QuestionAnswerSession[]): OverallAnalysis {
  let totalQuestions = 0;
  let totalAnswers = 0;
  const allKeywords: KeywordFrequency[] = [];
  const memberQuestionCounts = new Map<string, number>();
  const answererCounts = new Map<string, number>();
  const topicCounts = new Map<string, number>();

  sessions.forEach((session) => {
    const analysis = analyzeSession(session);

    totalQuestions += analysis.questionCount;
    totalAnswers += analysis.answerCount;

    // キーワードを集計
    allKeywords.push(...analysis.keywords);

    // 議員の質問数
    memberQuestionCounts.set(session.councilMember, analysis.questionCount);

    // 答弁者の集計
    analysis.answerSummary.forEach(({ answerer, count }) => {
      const current = answererCounts.get(answerer) || 0;
      answererCounts.set(answerer, current + count);
    });

    // トピックの集計
    analysis.mainTopics.forEach((topic) => {
      const count = topicCounts.get(topic) || 0;
      topicCounts.set(topic, count + 1);
    });
  });

  // キーワードを統合して上位を抽出
  const keywordMap = new Map<string, number>();
  allKeywords.forEach(({ keyword, count }) => {
    const current = keywordMap.get(keyword) || 0;
    keywordMap.set(keyword, current + count);
  });

  const topKeywords = Array.from(keywordMap.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30); // 上位30個

  // トピック分布
  const totalTopics = Array.from(topicCounts.values()).reduce((a, b) => a + b, 0);
  const topicDistribution = Array.from(topicCounts.entries())
    .map(([topic, count]) => ({
      topic,
      count,
      percentage: Math.round((count / totalTopics) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // 最も活発な議員
  const mostActiveMembers = Array.from(memberQuestionCounts.entries())
    .map(([member, questionCount]) => ({ member, questionCount }))
    .sort((a, b) => b.questionCount - a.questionCount)
    .slice(0, 10);

  // 最も多く答弁した人
  const mostActiveAnswerers = Array.from(answererCounts.entries())
    .map(([answerer, answerCount]) => ({ answerer, answerCount }))
    .sort((a, b) => b.answerCount - a.answerCount)
    .slice(0, 10);

  return {
    totalQuestions,
    totalAnswers,
    topKeywords,
    topicDistribution,
    mostActiveMembers,
    mostActiveAnswerers,
  };
}

/**
 * トピックカテゴリの色を取得
 */
export function getTopicColor(topicName: string): string {
  const category = TOPIC_CATEGORIES.find((c) => c.name === topicName);
  return category?.color || '#6b7280'; // デフォルトはグレー
}
