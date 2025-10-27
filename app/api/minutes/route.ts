import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 公開議事録一覧取得API（一般ユーザー向け）
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

    // 公開されている議事録のみを取得
    const { data: minutes, error } = await supabase
      .from('minutes_files')
      .select('id, file_name, meeting_date, meeting_title, uploaded_at, analysis_data')
      .eq('processed', true)
      .eq('published', true)
      .order('meeting_date', { ascending: false, nullsFirst: false })
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch minutes:', error);
      return NextResponse.json(
        { error: '議事録の取得に失敗しました' },
        { status: 500 }
      );
    }

    // レスポンスデータを整形
    const formattedMinutes = minutes.map((minute) => {
      const analysisData = minute.analysis_data as any;

      return {
        id: minute.id,
        fileName: minute.file_name,
        meetingDate: minute.meeting_date,
        meetingTitle: minute.meeting_title,
        uploadedAt: minute.uploaded_at,
        stats: analysisData?.stats || null,
        summary: analysisData?.overallAnalysis ? {
          totalQuestions: analysisData.overallAnalysis.totalQuestions,
          totalAnswers: analysisData.overallAnalysis.totalAnswers,
          topKeywords: analysisData.overallAnalysis.topKeywords?.slice(0, 5) || [],
          topicDistribution: analysisData.overallAnalysis.topicDistribution?.slice(0, 3) || [],
        } : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedMinutes,
    });
  } catch (error) {
    console.error('Error fetching minutes:', error);
    return NextResponse.json(
      { error: '議事録の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
