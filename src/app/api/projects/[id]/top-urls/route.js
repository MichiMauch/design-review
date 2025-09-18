import { NextResponse } from 'next/server';
import { getDb, initDatabase } from '../../../../../../lib/db.js';

function addCors(res) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function OPTIONS() {
  return addCors(new Response(null, { status: 200 }));
}

export async function GET(request, { params }) {
  try {
    await initDatabase();
    const db = getDb();

    const projectId = (await params).id;

    const result = await db.execute({
      sql: `
        SELECT url, COUNT(*) AS count
        FROM tasks
        WHERE project_id = ? AND url IS NOT NULL AND url != ''
        GROUP BY url
        ORDER BY count DESC
        LIMIT 5
      `,
      args: [projectId]
    });

    return addCors(NextResponse.json({ success: true, topUrls: result.rows }));
  } catch (e) {
    return addCors(NextResponse.json({ success: false, error: 'Failed to load top URLs' }, { status: 500 }));
  }
}

