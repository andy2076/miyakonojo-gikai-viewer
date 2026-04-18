import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * 可決トピックの一覧を取得・作成するAPI
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const meetingTitle = searchParams.get('meeting_title');

    let query = 'SELECT * FROM meeting_topics WHERE published = true';
    const params: any[] = [];

    if (meetingTitle) {
      query += ' AND meeting_title = $1';
      params.push(meetingTitle);
    }

    query += ' ORDER BY display_order ASC';

    const result = await pool.query(query, params);

    return NextResponse.json({
      topics: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Meeting topics API error:', error);
    return NextResponse.json(
      { error: '可決トピック取得中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meeting_title, title, date, description, content_data, summary, supplementary_budget, total_budget_after, published = false } = body;

    if (!meeting_title || !title || !content_data) {
      return NextResponse.json({ error: 'meeting_title, title, content_dataは必須です' }, { status: 400 });
    }

    // 既存チェック
    const existing = await pool.query(
      'SELECT id FROM meeting_topics WHERE meeting_title = $1 LIMIT 1',
      [meeting_title]
    );

    if (existing.rows.length > 0) {
      const result = await pool.query(
        `UPDATE meeting_topics SET title = $1, date = $2, description = $3, content_data = $4, summary = $5, supplementary_budget = $6, total_budget_after = $7, published = $8, updated_at = NOW() WHERE id = $9 RETURNING *`,
        [title, date, description, JSON.stringify(content_data), summary ? JSON.stringify(summary) : null, supplementary_budget ? JSON.stringify(supplementary_budget) : null, total_budget_after, published, existing.rows[0].id]
      );
      return NextResponse.json({ topic: result.rows[0], updated: true });
    } else {
      const result = await pool.query(
        `INSERT INTO meeting_topics (meeting_title, title, date, description, content_data, summary, supplementary_budget, total_budget_after, published) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [meeting_title, title, date, description, JSON.stringify(content_data), summary ? JSON.stringify(summary) : null, supplementary_budget ? JSON.stringify(supplementary_budget) : null, total_budget_after, published]
      );
      return NextResponse.json({ topic: result.rows[0], created: true });
    }
  } catch (error) {
    console.error('Meeting topics API error:', error);
    return NextResponse.json(
      { error: '可決トピック処理中にエラーが発生しました', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
