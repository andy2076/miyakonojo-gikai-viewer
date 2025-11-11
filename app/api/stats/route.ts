import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { QuestionCardRecord, Theme } from '@/types/database';

/**
 * テーマタイトルから名詞句を抽出する
 * 例: 「本市における部活動指導員の導入について（部活動指導員について）」
 *  → 「本市における部活動指導員の導入」
 */
function extractNounPhrase(title: string): string | null {
  if (!title || title.trim() === '') return null;

  // 「大項目（小項目）」形式から大項目部分を取得
  const match = title.match(/^(.+?)（.+?）$/);
  const baseTitle = match ? match[1] : title;

  // 末尾の助詞・接続詞を除去
  const cleaned = baseTitle
    .replace(/について$/, '')
    .replace(/に関して$/, '')
    .replace(/に係る$/, '')
    .replace(/への対応$/, '')
    .replace(/への$/, '')
    .replace(/とその課題$/, '')
    .replace(/に対する$/, '')
    .replace(/における$/, '')
    .trim();

  // 2文字未満は除外
  if (cleaned.length < 2) return null;

  return cleaned;
}

/**
 * 会議名から年度を抽出する
 * 例: 「令和４年第２回定例会」→ 「令和４年」（全角数字にも対応）
 */
function extractYearFromMeeting(meetingTitle: string): string | null {
  // 全角数字を半角数字に変換
  const normalized = meetingTitle.replace(/[０-９]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });

  const match = normalized.match(/(令和\d+年|平成\d+年)/);
  if (!match) return null;

  // 元の文字列から該当部分を抽出（全角のまま返す）
  const yearPattern = match[1];
  const fullWidthMatch = meetingTitle.match(new RegExp(yearPattern.replace(/\d/g, '[０-９\\d]')));
  return fullWidthMatch ? fullWidthMatch[0] : match[1];
}

/**
 * サイト全体の統計情報を取得するAPI
 */
export async function GET() {
  try {
    // Supabase設定チェック
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 503 }
      );
    }

    // 全カードデータを取得（公開済みのみ）
    const { data: allCards, error: cardsError } = await supabase
      .from('question_cards')
      .select('*')
      .eq('published', true);

    if (cardsError) {
      console.error('Failed to fetch cards:', cardsError);
      return NextResponse.json(
        { error: 'カードデータの取得に失敗しました' },
        { status: 500 }
      );
    }

    const cards = allCards as QuestionCardRecord[];

    // 公開カード数
    const cardCount = cards.length;

    // 議員数を取得（ユニークなmember_name）
    const uniqueMemberNames = Array.from(new Set(cards.map((c) => c.member_name)));
    const uniqueMembers = uniqueMemberNames.length;

    // トピック数を取得
    const allTopics = new Set<string>();
    cards.forEach((card) => {
      if (card.topics && Array.isArray(card.topics)) {
        card.topics.forEach((topic: string) => allTopics.add(topic));
      }
    });

    // 会議数を取得
    const uniqueMeetings = Array.from(
      new Set(cards.map((c) => c.meeting_title).filter(Boolean))
    ).length;

    // 人気トピックTop10を取得
    const topicCounts = new Map<string, number>();
    cards.forEach((card) => {
      if (card.topics && Array.isArray(card.topics)) {
        card.topics.forEach((topic: string) => {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        });
      }
    });

    const popularTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    // 1. 質問ジャンル（分野タグ）ランキング（年度別）
    type YearTagCounts = Record<string, Record<string, number>>;
    const yearFieldTags: YearTagCounts = {};

    cards.forEach((card) => {
      const year = card.meeting_title ? extractYearFromMeeting(card.meeting_title) : null;
      if (!year) return;

      if (!yearFieldTags[year]) {
        yearFieldTags[year] = {};
      }

      if (card.gpt_field_tags && Array.isArray(card.gpt_field_tags)) {
        card.gpt_field_tags.forEach((tag: string) => {
          yearFieldTags[year][tag] = (yearFieldTags[year][tag] || 0) + 1;
        });
      }
    });

    const fieldTagRankingByYear = Object.entries(yearFieldTags).map(([year, tags]) => ({
      year,
      tags: Object.entries(tags)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10), // Top 10
    }));

    // 年度順にソート（新しい順）
    fieldTagRankingByYear.sort((a, b) => {
      const yearNumA = parseInt(a.year.match(/\d+/)?.[0] || '0', 10);
      const yearNumB = parseInt(b.year.match(/\d+/)?.[0] || '0', 10);
      return yearNumB - yearNumA;
    });

    // 2. 質問テーマ数ランキング（議員別・年度別）
    type YearMemberCounts = Record<string, Record<string, { count: number; faction: string | null }>>;
    const yearMemberThemes: YearMemberCounts = {};

    cards.forEach((card) => {
      const year = card.meeting_title ? extractYearFromMeeting(card.meeting_title) : null;
      if (!year) return;

      if (!yearMemberThemes[year]) {
        yearMemberThemes[year] = {};
      }

      const themeCount = Array.isArray(card.themes) ? card.themes.length : 0;
      if (!yearMemberThemes[year][card.member_name]) {
        yearMemberThemes[year][card.member_name] = { count: 0, faction: card.faction };
      }
      yearMemberThemes[year][card.member_name].count += themeCount;
    });

    const memberThemeRankingByYear = Object.entries(yearMemberThemes).map(([year, members]) => ({
      year,
      members: Object.entries(members)
        .map(([member, data]) => ({ member, count: data.count, faction: data.faction }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10), // Top 10
    }));

    // 年度順にソート（新しい順）
    memberThemeRankingByYear.sort((a, b) => {
      const yearNumA = parseInt(a.year.match(/\d+/)?.[0] || '0', 10);
      const yearNumB = parseInt(b.year.match(/\d+/)?.[0] || '0', 10);
      return yearNumB - yearNumA;
    });

    // 3. 前回議会（最新の会議）の質問テーマカテゴリ
    // meeting_dateでソートして最新の会議を特定
    const sortedByDate = [...cards].sort((a, b) => {
      const dateA = a.meeting_date ? new Date(a.meeting_date).getTime() : 0;
      const dateB = b.meeting_date ? new Date(b.meeting_date).getTime() : 0;
      return dateB - dateA;
    });

    const latestMeetingTitle = sortedByDate[0]?.meeting_title || null;
    const latestMeetingCards = cards.filter(
      (card) => card.meeting_title === latestMeetingTitle
    );

    const latestMeetingTagCount: Record<string, number> = {};
    latestMeetingCards.forEach((card) => {
      if (card.gpt_field_tags && Array.isArray(card.gpt_field_tags)) {
        card.gpt_field_tags.forEach((tag: string) => {
          latestMeetingTagCount[tag] = (latestMeetingTagCount[tag] || 0) + 1;
        });
      }
    });

    const latestMeetingCategories = Object.entries(latestMeetingTagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    // 4. 会派別人数（ユニークな議員数）
    const factionMembers: Record<string, Set<string>> = {};
    cards.forEach((card) => {
      if (card.faction && card.faction.trim()) {
        const faction = card.faction.trim();
        if (!factionMembers[faction]) {
          factionMembers[faction] = new Set();
        }
        factionMembers[faction].add(card.member_name);
      }
    });

    const factionMemberCount = Object.entries(factionMembers)
      .map(([faction, members]) => ({ faction, count: members.size }))
      .sort((a, b) => b.count - a.count);

    // 5. 期間別キーワードランキング（年度別）
    type YearKeywords = Record<string, Record<string, number>>;
    const yearKeywords: YearKeywords = {};

    cards.forEach((card) => {
      // 会議名から年度を抽出
      const year = card.meeting_title ? extractYearFromMeeting(card.meeting_title) : null;
      if (!year) return;

      // 年度ごとのキーワードカウントを初期化
      if (!yearKeywords[year]) {
        yearKeywords[year] = {};
      }

      // テーマから名詞句を抽出してカウント
      if (card.themes && Array.isArray(card.themes)) {
        card.themes.forEach((theme) => {
          const nounPhrase = extractNounPhrase(theme.theme_title || '');
          if (nounPhrase) {
            yearKeywords[year][nounPhrase] = (yearKeywords[year][nounPhrase] || 0) + 1;
          }
        });
      }
    });

    // 各年度のTop 10キーワードを抽出
    const keywordRankingByYear = Object.entries(yearKeywords).map(([year, keywords]) => ({
      year,
      keywords: Object.entries(keywords)
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10), // Top 10
    }));

    // 年度順にソート（新しい順）
    keywordRankingByYear.sort((a, b) => {
      // 「令和4年」→ 4 のように数値を抽出して比較
      const yearNumA = parseInt(a.year.match(/\d+/)?.[0] || '0', 10);
      const yearNumB = parseInt(b.year.match(/\d+/)?.[0] || '0', 10);
      return yearNumB - yearNumA;
    });

    // 6. 閲覧数ランキング（年度別）
    type YearViewRanking = Record<string, Array<{
      id: string;
      member_name: string;
      question_summary: string;
      question_text: string;
      view_count: number;
      meeting_title: string;
      meeting_date: string | null;
      topics: string[];
    }>>;

    const yearViewRanking: YearViewRanking = {};

    cards.forEach((card) => {
      // 会議名から年度を抽出
      const year = card.meeting_title ? extractYearFromMeeting(card.meeting_title) : null;
      if (!year) return;

      // 年度ごとのカード配列を初期化
      if (!yearViewRanking[year]) {
        yearViewRanking[year] = [];
      }

      // 表示用のテキストを準備（question_summary、question_text、またはtheme_titleから）
      let displayText = '';
      if (card.question_summary && card.question_summary.trim().length > 0) {
        displayText = card.question_summary.trim();
      } else if (card.question_text && card.question_text.trim().length > 0) {
        displayText = card.question_text.trim();
      } else if (card.themes && Array.isArray(card.themes) && card.themes.length > 0 && card.themes[0].theme_title) {
        displayText = card.themes[0].theme_title;
      }

      yearViewRanking[year].push({
        id: card.id,
        member_name: card.member_name,
        question_summary: displayText,
        question_text: card.question_text || '',
        view_count: card.view_count || 0,
        meeting_title: card.meeting_title || '',
        meeting_date: card.meeting_date,
        topics: card.topics || [],
      });
    });

    // 各年度のTop 10閲覧数カードを抽出
    const viewCountRankingByYear = Object.entries(yearViewRanking).map(([year, cards]) => ({
      year,
      cards: cards
        .sort((a, b) => b.view_count - a.view_count)
        .slice(0, 10), // Top 10
    }));

    // 年度順にソート（新しい順）
    viewCountRankingByYear.sort((a, b) => {
      const yearNumA = parseInt(a.year.match(/\d+/)?.[0] || '0', 10);
      const yearNumB = parseInt(b.year.match(/\d+/)?.[0] || '0', 10);
      return yearNumB - yearNumA;
    });

    return NextResponse.json({
      totalCards: cardCount,
      totalMembers: uniqueMembers,
      totalTopics: allTopics.size,
      totalMeetings: uniqueMeetings,
      popularTopics,
      fieldTagRankingByYear,
      memberThemeRankingByYear,
      latestMeetingCategories,
      latestMeetingTitle,
      viewCountRankingByYear,
      keywordRankingByYear,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      {
        error: '統計情報の取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
