import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * 公開議事録詳細取得API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(
      `SELECT id, file_name, meeting_date, meeting_title, uploaded_at, analysis_data
       FROM minutes_files
       WHERE id = $1 AND processed = true AND published = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '議事録が見つかりません' }, { status: 404 });
    }

    const minute = result.rows[0];
    const analysisData = minute.analysis_data;

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error('Error fetching minute detail:', error);
    return NextResponse.json({ error: '議事録の取得中にエラーが発生しました' }, { status: 500 });
  }
}
