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
        VALUES (?, ?, FALSE, datetime('now', 'localtime'))
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

    // Get all projects
    const projectsResult = await db.execute(`
      SELECT * FROM projects ORDER BY created_at DESC
    `);

    // Get all tasks for all projects
    const tasksResult = await db.execute(`
      SELECT * FROM tasks ORDER BY created_at DESC
    `);

    // Group tasks by project_id
    const tasksByProject = {};
    tasksResult.rows.forEach(task => {
      if (!tasksByProject[task.project_id]) {
        tasksByProject[task.project_id] = [];
      }
      tasksByProject[task.project_id].push(task);
    });

    // Add tasks to projects
    const projectsWithTasks = projectsResult.rows.map(project => ({
      ...project,
      tasks: tasksByProject[project.id] || []
    }));

    return Response.json(projectsWithTasks);

  } catch (error) {
    console.error('Error fetching projects:', error);
    return new Response('Fehler beim Laden der Projekte', { status: 500 });
  }
}