import { getDb, initDatabase } from '../../../../lib/db.js';

export async function POST(request) {
  try {
    const { name, domain } = await request.json();

    if (!name || !domain) {
      return new Response('Name und Domain sind erforderlich', { status: 400 });
    }

    // Ensure database is initialized
    await initDatabase();
    const db = getDb();

    // Check if project name already exists
    const existingProject = await db.execute({
      sql: 'SELECT id FROM projects WHERE name = ?',
      args: [name]
    });

    if (existingProject.rows.length > 0) {
      return new Response('Ein Projekt mit diesem Namen existiert bereits', { status: 409 });
    }

    // Create new project
    const result = await db.execute({
      sql: `
        INSERT INTO projects (name, domain, widget_installed, created_at)
        VALUES (?, ?, FALSE, datetime('now'))
      `,
      args: [name, domain]
    });

    const projectId = Number(result.lastInsertRowid);

    return Response.json({
      id: projectId,
      name,
      domain,
      widget_installed: false,
      created_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating project:', error);
    return new Response('Fehler beim Erstellen des Projekts', { status: 500 });
  }
}

export async function GET() {
  try {
    // Ensure database is initialized
    await initDatabase();
    const db = getDb();

    const result = await db.execute(`
      SELECT 
        p.*,
        COUNT(t.id) as task_count
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    return Response.json(result.rows);

  } catch (error) {
    console.error('Error fetching projects:', error);
    return new Response('Fehler beim Laden der Projekte', { status: 500 });
  }
}