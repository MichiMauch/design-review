import { getDb, initDatabase } from '../../../../../../lib/db.js';

function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

    const result = await db.execute({
      sql: 'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
      args: [resolvedParams.id]
    });

    return addCorsHeaders(Response.json(result.rows));

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return addCorsHeaders(new Response('Fehler beim Laden der Tasks', { status: 500 }));
  }
}

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const { title, description, screenshot, url, selected_area } = await request.json();

    if (!title || !url) {
      return addCorsHeaders(new Response('Titel und URL sind erforderlich', { status: 400 }));
    }

    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: `
        INSERT INTO tasks (project_id, title, description, screenshot, url, selected_area, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      args: [
        resolvedParams.id,
        title,
        description || null,
        screenshot || null,
        url,
        selected_area ? JSON.stringify(selected_area) : null
      ]
    });

    const taskId = Number(result.lastInsertRowid);

    return addCorsHeaders(Response.json({
      id: taskId,
      project_id: Number(resolvedParams.id),
      title,
      description,
      screenshot,
      url,
      status: 'open',
      selected_area,
      created_at: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Error creating task:', error);
    return addCorsHeaders(new Response('Fehler beim Erstellen der Task', { status: 500 }));
  }
}