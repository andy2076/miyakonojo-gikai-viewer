import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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

// CommonJSモジュール
const PDFParser = require('pdf2json');
const mammoth = require('mammoth');

/**
 * ファイル解析API
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

    // リクエストボディからfile_idを取得
    const body = await request.json();
    const { file_id } = body;

    if (!file_id) {
      return NextResponse.json(
        { error: 'file_idが必要です' },
        { status: 400 }
      );
    }

    // データベースからファイル情報を取得
    const { data: fileData, error: fileError } = await supabase
      .from('minutes_files')
      .select('*')
      .eq('id', file_id)
      .single();

    if (fileError || !fileData) {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 404 }
      );
    }

    // Supabase Storageからファイルを取得
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('minutes-files')
      .download(fileData.storage_path);

    if (downloadError || !fileBlob) {
      return NextResponse.json(
        { error: `ファイルのダウンロードに失敗しました: ${downloadError?.message}` },
        { status: 500 }
      );
    }

    // ファイルタイプに応じてテキストを抽出
    let extractedText = '';

    if (fileData.file_type === 'application/pdf') {
      // PDFを解析 (pdf2json使用)
      try {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // pdf2jsonはPromiseベースではないため、Promiseでラップ
        extractedText = await new Promise<string>((resolve, reject) => {
          const pdfParser = new PDFParser();

          pdfParser.on('pdfParser_dataError', (errData: any) => {
            reject(new Error(errData.parserError || 'PDF解析エラー'));
          });

          pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            try {
              // ページごとにテキストを抽出
              const pages = pdfData.Pages || [];
              let allText = '';

              pages.forEach((page: any) => {
                const texts = page.Texts || [];

                // Y座標でグループ化（同じ行のテキストをまとめる）
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

                // Y座標でソートして行ごとに結合
                const sortedLines = Array.from(lineMap.entries())
                  .sort((a, b) => a[0] - b[0]);

                sortedLines.forEach(([y, lineTexts]) => {
                  allText += lineTexts.join('') + '\n';
                });

                // ページの最後に改行を追加
                allText += '\n';
              });

              // ○マーカーの前に改行を挿入（発言者を独立した行にする）
              // 既に行頭にある○は除外し、文中の○の前にのみ改行を追加
              allText = allText.replace(/([^\n])○/g, '$1\n○');

              resolve(allText);
            } catch (err) {
              reject(err);
            }
          });

          // バッファを解析
          pdfParser.parseBuffer(buffer);
        });
      } catch (pdfError) {
        console.error('PDF parse error:', pdfError);
        return NextResponse.json(
          {
            error: `PDFファイルの解析に失敗しました: ${
              pdfError instanceof Error ? pdfError.message : 'Unknown error'
            }`,
            details: 'ファイルが破損しているか、パスワード保護されている可能性があります。'
          },
          { status: 500 }
        );
      }
    } else if (
      fileData.file_type === 'application/msword' ||
      fileData.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      // DOC/DOCXを解析
      try {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;

        // mammothの警告メッセージがあればログに出力
        if (result.messages && result.messages.length > 0) {
          console.log('Mammoth warnings:', result.messages);
        }
      } catch (mammothError) {
        console.error('Mammoth parse error:', mammothError);
        return NextResponse.json(
          {
            error: `DOC/DOCXファイルの解析に失敗しました: ${
              mammothError instanceof Error ? mammothError.message : 'Unknown error'
            }`,
            details: 'ファイルが破損しているか、サポートされていない形式の可能性があります。PDFファイルでお試しください。'
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です' },
        { status: 400 }
      );
    }

    // セッションベースで解析
    const parsedSessions = parseSessionBasedMinutes(extractedText);
    const sessionStats = generateSessionStats(parsedSessions);

    // セッションサマリーを生成
    const sessionSummaries = parsedSessions.sessions.map((session) =>
      generateSessionSummary(session)
    );

    // コンテンツ分析を実行
    const sessionAnalyses = parsedSessions.sessions.map((session) =>
      analyzeSession(session)
    );
    const overallAnalysis = analyzeOverall(parsedSessions.sessions);

    // 従来の方法でも解析（互換性のため）
    const statements = parseMinutes(extractedText);
    const councilMembers = extractCouncilMembers(statements);
    const questionCounts = countQuestionsByMember(statements);

    // 統計情報
    const stats = {
      totalStatements: statements.length,
      totalQuestions: statements.filter((s) => s.type === 'question').length,
      totalAnswers: statements.filter((s) => s.type === 'answer').length,
      councilMembers: councilMembers.length,
      // セッション統計を追加
      totalSessions: sessionStats.totalSessions,
      sessionQuestions: sessionStats.totalQuestions,
      sessionAnswers: sessionStats.totalAnswers,
    };

    // 解析結果をデータベースに保存
    const { error: updateError } = await supabase
      .from('minutes_files')
      .update({
        processed: true,
        analysis_data: {
          sessionAnalyses,
          overallAnalysis,
          stats,
          sessionSummaries,
          answererCounts: Object.fromEntries(sessionStats.answererCounts),
        },
      })
      .eq('id', file_id);

    if (updateError) {
      console.error('Failed to update analysis data:', updateError);
      // エラーでも解析結果は返す
    }

    // 質問カードを生成・保存
    const questionCards = generateQuestionCards(sessionAnalyses);
    console.log(`生成された質問カード数: ${questionCards.length}`);

    // 既存のカードを削除（再解析の場合）
    const { error: deleteError } = await supabase
      .from('question_cards')
      .delete()
      .eq('file_id', file_id);

    if (deleteError) {
      console.error('Failed to delete old question cards:', deleteError);
    }

    // 新しいカードを保存
    if (questionCards.length > 0) {
      const cardsToInsert = questionCards.map((card) => ({
        file_id: file_id,
        member_name: card.memberName,
        question_text: card.questionText,
        question_summary: card.questionSummary,
        answer_texts: card.answerTexts,
        answerers: card.answerers,
        answer_summary: card.answerSummary,
        full_content: card.fullContent,
        content_data: card.contentData,
        topics: card.topics,
        keywords: card.keywords,
        meeting_date: fileData.meeting_date,
        meeting_title: fileData.meeting_title,
        meeting_id: fileData.meeting_id || null,
        published: false, // デフォルトは非公開
      }));

      const { error: insertError } = await supabase
        .from('question_cards')
        .insert(cardsToInsert);

      if (insertError) {
        console.error('Failed to insert question cards:', insertError);
      } else {
        console.log(`${questionCards.length}枚の質問カードを保存しました`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        file_id: fileData.id,
        file_name: fileData.file_name,
        extractedText: extractedText.substring(0, 1000), // 最初の1000文字のみ
        statements: statements.slice(0, 50), // 最初の50件のみ（従来互換）
        councilMembers,
        questionCounts,
        stats,
        // セッション情報を追加
        sessions: parsedSessions.sessions.slice(0, 20), // 最初の20セッション
        sessionSummaries,
        answererCounts: Object.fromEntries(sessionStats.answererCounts),
        // コンテンツ分析を追加
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
