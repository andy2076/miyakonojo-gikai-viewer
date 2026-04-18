import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';
import { parseMinutes, extractCouncilMembers, countQuestionsByMember } from '@/lib/parser';
import {
  parseSessionBasedMinutes,
  generateSessionStats,
  generateSessionSummary,
} from '@/lib/session-parser';
import {
  analyzeSession,
  analyzeOverall,
} from '@/lib/content-analyzer';
import { generateQuestionCards } from '@/lib/card-generator';
import fs from 'fs/promises';
import path from 'path';

// CommonJSモジュール
const PDFParser = require('pdf2json');
const mammoth = require('mammoth');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');

/**
 * ファイル解析API
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { file_id } = body;

    if (!file_id) {
      return NextResponse.json({ error: 'file_idが必要です' }, { status: 400 });
    }

    // データベースからファイル情報を取得
    const fileResult = await pool.query('SELECT * FROM minutes_files WHERE id = $1', [file_id]);
    const fileData = fileResult.rows[0];

    if (!fileData) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 });
    }

    // ローカルファイルシステムからファイルを読み込み
    const filePath = path.join(UPLOAD_DIR, fileData.storage_path);
    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(filePath);
    } catch {
      return NextResponse.json(
        { error: `ファイルの読み込みに失敗しました: ${fileData.storage_path}` },
        { status: 500 }
      );
    }

    // ファイルタイプに応じてテキストを抽出
    let extractedText = '';

    if (fileData.file_type === 'application/pdf') {
      try {
        extractedText = await new Promise<string>((resolve, reject) => {
          const pdfParser = new PDFParser();

          pdfParser.on('pdfParser_dataError', (errData: any) => {
            reject(new Error(errData.parserError || 'PDF解析エラー'));
          });

          pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            try {
              const pages = pdfData.Pages || [];
              let allText = '';

              pages.forEach((page: any) => {
                const texts = page.Texts || [];
                const lineMap = new Map<number, string[]>();

                texts.forEach((textItem: any) => {
                  const y = textItem.y || 0;
                  const runs = textItem.R || [];

                  runs.forEach((run: any) => {
                    if (run.T) {
                      const decodedText = decodeURIComponent(run.T);
                      if (!lineMap.has(y)) {
                        lineMap.set(y, []);
                      }
                      lineMap.get(y)!.push(decodedText);
                    }
                  });
                });

                const sortedLines = Array.from(lineMap.entries())
                  .sort((a, b) => a[0] - b[0]);

                sortedLines.forEach(([y, lineTexts]) => {
                  allText += lineTexts.join('') + '\n';
                });

                allText += '\n';
              });

              // ○マーカーの前に改行を挿入
              allText = allText.replace(/([^\n])○/g, '$1\n○');

              resolve(allText);
            } catch (err) {
              reject(err);
            }
          });

          pdfParser.parseBuffer(fileBuffer);
        });
      } catch (pdfError) {
        console.error('PDF parse error:', pdfError);
        return NextResponse.json(
          {
            error: `PDFファイルの解析に失敗しました: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`,
            details: 'ファイルが破損しているか、パスワード保護されている可能性があります。'
          },
          { status: 500 }
        );
      }
    } else if (
      fileData.file_type === 'application/msword' ||
      fileData.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = result.value;

        if (result.messages && result.messages.length > 0) {
          console.log('Mammoth warnings:', result.messages);
        }
      } catch (mammothError) {
        console.error('Mammoth parse error:', mammothError);
        return NextResponse.json(
          {
            error: `DOC/DOCXファイルの解析に失敗しました: ${mammothError instanceof Error ? mammothError.message : 'Unknown error'}`,
            details: 'ファイルが破損しているか、サポートされていない形式の可能性があります。PDFファイルでお試しください。'
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json({ error: 'サポートされていないファイル形式です' }, { status: 400 });
    }

    // セッションベースで解析
    const parsedSessions = parseSessionBasedMinutes(extractedText);
    const sessionStats = generateSessionStats(parsedSessions);

    const sessionSummaries = parsedSessions.sessions.map((session) =>
      generateSessionSummary(session)
    );

    const sessionAnalyses = parsedSessions.sessions.map((session) =>
      analyzeSession(session)
    );
    const overallAnalysis = analyzeOverall(parsedSessions.sessions);

    // 従来の方法でも解析（互換性のため）
    const statements = parseMinutes(extractedText);
    const councilMembers = extractCouncilMembers(statements);
    const questionCounts = countQuestionsByMember(statements);

    const stats = {
      totalStatements: statements.length,
      totalQuestions: statements.filter((s) => s.type === 'question').length,
      totalAnswers: statements.filter((s) => s.type === 'answer').length,
      councilMembers: councilMembers.length,
      totalSessions: sessionStats.totalSessions,
      sessionQuestions: sessionStats.totalQuestions,
      sessionAnswers: sessionStats.totalAnswers,
    };

    // 解析結果をデータベースに保存
    try {
      await pool.query(
        `UPDATE minutes_files SET processed = true, analysis_data = $1 WHERE id = $2`,
        [
          JSON.stringify({
            sessionAnalyses,
            overallAnalysis,
            stats,
            sessionSummaries,
            answererCounts: Object.fromEntries(sessionStats.answererCounts),
          }),
          file_id,
        ]
      );
    } catch (updateError) {
      console.error('Failed to update analysis data:', updateError);
    }

    // 質問カードを生成・保存
    const questionCards = generateQuestionCards(sessionAnalyses);
    console.log(`生成された質問カード数: ${questionCards.length}`);

    // 既存のカードを削除（再解析の場合）
    try {
      await pool.query('DELETE FROM question_cards WHERE file_id = $1', [file_id]);
    } catch (deleteError) {
      console.error('Failed to delete old question cards:', deleteError);
    }

    // 新しいカードを保存
    if (questionCards.length > 0) {
      for (const card of questionCards) {
        try {
          await pool.query(
            `INSERT INTO question_cards (
              file_id, member_name, question_text, question_summary,
              answer_texts, answerers, answer_summary,
              full_content, content_data, topics, keywords,
              meeting_date, meeting_title, meeting_id, published
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, false)`,
            [
              file_id,
              card.memberName,
              card.questionText,
              card.questionSummary,
              JSON.stringify(card.answerTexts),
              JSON.stringify(card.answerers),
              card.answerSummary,
              card.fullContent,
              JSON.stringify(card.contentData),
              JSON.stringify(card.topics),
              card.keywords,
              fileData.meeting_date,
              fileData.meeting_title,
              fileData.meeting_id || null,
            ]
          );
        } catch (insertError) {
          console.error('Failed to insert question card:', insertError);
        }
      }
      console.log(`${questionCards.length}枚の質問カードを保存しました`);
    }

    return NextResponse.json({
      success: true,
      data: {
        file_id: fileData.id,
        file_name: fileData.file_name,
        extractedText: extractedText.substring(0, 1000),
        statements: statements.slice(0, 50),
        councilMembers,
        questionCounts,
        stats,
        sessions: parsedSessions.sessions.slice(0, 20),
        sessionSummaries,
        answererCounts: Object.fromEntries(sessionStats.answererCounts),
        sessionAnalyses,
        overallAnalysis,
      },
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      {
        error: '解析処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
