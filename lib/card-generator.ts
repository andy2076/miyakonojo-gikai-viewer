/**
 * 質問カード生成ロジック
 *
 * セッション内の質問と答弁を解析して、質問ごとのカードを生成します。
 */

import { SessionAnalysis } from './content-analyzer';

export interface QuestionCard {
  sessionIndex: number;
  memberName: string;
  questionText: string; // セッション内の全質問を結合
  questionSummary: string; // 質問の要約
  answerTexts: string[];
  answerers: string[];
  answerSummary: string; // 答弁の要約（JSON形式）
  topics: string[];
  keywords: Array<{ keyword: string; count: number }>;
  fullContent: string;
  contentData: Array<{ type: 'question' | 'answer'; speaker: string; text: string }>;
}

/**
 * 文を短い要点に分割する（改善版）
 */
function extractKeyPoints(sentence: string, maxLength: number = 60): string[] {
  // 長すぎる文は最初から除外
  if (sentence.length > 200) {
    return [];
  }

  // 文全体が短ければそのまま使う
  if (sentence.length <= maxLength) {
    return [sentence.trim()];
  }

  // 接続詞で分割を試みる
  const connectors = ['また', 'さらに', 'なお', 'ただし', 'しかし', 'そして', 'また'];
  for (const connector of connectors) {
    if (sentence.includes(connector + '、') || sentence.includes(connector + 'は')) {
      const parts = sentence.split(new RegExp(`(${connector}[、は])`))
        .filter(p => p.trim().length > 15 && !connectors.includes(p.trim().replace(/[、は]/, '')));

      const validParts = parts
        .map(p => p.trim())
        .filter(p => p.length >= 15 && p.length <= maxLength * 1.5);

      if (validParts.length > 0) {
        return validParts.slice(0, 2).map(p => {
          if (p.length > maxLength) {
            // 自然な区切りで切る
            const cutIndex = p.substring(0, maxLength).lastIndexOf('、');
            if (cutIndex > maxLength * 0.5) {
              return p.substring(0, cutIndex);
            }
          }
          return p;
        });
      }
    }
  }

  // 「、」で分割を試みる
  const parts = sentence.split('、').filter(p => p.trim().length > 15);
  if (parts.length > 1) {
    return parts
      .slice(0, 2)
      .map(p => p.trim())
      .filter(p => p.length >= 15 && p.length <= maxLength * 1.5)
      .map(p => {
        if (p.length > maxLength) {
          return p.substring(0, maxLength);
        }
        return p;
      });
  }

  // どうしても分割できない場合は最初の60文字
  return [sentence.substring(0, maxLength)];
}

/**
 * 質問文から超簡潔な要約を生成（GPT風）
 *
 * GPTの例:
 * 「老朽化・高齢化により空き家率が34％と高い。なぜ募集しない住宅が多いのか。バリアフリー化の方針は？」
 */
function generateQuestionSummary(questionText: string): string {
  // 1. 不要な定型文・感情表現を徹底除去
  const fillerPatterns = [
    /お伺いいたします[。\s]*/g,
    /お伺いします[。\s]*/g,
    /お聞きします[。\s]*/g,
    /お聞きいたします[。\s]*/g,
    /質問します[。\s]*/g,
    /質問いたします[。\s]*/g,
    /お尋ねします[。\s]*/g,
    /お尋ねいたします[。\s]*/g,
    /ご質問します[。\s]*/g,
    /ご質問いたします[。\s]*/g,
    /登壇[）)]*/g,
    /皆様、/g,
    /おはようございます[。\s]*/g,
    /こんにちは[。\s]*/g,
    /と思います/g,
    /と考えます/g,
    /と思われます/g,
    /と考えられます/g,
    /ではないでしょうか/g,
    /ではないかと思います/g,
    /伺いたいと思います[。\s]*/g,
    /について[、]?後ほど[^。]*伺[^。]*[。\s]*/g,
  ];

  let cleaned = questionText;
  fillerPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // 2. 文に分割
  const sentences = cleaned.split(/[。！？]/).filter(s => s.trim().length > 10);

  // 3. 核心的な情報を抽出
  const keyPoints: string[] = [];

  // 数値・統計データを含む文を優先的に抽出（最大1つ）
  const numericSentence = sentences.find(s =>
    s.match(/[0-9]+[%％件人円万億回年度月日]/) &&
    s.length < 100 &&
    !s.includes('昨年') &&
    !s.includes('アンケート')
  );
  if (numericSentence && numericSentence.length < 80) {
    keyPoints.push(numericSentence.trim());
  }

  // 疑問文（質問の核心）を抽出（最大2つ）
  const questions = sentences
    .filter(s =>
      (s.includes('か') || s.includes('？')) &&
      s.length >= 15 &&
      s.length < 80 &&
      !s.includes('伺いたい') &&
      !s.includes('お聞きしたい')
    )
    .slice(0, 2);

  keyPoints.push(...questions.map(q => q.trim()));

  // 問題提起・要望を含む短い文を抽出（最大1つ）
  if (keyPoints.length < 3) {
    const problemSentence = sentences.find(s =>
      (s.includes('課題') || s.includes('問題') || s.includes('必要') || s.includes('求める')) &&
      s.length >= 15 &&
      s.length < 80 &&
      !keyPoints.includes(s.trim())
    );
    if (problemSentence) {
      keyPoints.push(problemSentence.trim());
    }
  }

  // 4. 何も抽出できなかった場合、最初の短い文を使用
  if (keyPoints.length === 0) {
    const firstShort = sentences.find(s => s.length >= 15 && s.length < 80);
    if (firstShort) {
      keyPoints.push(firstShort.trim());
    } else {
      const firstSentence = sentences[0] || '';
      keyPoints.push(firstSentence.substring(0, 60) + (firstSentence.length > 60 ? '...' : ''));
    }
  }

  // 5. Q形式で整形（最大3つ）
  return keyPoints
    .slice(0, 3)
    .map(point => {
      // 末尾の「か」を「か？」に統一
      if (point.endsWith('か')) {
        return 'Q：' + point + '？';
      }
      // 疑問詞で終わらない場合はそのまま
      return 'Q：' + point + (point.endsWith('？') ? '' : '。');
    })
    .join('\n');
}

/**
 * 答弁から超簡潔な要約を生成（GPT風A形式）
 *
 * GPTの例:
 * 「A：耐用年数を過ぎた簡易耐火平屋住宅が多く、老朽化と生活様式の変化が原因。建て替え時にはバリアフリー化を進める。」
 */
function generateAnswerSummary(answerTexts: string[]): string {
  if (!answerTexts || answerTexts.length === 0) {
    return JSON.stringify({
      issues: 'A：答弁なし',
      future: '',
    });
  }

  // 全ての答弁を結合
  const allAnswersText = answerTexts.join('\n');

  // 定型文を徹底除去
  const fillerPatterns = [
    /お答えいたします[。\s]*/g,
    /お答えします[。\s]*/g,
    /答弁いたします[。\s]*/g,
    /ご答弁いたします[。\s]*/g,
    /答弁を求めます[。\s]*/g,
    /おはようございます[。\s]*/g,
    /こんにちは[。\s]*/g,
    /と思います/g,
    /と考えます/g,
    /と思われます/g,
    /と考えられます/g,
  ];

  let cleaned = allAnswersText;
  fillerPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  const sentences = cleaned.split(/[。！？]/).filter(s => s.trim().length > 10);

  // 1. 原因・理由を含む文を抽出
  const causeSentence = sentences.find(s =>
    (s.includes('原因') || s.includes('理由') || s.includes('ため') || s.includes('により')) &&
    s.length >= 15 &&
    s.length < 100
  );

  // 2. 対策・方針を含む文を抽出
  const actionSentence = sentences.find(s =>
    (s.includes('進めます') || s.includes('実施') || s.includes('行います') ||
     s.includes('取り組') || s.includes('推進') || s.includes('検討')) &&
    s.length >= 15 &&
    s.length < 100 &&
    s !== causeSentence
  );

  // 3. 現状・実態を含む文を抽出
  const statusSentence = sentences.find(s =>
    (s.includes('現状') || s.includes('状況') || s.includes('実態') || s.match(/[0-9]+[%％件人円万億]/)) &&
    s.length >= 15 &&
    s.length < 100 &&
    s !== causeSentence &&
    s !== actionSentence
  );

  // 4. 抽出した文を組み合わせて1-2文の要約を作成
  const keyPoints: string[] = [];

  if (causeSentence) {
    keyPoints.push(causeSentence.trim());
  }
  if (statusSentence && keyPoints.length === 0) {
    keyPoints.push(statusSentence.trim());
  }
  if (actionSentence) {
    keyPoints.push(actionSentence.trim());
  }

  // 何も抽出できなかった場合、最初の2文を使用
  if (keyPoints.length === 0) {
    const firstShort = sentences
      .filter(s => s.length >= 15 && s.length < 100)
      .slice(0, 2);

    if (firstShort.length > 0) {
      keyPoints.push(...firstShort.map(s => s.trim()));
    } else {
      const firstSentence = sentences[0] || '';
      keyPoints.push(firstSentence.substring(0, 80) + (firstSentence.length > 80 ? '...' : ''));
    }
  }

  // A形式で整形（最大2文を結合）
  const answerSummary = 'A：' + keyPoints.slice(0, 2).join('。') + '。';

  return JSON.stringify({
    issues: answerSummary,
    future: '', // GPT風では1つの要約にまとめる
  });
}

/**
 * full_contentを生成（質問と答弁を読みやすく整形）
 */
function generateFullContent(
  memberName: string,
  questionText: string,
  answers: Array<{ speaker: string; text: string }>
): string {
  let content = `【質問】${memberName}\n${questionText}\n\n`;

  answers.forEach((answer) => {
    content += `【答弁】${answer.speaker}\n${answer.text}\n\n`;
  });

  return content.trim();
}

/**
 * セッション解析データから質問カードを生成
 *
 * @param sessionAnalyses - セッション解析データの配列
 * @returns 質問カードの配列
 */
export function generateQuestionCards(sessionAnalyses: SessionAnalysis[]): QuestionCard[] {
  const cards: QuestionCard[] = [];

  sessionAnalyses.forEach((session, sessionIndex) => {
    // セッション内の質問と答弁を分離
    const questions = session.questions || [];
    const answers = session.answers || [];

    // セッション全体で1カードを作成
    // 全質問を結合
    const allQuestionsText = questions.map(q => q.text).join('\n\n');

    // 答弁者リストを取得
    const answerers = Array.from(
      new Set(answers.map((a) => a.speaker).filter(Boolean))
    );

    // 全ての答弁テキスト
    const answerTexts = answers.map((a) => a.text);

    // full_contentを生成
    const fullContent = generateFullContent(session.member, allQuestionsText, answers);

    // content_dataを生成（全質問と全答弁）
    const contentData: Array<{ type: 'question' | 'answer'; speaker: string; text: string }> = [
      ...questions.map(q => ({ type: 'question' as const, speaker: session.member, text: q.text })),
      ...answers.map((a) => ({ type: 'answer' as const, speaker: a.speaker, text: a.text })),
    ];

    // 要約を生成
    const questionSummary = generateQuestionSummary(allQuestionsText);
    const answerSummary = generateAnswerSummary(answerTexts);

    const card: QuestionCard = {
      sessionIndex,
      memberName: session.member,
      questionText: allQuestionsText,
      questionSummary,
      answerTexts,
      answerers,
      answerSummary,
      topics: session.topics || [],
      keywords: session.keywords || [],
      fullContent,
      contentData,
    };

    cards.push(card);
  });

  return cards;
}

/**
 * より詳細な質問カード生成（質問と直後の答弁を対応付ける）
 *
 * セッションのstatements配列を見て、質問の直後にある答弁だけを
 * その質問のカードに含める
 */
export interface DetailedQuestionCard extends QuestionCard {
  relatedAnswerTexts: string[]; // この質問に直接関連する答弁のみ
  relatedAnswerers: string[]; // この質問に答えた答弁者のみ
}

/**
 * より詳細な質問カード生成
 *
 * @param sessionAnalyses - セッション解析データ
 * @returns 詳細な質問カードの配列
 */
export function generateDetailedQuestionCards(
  sessionAnalyses: SessionAnalysis[]
): DetailedQuestionCard[] {
  const cards: DetailedQuestionCard[] = [];

  sessionAnalyses.forEach((session, sessionIndex) => {
    const questions = session.questions || [];
    const answers = session.answers || [];

    // 各質問について処理
    questions.forEach((question, questionIndex) => {
      // セッション全体の答弁情報
      const allAnswerers = Array.from(
        new Set(answers.map((a) => a.speaker).filter(Boolean))
      );
      const allAnswerTexts = answers.map((a) => a.text);

      // TODO: より高度なロジックで、この質問に関連する答弁だけを抽出
      // 現時点ではセッション全体の答弁を含める
      const relatedAnswerTexts = allAnswerTexts;
      const relatedAnswerers = allAnswerers;

      const card: DetailedQuestionCard = {
        sessionIndex,
        memberName: session.member,
        questionText: question.text,
        questionSummary: '',
        answerTexts: allAnswerTexts,
        answerers: allAnswerers,
        answerSummary: '',
        relatedAnswerTexts,
        relatedAnswerers,
        topics: session.topics || [],
        keywords: session.keywords || [],
        fullContent: '',
        contentData: [],
      };

      cards.push(card);
    });
  });

  return cards;
}

/**
 * カードのサマリーテキスト生成（プレビュー用）
 */
export function generateCardSummary(card: QuestionCard, maxLength = 100): string {
  return card.questionText.substring(0, maxLength) + (card.questionText.length > maxLength ? '...' : '');
}

/**
 * カードをフィルタリング（議員名、トピック、キーワードなど）
 */
export interface CardFilter {
  memberName?: string;
  topics?: string[];
  keywords?: string[];
}

export function filterCards(cards: QuestionCard[], filter: CardFilter): QuestionCard[] {
  return cards.filter((card) => {
    // 議員名でフィルタ
    if (filter.memberName && !card.memberName.includes(filter.memberName)) {
      return false;
    }

    // トピックでフィルタ
    if (filter.topics && filter.topics.length > 0) {
      const hasMatchingTopic = filter.topics.some((topic) =>
        card.topics.includes(topic)
      );
      if (!hasMatchingTopic) {
        return false;
      }
    }

    // キーワードでフィルタ
    if (filter.keywords && filter.keywords.length > 0) {
      const cardKeywords = card.keywords.map((k) => k.keyword);
      const hasMatchingKeyword = filter.keywords.some((keyword) =>
        cardKeywords.includes(keyword)
      );
      if (!hasMatchingKeyword) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 議員ごとにカードをグループ化
 */
export function groupCardsByMember(cards: QuestionCard[]): Map<string, QuestionCard[]> {
  const grouped = new Map<string, QuestionCard[]>();

  cards.forEach((card) => {
    const existing = grouped.get(card.memberName) || [];
    existing.push(card);
    grouped.set(card.memberName, existing);
  });

  return grouped;
}

/**
 * トピックごとにカードをグループ化
 */
export function groupCardsByTopic(cards: QuestionCard[]): Map<string, QuestionCard[]> {
  const grouped = new Map<string, QuestionCard[]>();

  cards.forEach((card) => {
    card.topics.forEach((topic) => {
      const existing = grouped.get(topic) || [];
      existing.push(card);
      grouped.set(topic, existing);
    });
  });

  return grouped;
}
