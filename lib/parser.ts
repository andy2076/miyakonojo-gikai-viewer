/**
 * 議事録パーサー
 */

export interface ParsedStatement {
  speaker: string;
  text: string;
  type: 'question' | 'answer' | 'other';
}

/**
 * 議事録テキストから発言を抽出
 */
export function parseMinutes(text: string): ParsedStatement[] {
  const statements: ParsedStatement[] = [];

  // 改行で分割
  const lines = text.split('\n');

  let currentSpeaker = '';
  let currentText = '';
  let currentType: 'question' | 'answer' | 'other' = 'other';

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 空行はスキップ
    if (!trimmedLine) {
      continue;
    }

    // 発言者パターンを検出
    // パターン1: 【議員名】または【役職名】
    const bracketPattern = /^【(.+?)】(.*)$/;
    const bracketMatch = trimmedLine.match(bracketPattern);

    // パターン2: ◆議員名◆または◇役職名◇
    const diamondPattern = /^[◆◇](.+?)[◆◇](.*)$/;
    const diamondMatch = trimmedLine.match(diamondPattern);

    // パターン3: ○発言者（名前）または○発言者
    // 例: ○臨時議長（徳留八郎君）　テキスト...
    const circlePattern = /^○(.+?)(?:\s+(.*))?$/;
    const circleMatch = trimmedLine.match(circlePattern);

    const match = bracketMatch || diamondMatch || circleMatch;

    if (match) {
      // 前の発言を保存
      if (currentSpeaker && currentText.trim()) {
        statements.push({
          speaker: currentSpeaker,
          text: currentText.trim(),
          type: currentType,
        });
      }

      // 新しい発言者を設定
      let speaker = match[1].trim();

      // ○パターンの場合、括弧内の名前を抽出
      if (circleMatch) {
        // 例: "臨時議長（徳留八郎君）" から括弧を含む全体を使用
        currentSpeaker = speaker;
        currentText = match[2] || '';
      } else {
        currentSpeaker = speaker;
        currentText = match[2] || '';
      }

      // 発言のタイプを判定
      currentType = determineSpeakerType(currentSpeaker);
    } else {
      // 発言の続き
      if (currentText) {
        currentText += '\n' + trimmedLine;
      } else {
        currentText = trimmedLine;
      }
    }
  }

  // 最後の発言を保存
  if (currentSpeaker && currentText.trim()) {
    statements.push({
      speaker: currentSpeaker,
      text: currentText.trim(),
      type: currentType,
    });
  }

  return statements;
}

/**
 * 発言者のタイプを判定
 */
function determineSpeakerType(speaker: string): 'question' | 'answer' | 'other' {
  // 議員名のパターン
  const memberPatterns = [
    /議員$/,
    /君$/,
    /氏$/,
  ];

  // 答弁者（役職）のパターン
  const answerPatterns = [
    /市長$/,
    /副市長$/,
    /部長$/,
    /課長$/,
    /局長$/,
    /次長$/,
    /参事$/,
    /理事$/,
    /教育長$/,
    /^議長$/,
    /^副議長$/,
  ];

  // 議員かチェック
  for (const pattern of memberPatterns) {
    if (pattern.test(speaker)) {
      return 'question';
    }
  }

  // 答弁者かチェック
  for (const pattern of answerPatterns) {
    if (pattern.test(speaker)) {
      return 'answer';
    }
  }

  return 'other';
}

/**
 * 議員名を抽出（質問者のみ）
 */
export function extractCouncilMembers(statements: ParsedStatement[]): string[] {
  const members = new Set<string>();

  for (const statement of statements) {
    if (statement.type === 'question') {
      members.add(statement.speaker);
    }
  }

  return Array.from(members);
}

/**
 * 議員ごとの質問回数を集計
 */
export function countQuestionsByMember(
  statements: ParsedStatement[]
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const statement of statements) {
    if (statement.type === 'question') {
      counts[statement.speaker] = (counts[statement.speaker] || 0) + 1;
    }
  }

  return counts;
}

/**
 * テキストのプレビューを生成
 */
export function generatePreview(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength) + '...';
}
