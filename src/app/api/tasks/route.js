import { NextResponse } from 'next/server';
import { getDb, initDatabase } from '../../../../lib/db.js';

// Add CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.title || !data.url || !data.project_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const db = getDb();

    // Find the project by name to get its numeric ID
    let project;
    try {
        const projectResult = await db.execute({
            sql: 'SELECT id FROM projects WHERE name = ?',
            args: [data.project_id],
        });
        if (projectResult.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: `Project with name '${data.project_id}' not found.` },
                { status: 404, headers: corsHeaders() }
            );
        }
        project = projectResult.rows[0];
    } catch (e) {
        return NextResponse.json({ success: false, error: 'Failed to query projects' }, { status: 500, headers: corsHeaders() });
    }
    
    const projectId = project.id; // This is the numeric ID
    
    // Insert task into database
    const result = await db.execute({
      sql: `
        INSERT INTO tasks (project_id, title, description, screenshot, url, selected_area, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `,
      args: [
        projectId,
        data.title,
        data.description || '',
        data.screenshot || null,
        data.url,
        data.selected_area ? JSON.stringify(data.selected_area) : null
      ]
    });

    return NextResponse.json({
      success: true,
      id: Number(result.lastInsertRowid),
      project_id: projectId, // Return numeric project ID for PATCH updates
      message: 'Task saved successfully'
    }, {
      headers: corsHeaders()
    });

  } catch (error) {
    
    if (error.message && error.message.includes('no such table')) {
      try {
        await initDatabase();
        return await POST(request);
      } catch (initError) {
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}