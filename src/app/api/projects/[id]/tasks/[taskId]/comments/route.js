import { getDb, initDatabase } from '../../../../../../../../lib/db.js';

function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new Response(null, { status: 200 }));
}

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    
    await initDatabase();
    const db = getDb();

    const comments = await db.execute({
      sql: `SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC`,
      args: [resolvedParams.taskId]
    });

    return addCorsHeaders(Response.json({
      success: true,
      comments: comments.rows
    }));

  } catch (error) {
    return addCorsHeaders(Response.json({ 
      success: false, 
      error: 'Fehler beim Laden der Kommentare',
      details: error.message 
    }, { status: 500 }));
  }
}

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const requestBody = await request.json();
    
    const { comment_text, author } = requestBody;

    if (!comment_text || !comment_text.trim()) {
      return addCorsHeaders(new Response('Kommentar-Text ist erforderlich', { status: 400 }));
    }

    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: `
        INSERT INTO task_comments (task_id, comment_text, author)
        VALUES (?, ?, ?)
      `,
      args: [
        resolvedParams.taskId,
        comment_text.trim(),
        author || null
      ]
    });

    // Fetch the newly created comment
    const newComment = await db.execute({
      sql: `SELECT * FROM task_comments WHERE id = ?`,
      args: [result.lastInsertRowid]
    });

    return addCorsHeaders(Response.json({
      success: true,
      message: 'Kommentar erfolgreich hinzugefügt',
      comment: newComment.rows[0]
    }));

  } catch (error) {
    return addCorsHeaders(Response.json({ 
      success: false, 
      error: 'Fehler beim Hinzufügen des Kommentars',
      details: error.message 
    }, { status: 500 }));
  }
}

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return addCorsHeaders(new Response('Kommentar-ID ist erforderlich', { status: 400 }));
    }

    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: 'DELETE FROM task_comments WHERE id = ? AND task_id = ?',
      args: [commentId, resolvedParams.taskId]
    });

    if (result.rowsAffected === 0) {
      return addCorsHeaders(new Response('Kommentar nicht gefunden', { status: 404 }));
    }

    return addCorsHeaders(Response.json({
      success: true,
      message: 'Kommentar erfolgreich gelöscht'
    }));

  } catch (error) {
    return addCorsHeaders(Response.json({ 
      success: false, 
      error: 'Fehler beim Löschen des Kommentars',
      details: error.message 
    }, { status: 500 }));
  }
}