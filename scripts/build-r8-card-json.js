/**
 * mieru-gikai-r8.json（一般質問概要書PDFの構造化データ）を
 * 既存の「質問カードJSON」スキーマに変換するスクリプト。
 *
 * 出力: data/都城市議会_令和8年第N回_質問カード.json （3ファイル）
 *
 * 答弁・質問の要点は data/都城市議会_令和8年第2回_答弁要約.json（会議録から作成）を
 * 「議員名|大項目番号」のキーで突き合わせて埋め込む。
 * 会議録が未公開の会期は answer を空文字とし、question は通告内容の要約を入れる。
 *
 * 使い方: node scripts/build-r8-card-json.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'mieru-gikai-r8.json');
const QA_PATH = path.join(ROOT, 'data', '都城市議会_令和8年第2回_答弁要約.json');

// 会期IDごとの出力設定
const SESSION_CONFIG = {
  'r8-2': {
    meeting: '令和8年第2回定例会',
    outFile: '都城市議会_令和8年第2回_質問カード.json',
    source:
      '都城市議会 一般質問概要書（令和8年3月定例会 / uploaded/attachment/44454.pdf）'
      + '＋会議録検索システム (R080305A〜R080311A)',
    qaKey: 'r8-2',
  },
  'r8-3': {
    meeting: '令和8年第3回定例会',
    outFile: '都城市議会_令和8年第3回_質問カード.json',
    source:
      '都城市議会 一般質問概要書（令和8年6月定例会 / uploaded/attachment/46547.pdf）'
      + '※会議録未公開のため答弁未収録',
    qaKey: null,
  },
  'r8-4': {
    meeting: '令和8年第4回定例会',
    outFile: '都城市議会_令和8年第4回_質問カード.json',
    source:
      '都城市議会 一般質問概要書（令和8年9月定例会 / uploaded/attachment/47878.pdf）'
      + '※会期中・会議録未公開のため答弁未収録',
    qaKey: null,
  },
};

/** 末尾の「について」「。」を落として見出し語にする */
function trimSuffix(text) {
  return text.replace(/[。．]$/, '').replace(/について$/, '');
}

/** 通告内容だけから質問の要点を組み立てる（会議録が未公開の会期用） */
function buildNoticeSummary(topic) {
  const items = (topic.items || []).map(trimSuffix).filter(Boolean);
  const list =
    items.length <= 3
      ? items.join('／')
      : `${items.slice(0, 3).join('／')}ほか計${items.length}項目`;
  // 「答弁は会議録公開後」という案内は詳細画面の答弁欄に出すため、ここでは重ねない
  const head = `【通告段階】${trimSuffix(topic.title)}`;
  return list ? `${head}（通告項目：${list}）` : head;
}

function main() {
  const src = JSON.parse(fs.readFileSync(SRC, 'utf-8'));
  const qaAll = JSON.parse(fs.readFileSync(QA_PATH, 'utf-8'));

  for (const session of src.sessions) {
    const conf = SESSION_CONFIG[session.id];
    if (!conf) {
      throw new Error(`未知の会期ID: ${session.id}`);
    }

    const cards = session.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((q) => ({
        member: q.member,
        party: q.party,
        date: q.date,
        meeting: conf.meeting,
        topics: q.topics.map((t) => {
          const qa = conf.qaKey ? qaAll[`${q.member}|${t.no}`] : null;
          if (conf.qaKey && !qa) {
            throw new Error(`答弁要約が見つかりません: ${q.member}|${t.no}`);
          }
          return {
            title: t.title,
            subtopics: t.items || [],
            category: [t.field],
            question: qa ? qa.question : buildNoticeSummary(t),
            answer: qa ? qa.answer : '',
          };
        }),
      }));

    const out = {
      meeting: conf.meeting,
      session_year: session.year,
      source: conf.source,
      source_pdf: session.source_pdf,
      answers_available: Boolean(conf.qaKey),
      card_count: cards.length,
      cards,
    };

    const outPath = path.join(ROOT, 'data', conf.outFile);
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf-8');

    const topicCount = cards.reduce((n, c) => n + c.topics.length, 0);
    const itemCount = cards.reduce(
      (n, c) => n + c.topics.reduce((m, t) => m + t.subtopics.length, 0),
      0
    );
    console.log(
      `${conf.meeting}: ${cards.length}名 / 大項目${topicCount} / 小項目${itemCount} -> data/${conf.outFile}`
    );
  }
}

main();
