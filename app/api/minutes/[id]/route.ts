import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * 公開議事録詳細取得API（一般ユーザー向け）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Supabase設定チェック
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabaseが設定されていません' },
        { status: 503 }
      );
    }

    // 公開されている議事録の詳細を取得
    const { data: minute, error } = await supabase
      .from('minutes_files')
      .select('id, file_name, meeting_date, meeting_title, uploaded_at, analysis_data')
      .eq('id', id)
      .eq('processed', true)
      .eq('published', true)
      .single();

    if (error || !minute) {
      return NextResponse.json(
        { error: '議事録が見つかりません' },
        { status: 404 }
      );
    }

    const analysisData = minute.analysis_data as any;

    // 詳細データを整形
    const minuteDetail = {
      id: minute.id,
      fileName: minute.file_name,
      meetingDate: minute.meeting_date,
      meetingTitle: minute.meeting_title,
      uploadedAt: minute.uploaded_at,
      sessionAnalyses: analysisData?.sessionAnalyses || [],
      overallAnalysis: analysisData?.overallAnalysis || null,
      stats: analysisData?.stats || null,
      sessionSummaries: analysisData?.sessionSummaries || [],
      answererCounts: analysisData?.answererCounts || {},
    };

    return NextResponse.json({
      success: true,
      data: minuteDetail,
    });
  } catch (error) {
    console.error('Error fetching minute detail:', error);
    return NextResponse.json(
      { error: '議事録の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
