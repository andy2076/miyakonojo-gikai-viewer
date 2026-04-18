import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { QuestionCardRecord, Theme } from '@/types/database';

/**
 * テーマタイトルから名詞句を抽出する
 */
function extractNounPhrase(title: string): string | null {
  if (!title || title.trim() === '') return null;

  const match = title.match(/^(.+?)（.+?）$/);
  const baseTitle = match ? match[1] : title;

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

  if (cleaned.length < 2) return null;
  return cleaned;
}

/**
 * 会議名から年度を抽出する
 */
function extractYearFromMeeting(meetingTitle: string): string | null {
  const normalized = meetingTitle.replace(/[０-９]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });

  const match = normalized.match(/(令和\d+年|平成\d+年)/);
  if (!match) return null;

  const yearPattern = match[1];
  const fullWidthMatch = meetingTitle.match(new RegExp(yearPattern.replace(/\d/g, '[０-９\\d]')));
  return fullWidthMatch ? fullWidthMatch[0] : match[1];
}

/**
 * サイト全体の統計情報を取得するAPI
 */
export async function GET() {
  try {
    const result = await pool.query(
      'SELECT * FROM question_cards WHERE published = true'
    );

    const cards = result.rows as QuestionCardRecord[];
    const cardCount = cards.length;

    const uniqueMemberNames = Array.from(new Set(cards.map((c) => c.member_name)));
    const uniqueMembers = uniqueMemberNames.length;

    const allTopics = new Set<string>();
    cards.forEach((card) => {
      if (card.topics && Array.isArray(card.topics)) {
        card.topics.forEach((topic: string) => allTopics.add(topic));
      }
    });

    const uniqueMeetings = Array.from(
      new Set(cards.map((c) => c.meeting_title).filter(Boolean))
    ).length;

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
      if (!yearFieldTags[year]) yearFieldTags[year] = {};

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
        .slice(0, 10),
    }));

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
      if (!yearMemberThemes[year]) yearMemberThemes[year] = {};

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
        .slice(0, 10),
    }));

    memberThemeRankingByYear.sort((a, b) => {
      const yearNumA = parseInt(a.year.match(/\d+/)?.[0] || '0', 10);
      const yearNumB = parseInt(b.year.match(/\d+/)?.[0] || '0', 10);
      return yearNumB - yearNumA;
    });

    // 3. 最新会議の質問テーマカテゴリ
    const sortedByDate = [...cards].sort((a, b) => {
      const dateA = a.meeting_date ? new Date(a.meeting_date).getTime() : 0;
      const dateB = b.meeting_date ? new Date(b.meeting_date).getTime() : 0;
      return dateB - dateA;
    });

    const latestMeetingTitle = sortedByDate[0]?.meeting_title || null;
    const latestMeetingCards = cards.filter((card) => card.meeting_title === latestMeetingTitle);

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

    // 5. 期間別キーワードランキング（年度別）
    type YearKeywords = Record<string, Record<string, number>>;
    const yearKeywords: YearKeywords = {};

    cards.forEach((card) => {
      const year = card.meeting_title ? extractYearFromMeeting(card.meeting_title) : null;
      if (!year) return;
      if (!yearKeywords[year]) yearKeywords[year] = {};

      if (card.themes && Array.isArray(card.themes)) {
        card.themes.forEach((theme: Theme) => {
          const nounPhrase = extractNounPhrase(theme.theme_title || '');
          if (nounPhrase) {
            yearKeywords[year][nounPhrase] = (yearKeywords[year][nounPhrase] || 0) + 1;
          }
        });
      }
    });

    const keywordRankingByYear = Object.entries(yearKeywords).map(([year, keywords]) => ({
      year,
      keywords: Object.entries(keywords)
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    }));

    keywordRankingByYear.sort((a, b) => {
      const yearNumA = parseInt(a.year.match(/\d+/)?.[0] || '0', 10);
      const yearNumB = parseInt(b.year.match(/\d+/)?.[0] || '0', 10);
      return yearNumB - yearNumA;
    });

    // 6. 閲覧数ランキング（年度別）
    type YearViewRanking = Record<string, Array<{
      id: string; member_name: string; question_summary: string; question_text: string;
      view_count: number; meeting_title: string; meeting_date: string | null; topics: string[];
    }>>;

    const yearViewRanking: YearViewRanking = {};

    cards.forEach((card) => {
      const year = card.meeting_title ? extractYearFromMeeting(card.meeting_title) : null;
      if (!year) return;
      if (!yearViewRanking[year]) yearViewRanking[year] = [];

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

    const viewCountRankingByYear = Object.entries(yearViewRanking).map(([year, cards]) => ({
      year,
      cards: cards.sort((a, b) => b.view_count - a.view_count).slice(0, 10),
    }));

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
      { error: '統計情報の取得中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
