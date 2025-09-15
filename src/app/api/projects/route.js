import { getDb, initDatabase } from '../../../../lib/db.js';
import { getUser } from '../../../../lib/auth.js';

export async function POST(request) {
  try {
    // Check authentication and admin role
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

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

  } catch {
    return new Response('Fehler beim Erstellen des Projekts', { status: 500 });
  }
}

export async function GET() {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return Response.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Ensure database is initialized
    await initDatabase();
    const db = getDb();

    let projectsResult;
    
    if (user.role === 'admin') {
      // Admin sees all projects
      projectsResult = await db.execute(`
        SELECT * FROM projects ORDER BY created_at DESC
      `);
    } else {
      // Non-admin sees only assigned projects
      projectsResult = await db.execute(`
        SELECT p.* FROM projects p
        JOIN user_project_access upa ON p.id = upa.project_id
        WHERE upa.user_email = ?
        ORDER BY p.created_at DESC
      `, [user.email]);
    }

    // Get tasks based on user access
    let tasksResult;
    
    if (user.role === 'admin') {
      // Admin sees all tasks
      tasksResult = await db.execute(`
        SELECT * FROM tasks ORDER BY created_at DESC
      `);
    } else {
      // Non-admin sees only tasks from assigned projects
      tasksResult = await db.execute(`
        SELECT t.* FROM tasks t
        JOIN user_project_access upa ON t.project_id = upa.project_id
        WHERE upa.user_email = ?
        ORDER BY t.created_at DESC
      `, [user.email]);
    }

    // Group tasks by project_id
    const tasksByProject = {};
    tasksResult.rows.forEach(task => {
      if (!tasksByProject[task.project_id]) {
        tasksByProject[task.project_id] = [];
      }
      tasksByProject[task.project_id].push(task);
    });

    // Get users for each project
    const usersResult = await db.execute(`
      SELECT
        au.id,
        au.name,
        au.email,
        au.role,
        upa.project_id
      FROM authorized_users au
      INNER JOIN user_project_access upa ON au.email = upa.user_email
      ORDER BY au.name ASC
    `);

    // Group users by project_id
    const usersByProject = {};
    usersResult.rows.forEach(user => {
      if (!usersByProject[user.project_id]) {
        usersByProject[user.project_id] = [];
      }
      usersByProject[user.project_id].push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        initials: user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      });
    });

    // Add tasks and users to projects
    const projectsWithTasksAndUsers = projectsResult.rows.map(project => ({
      ...project,
      tasks: tasksByProject[project.id] || [],
      users: usersByProject[project.id] || []
    }));

    return Response.json(projectsWithTasksAndUsers);

  } catch {
    return new Response('Fehler beim Laden der Projekte', { status: 500 });
  }
}