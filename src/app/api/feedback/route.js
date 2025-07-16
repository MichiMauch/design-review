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
    if (!data.text || !data.url || !data.project_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const db = getDb();
    
    // Insert feedback into database
    const result = await db.execute({
      sql: `
        INSERT INTO feedback (title, text, url, screenshot, user_agent, project_id, selected_area, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `,
      args: [
        data.title || 'Feedback',
        data.text,
        data.url,
        data.screenshot || null,
        data.user_agent || '',
        data.project_id,
        data.selected_area ? JSON.stringify(data.selected_area) : null
      ]
    });

    return NextResponse.json({
      success: true,
      id: Number(result.lastInsertRowid),
      message: 'Feedback saved successfully'
    }, {
      headers: corsHeaders()
    });

  } catch (error) {
    console.error('Feedback API error:', error);
    
    // Bei Tabellen-Fehler versuchen wir die Datenbank zu initialisieren
    if (error.message && error.message.includes('no such table')) {
      try {
        await initDatabase();
        // Retry nach Initialisierung
        return await POST(request);
      } catch (initError) {
        console.error('Database initialization failed:', initError);
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project');

    const db = getDb();
    let result;

    if (projectId) {
      result = await db.execute({
        sql: 'SELECT * FROM feedback WHERE project_id = ? ORDER BY created_at DESC',
        args: [projectId]
      });
    } else {
      result = await db.execute('SELECT * FROM feedback ORDER BY created_at DESC');
    }

    return NextResponse.json({
      success: true,
      feedback: result.rows
    }, {
      headers: corsHeaders()
    });

  } catch (error) {
    console.error('Feedback GET API error:', error);
    
    // Bei Tabellen-Fehler versuchen wir die Datenbank zu initialisieren
    if (error.message && error.message.includes('no such table')) {
      try {
        await initDatabase();
        return NextResponse.json({
          success: true,
          feedback: []
        }, {
          headers: corsHeaders()
        });
      } catch (initError) {
        console.error('Database initialization failed:', initError);
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}