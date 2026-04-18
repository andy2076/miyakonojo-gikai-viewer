import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';
import { parseSessionBasedMinutes } from '@/lib/session-parser';
import { analyzeSession } from '@/lib/content-analyzer';
import { generateQuestionCards } from '@/lib/card-generator';
import fs from 'fs/promises';
import path from 'path';

// CommonJSモジュール
const PDFParser = require('pdf2json');
const mammoth = require('mammoth');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');

/**
 * 全ファイルを再解析してカードを再生成するAPI
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 全ファイルを取得
    const filesResult = await pool.query(
      'SELECT * FROM minutes_files WHERE processed = true'
    );
    const files = filesResult.rows;

    console.log(`取得したファイル数: ${files.length}`);

    if (files.length === 0) {
      return NextResponse.json({
        success: true,
        message: '再解析するファイルがありません',
        processedFiles: 0,
        generatedCards: 0,
      });
    }

    let totalCardsGenerated = 0;
    let processedFilesCount = 0;

    for (const file of files) {
      try {
        console.log(`ファイル処理開始: ${file.file_name} (ID: ${file.id})`);

        if (!file.storage_path) {
          console.warn(`File ${file.id} has no storage_path, skipping`);
          continue;
        }

        // ローカルファイルシステムからファイルを読み込み
        const filePath = path.join(UPLOAD_DIR, file.storage_path);
        let fileBuffer: Buffer;
        try {
          fileBuffer = await fs.readFile(filePath);
        } catch {
          console.error(`Failed to read file ${file.id}: ${file.storage_path}`);
          continue;
        }

        console.log(`ファイル読み込み成功: ${file.file_name}`);

        // ファイルタイプに応じてテキストを抽出
        let extractedText = '';

        if (file.file_type === 'application/pdf') {
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

                    const sortedLines = Array.from(lineMap.entries()).sort((a, b) => a[0] - b[0]);
                    sortedLines.forEach(([y, lineTexts]) => {
                      allText += lineTexts.join('') + '\n';
                    });
                    allText += '\n';
                  });

                  allText = allText.replace(/([^\n])○/g, '$1\n○');
                  resolve(allText);
                } catch (err) {
                  reject(err);
                }
              });

              pdfParser.parseBuffer(fileBuffer);
            });
          } catch (pdfError) {
            console.error(`PDF解析エラー:`, pdfError);
            continue;
          }
        } else if (
          file.file_type === 'application/msword' ||
          file.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          try {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            extractedText = result.value;
          } catch (mammothError) {
            console.error(`DOCX解析エラー:`, mammothError);
            continue;
          }
        } else {
          console.warn(`サポートされていないファイル形式: ${file.file_type}`);
          continue;
        }

        console.log(`テキスト長: ${extractedText.length}文字`);

        // セッション解析
        const parsed = parseSessionBasedMinutes(extractedText);
        console.log(`セッション数: ${parsed.sessions.length}`);

        const sessionAnalyses = parsed.sessions.map((session) =>
          analyzeSession(session)
        );

        // カードを生成
        const cards = generateQuestionCards(sessionAnalyses);
        console.log(`生成されたカード数: ${cards.length}`);

        // カードをデータベースに保存
        for (const card of cards) {
          try {
            await pool.query(
              `INSERT INTO question_cards (
                file_id, meeting_id, meeting_title, meeting_date,
                member_name, question_text, question_summary,
                answer_texts, answerers, answer_summary,
                topics, keywords, full_content, content_data, published
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, false)`,
              [
                file.id,
                file.meeting_id || null,
                file.meeting_title,
                file.meeting_date,
                card.memberName,
                card.questionText,
                card.questionSummary,
                JSON.stringify(card.answerTexts),
                JSON.stringify(card.answerers),
                card.answerSummary,
                JSON.stringify(card.topics),
                card.keywords,
                card.fullContent,
                JSON.stringify(card.contentData),
              ]
            );
            totalCardsGenerated++;
          } catch (insertError) {
            console.error('Failed to insert card:', insertError);
          }
        }

        console.log(`ファイル処理完了: ${file.file_name} - ${cards.length}枚のカードを保存`);
        processedFilesCount++;
      } catch (fileError) {
        console.error(`Error processing file ${file.id}:`, fileError);
      }
    }

    console.log(`再解析完了: ${processedFilesCount}/${files.length}ファイル処理, ${totalCardsGenerated}枚のカード生成`);

    return NextResponse.json({
      success: true,
      processedFiles: processedFilesCount,
      totalFiles: files.length,
      generatedCards: totalCardsGenerated,
    });
  } catch (error) {
    console.error('Reparse error:', error);
    return NextResponse.json(
      {
        error: '再解析中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
