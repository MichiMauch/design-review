import { getDb, initDatabase } from '../../../../../../lib/db.js';

export async function GET(request, { params }) {
  try {
    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: 'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
      args: [params.id]
    });

    return Response.json(result.rows);

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return new Response('Fehler beim Laden der Tasks', { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { title, description, screenshot, url, selected_area } = await request.json();

    if (!title || !url) {
      return new Response('Titel und URL sind erforderlich', { status: 400 });
    }

    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: `
        INSERT INTO tasks (project_id, title, description, screenshot, url, selected_area, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      args: [
        params.id,
        title,
        description || null,
        screenshot || null,
        url,
        selected_area ? JSON.stringify(selected_area) : null
      ]
    });

    const taskId = Number(result.lastInsertRowid);

    return Response.json({
      id: taskId,
      project_id: Number(params.id),
      title,
      description,
      screenshot,
      url,
      status: 'open',
      selected_area,
      created_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating task:', error);
    return new Response('Fehler beim Erstellen der Task', { status: 500 });
  }
}