/**
 * セッションベースの議事録パーサー
 */

export interface Statement {
  speaker: string;
  text: string;
  type: 'question' | 'answer' | 'other';
}

export interface QuestionAnswerSession {
  councilMember: string; // 質問議員名
  statements: Statement[]; // セッション内の全発言
  startText: string; // 開始行
  endText: string; // 終了行
}

export interface ParsedSession {
  sessions: QuestionAnswerSession[];
  otherStatements: Statement[]; // セッション外の発言
}

/**
 * 議事録をセッション単位で解析
 */
export function parseSessionBasedMinutes(text: string): ParsedSession {
  const lines = text.split('\n');
  const sessions: QuestionAnswerSession[] = [];
  const otherStatements: Statement[] = [];

  let currentSession: QuestionAnswerSession | null = null;
  let currentSpeaker = '';
  let currentText = '';
  let currentType: 'question' | 'answer' | 'other' = 'other';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    // セッション開始パターンを検出
    // 例: ○議　長（長友潤治君）　まず、山内いっとく議員の発言を許します。
    // パターン: 議員名が「の発言を許します」の直前に来る
    const sessionStartMatch = line.match(/([^\s、。（）]+(?:議員|君))の発言を許します/);

    if (sessionStartMatch) {
      // 前のセッションを保存
      if (currentSession) {
        if (currentSpeaker && currentText.trim()) {
          currentSession.statements.push({
            speaker: currentSpeaker,
            text: currentText.trim(),
            type: currentType,
          });
        }
        sessions.push(currentSession);
      }

      // 新しいセッションを開始
      const memberName = sessionStartMatch[1];
      console.log(`【セッション開始】${memberName}`);
      currentSession = {
        councilMember: memberName,
        statements: [],
        startText: line,
        endText: '',
      };

      currentSpeaker = '';
      currentText = '';
      continue;
    }

    // セッション終了パターンを検出
    // 例: 以上で、山内いっとく議員の発言を終わります。
    const sessionEndMatch = line.match(/以上で、([^\s、。（）]+(?:議員|君))の発言を終(?:わ|え)ります/);

    if (sessionEndMatch && currentSession) {
      // 最後の発言を保存
      if (currentSpeaker && currentText.trim()) {
        currentSession.statements.push({
          speaker: currentSpeaker,
          text: currentText.trim(),
          type: currentType,
        });
      }

      currentSession.endText = line;
      console.log(`【セッション終了】${currentSession.councilMember} - 発言数: ${currentSession.statements.length}`);
      sessions.push(currentSession);
      currentSession = null;
      currentSpeaker = '';
      currentText = '';
      continue;
    }

    // 発言者パターンを検出
    // 例: ○（音堅良一君）　（登壇）皆様、おはようございます。
    // 例: ○議　長（長友潤治君）　健康部長。
    const speakerMatch = line.match(/^○(.+)/);

    if (speakerMatch) {
      // 前の発言を保存
      if (currentSpeaker && currentText.trim()) {
        if (currentSession) {
          currentSession.statements.push({
            speaker: currentSpeaker,
            text: currentText.trim(),
            type: currentType,
          });
          console.log(`  [発言追加] ${currentSpeaker} (${currentType})`);
        } else {
          otherStatements.push({
            speaker: currentSpeaker,
            text: currentText.trim(),
            type: currentType,
          });
        }
      }

      // 新しい発言者を設定
      // 発言者名と発言内容を分離
      // 発言者名は括弧で終わる（例: 議　長（長友潤治君）、（音堅良一君））
      const fullLine = speakerMatch[1].trim();

      // 括弧で終わる発言者名を抽出し、その後の内容と分離
      // 全角括弧（）、半角スペースまたは全角スペース「　」で区切られている
      const speakerAndTextMatch = fullLine.match(/^(.+?）)[\s　]+(.+)$/);

      if (speakerAndTextMatch) {
        // 発言者名と発言内容が同じ行にある場合
        currentSpeaker = speakerAndTextMatch[1];
        currentText = speakerAndTextMatch[2];
      } else {
        // 発言者名のみの場合
        currentSpeaker = fullLine;
        currentText = '';
      }

      // 発言のタイプを判定
      currentType = determineSpeakerType(currentSpeaker);
    } else {
      // 発言の続き
      if (currentText) {
        currentText += '\n' + line;
      } else {
        currentText = line;
      }
    }
  }

  // 最後の発言を保存
  if (currentSpeaker && currentText.trim()) {
    if (currentSession) {
      currentSession.statements.push({
        speaker: currentSpeaker,
        text: currentText.trim(),
        type: currentType,
      });
      sessions.push(currentSession);
    } else {
      otherStatements.push({
        speaker: currentSpeaker,
        text: currentText.trim(),
        type: currentType,
      });
    }
  }

  return {
    sessions,
    otherStatements,
  };
}

/**
 * 発言者のタイプを判定
 */
function determineSpeakerType(speaker: string): 'question' | 'answer' | 'other' {
  // 議員名のパターン（全角括弧を考慮）
  const memberPatterns = [
    /議員[）)]?$/,
    /君[）)]?$/,
    /氏[）)]?$/,
  ];

  // 答弁者（役職）のパターン（役職名を含むかチェック）
  const answerPatterns = [
    /市長/,      // 市　長（池田宜永君）
    /副市長/,
    /部長/,      // 健康部長（川村うた子君）
    /課長/,
    /局長/,
    /次長/,
    /参事/,
    /理事/,
    /教育長/,
    /委員長/,    // 選挙管理委員会委員長（中邑順一郎君）
    /^議　長/,   // 議　長（長友潤治君）
    /^副議長/,
  ];

  // 答弁者かチェック（役職名が含まれている場合は答弁者）
  for (const pattern of answerPatterns) {
    if (pattern.test(speaker)) {
      return 'answer';
    }
  }

  // 議員かチェック
  for (const pattern of memberPatterns) {
    if (pattern.test(speaker)) {
      return 'question';
    }
  }

  return 'other';
}

/**
 * セッション統計を生成
 */
export function generateSessionStats(parsed: ParsedSession) {
  const stats = {
    totalSessions: parsed.sessions.length,
    sessionsByMember: new Map<string, number>(),
    totalQuestions: 0,
    totalAnswers: 0,
    answererCounts: new Map<string, number>(),
  };

  parsed.sessions.forEach((session) => {
    // 議員ごとのセッション数
    const count = stats.sessionsByMember.get(session.councilMember) || 0;
    stats.sessionsByMember.set(session.councilMember, count + 1);

    // 質問・答弁数
    session.statements.forEach((stmt) => {
      if (stmt.type === 'question') {
        stats.totalQuestions++;
      } else if (stmt.type === 'answer') {
        stats.totalAnswers++;

        // 答弁者ごとのカウント
        const answerCount = stats.answererCounts.get(stmt.speaker) || 0;
        stats.answererCounts.set(stmt.speaker, answerCount + 1);
      }
    });
  });

  return stats;
}

/**
 * セッションのサマリーを生成
 */
export function generateSessionSummary(session: QuestionAnswerSession) {
  const questions = session.statements.filter((s) => s.type === 'question');
  const answers = session.statements.filter((s) => s.type === 'answer');

  // 答弁者リスト
  const answerers = new Set(answers.map((a) => a.speaker));

  // 質問のキーワード抽出（最初の質問の最初の100文字）
  const firstQuestion = questions[0]?.text.substring(0, 100) || '';

  return {
    councilMember: session.councilMember,
    questionCount: questions.length,
    answerCount: answers.length,
    answerers: Array.from(answerers),
    preview: firstQuestion,
  };
}
