import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * 公開議事録一覧取得API
 */
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, file_name, meeting_date, meeting_title, uploaded_at, analysis_data
       FROM minutes_files
       WHERE processed = true AND published = true
       ORDER BY meeting_date DESC NULLS LAST, uploaded_at DESC`
    );

    const formattedMinutes = result.rows.map((minute: any) => {
      const analysisData = minute.analysis_data;
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

    return NextResponse.json({ success: true, data: formattedMinutes });
  } catch (error) {
    console.error('Error fetching minutes:', error);
    return NextResponse.json({ error: '議事録の取得中にエラーが発生しました' }, { status: 500 });
  }
}
