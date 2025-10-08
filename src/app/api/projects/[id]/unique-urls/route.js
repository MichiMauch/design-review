import { NextResponse } from 'next/server';
import { getDb, initDatabase } from '../../../../../../lib/db.js';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    await initDatabase();
    const db = getDb();

    // Get unique URLs from tasks for this project
    const result = await db.execute({
      sql: `
        SELECT DISTINCT url
        FROM tasks
        WHERE project_id = ?
          AND url IS NOT NULL
          AND url != ''
        ORDER BY url
      `,
      args: [projectId]
    });

    // Extract unique URLs
    const uniqueUrls = result.rows.map(row => row.url);

    // Also get the project domain
    const projectResult = await db.execute({
      sql: 'SELECT domain FROM projects WHERE id = ?',
      args: [projectId]
    });

    const projectDomain = projectResult.rows[0]?.domain || null;

    return NextResponse.json({
      success: true,
      projectDomain: projectDomain,
      taskUrls: uniqueUrls,
      totalUrls: uniqueUrls.length
    });

  } catch (error) {
    console.error('Error fetching unique URLs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}