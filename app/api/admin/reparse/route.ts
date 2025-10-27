import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { parseSessionBasedMinutes } from '@/lib/session-parser';
import { analyzeSession } from '@/lib/content-analyzer';
import { generateQuestionCards } from '@/lib/card-generator';

// CommonJSモジュール
const PDFParser = require('pdf2json');
const mammoth = require('mammoth');

/**
 * 全ファイルを再解析してカードを再生成するAPI
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // Supabase設定チェック
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 503 }
      );
    }

    // 全ファイルを取得
    const { data: files, error: fetchError } = await supabase
      .from('minutes_files')
      .select('*')
      .eq('processed', true);

    if (fetchError) {
      console.error('Failed to fetch files:', fetchError);
      return NextResponse.json(
        { error: 'ファイルの取得に失敗しました' },
        { status: 500 }
      );
    }

    console.log(`📁 取得したファイル数: ${files?.length || 0}`);

    if (!files || files.length === 0) {
      console.log('⚠️ 再解析するファイルがありません');
      return NextResponse.json({
        success: true,
        message: '再解析するファイルがありません',
        processedFiles: 0,
        generatedCards: 0,
      });
    }

    let totalCardsGenerated = 0;
    let processedFilesCount = 0;

    // 各ファイルを再解析
    for (const file of files) {
      try {
        console.log(`\n🔄 ファイル処理開始: ${file.file_name} (ID: ${file.id})`);

        if (!file.storage_path) {
          console.warn(`⚠️ File ${file.id} has no storage_path, skipping`);
          continue;
        }

        // Supabase Storageからファイルを取得
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('minutes-files')
          .download(file.storage_path);

        if (downloadError || !fileData) {
          console.error(`❌ Failed to download file ${file.id}:`, downloadError);
          continue;
        }

        console.log(`✅ ファイルダウンロード成功: ${file.file_name}`);

        // ファイルタイプに応じてテキストを抽出
        let extractedText = '';

        if (file.file_type === 'application/pdf') {
          // PDFを解析
          try {
            const arrayBuffer = await fileData.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

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

                  // ○マーカーの前に改行を挿入
                  allText = allText.replace(/([^\n])○/g, '$1\n○');
                  resolve(allText);
                } catch (err) {
                  reject(err);
                }
              });

              pdfParser.parseBuffer(buffer);
            });
          } catch (pdfError) {
            console.error(`❌ PDF解析エラー:`, pdfError);
            continue;
          }
        } else if (
          file.file_type === 'application/msword' ||
          file.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          // DOC/DOCXを解析
          try {
            const arrayBuffer = await fileData.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const result = await mammoth.extractRawText({ buffer });
            extractedText = result.value;
          } catch (mammothError) {
            console.error(`❌ DOCX解析エラー:`, mammothError);
            continue;
          }
        } else {
          console.warn(`⚠️ サポートされていないファイル形式: ${file.file_type}`);
          continue;
        }

        console.log(`📄 テキスト長: ${extractedText.length}文字`);

        // セッション解析
        const parsed = parseSessionBasedMinutes(extractedText);
        console.log(`🎯 セッション数: ${parsed.sessions.length}`);

        // セッションごとに分析
        const sessionAnalyses = parsed.sessions.map((session) =>
          analyzeSession(session)
        );

        // カードを生成
        const cards = generateQuestionCards(sessionAnalyses);
        console.log(`🎴 生成されたカード数: ${cards.length}`);

        // カードをデータベースに保存
        for (const card of cards) {
          const cardData = {
            file_id: file.id,
            meeting_id: file.meeting_id || null,
            meeting_title: file.meeting_title,
            meeting_date: file.meeting_date,
            member_name: card.memberName,
            question_text: card.questionText,
            question_summary: card.questionSummary,
            answer_texts: card.answerTexts,
            answerers: card.answerers,
            answer_summary: card.answerSummary,
            topics: card.topics,
            keywords: card.keywords,
            full_content: card.fullContent,
            content_data: card.contentData,
            published: false,
          };

          const { error: insertError } = await supabase
            .from('question_cards')
            .insert(cardData);

          if (insertError) {
            console.error('❌ Failed to insert card:', insertError);
          } else {
            totalCardsGenerated++;
          }
        }

        console.log(`✅ ファイル処理完了: ${file.file_name} - ${cards.length}枚のカードを保存`);
        processedFilesCount++;
      } catch (fileError) {
        console.error(`❌ Error processing file ${file.id}:`, fileError);
        // エラーがあっても次のファイルに進む
      }
    }

    console.log(`\n📊 再解析完了: ${processedFilesCount}/${files.length}ファイル処理, ${totalCardsGenerated}枚のカード生成`);

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
