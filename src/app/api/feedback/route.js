import { NextResponse } from 'next/server';
import { getDb, initDatabase } from '../../../../lib/db.js';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.text || !data.url || !data.projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getDb();
    
    // Insert feedback into database
    const result = await db.execute({
      sql: `
        INSERT INTO feedback (text, url, screenshot, user_agent, project_id, selected_area, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `,
      args: [
        data.text,
        data.url,
        data.screenshot || null,
        data.userAgent || '',
        data.projectId,
        data.selectedArea ? JSON.stringify(data.selectedArea) : null
      ]
    });

    return NextResponse.json({
      success: true,
      id: Number(result.lastInsertRowid),
      message: 'Feedback saved successfully'
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
      { status: 500 }
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
        });
      } catch (initError) {
        console.error('Database initialization failed:', initError);
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}