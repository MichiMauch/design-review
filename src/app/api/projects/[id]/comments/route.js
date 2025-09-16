import { getDb, initDatabase } from '../../../../../../lib/db.js';

function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

    // Get all comments for all tasks in this project with task information
    const comments = await db.execute({
      sql: `
        SELECT
          tc.id,
          tc.comment_text,
          tc.author,
          tc.created_at,
          tc.task_id,
          t.title as task_title
        FROM task_comments tc
        JOIN tasks t ON tc.task_id = t.id
        WHERE t.project_id = ?
        ORDER BY tc.created_at DESC
      `,
      args: [resolvedParams.id]
    });

    return addCorsHeaders(Response.json({
      success: true,
      comments: comments.rows
    }));

  } catch (error) {
    console.error('Error loading project comments:', error);
    return addCorsHeaders(Response.json({
      success: false,
      error: 'Fehler beim Laden der Kommentare',
      details: error.message
    }, { status: 500 }));
  }
}