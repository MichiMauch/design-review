import { getDb, initDatabase } from '../../../../../lib/db.js';
import { getUser } from '../../../../../lib/auth.js';

export async function GET() {
  try {
    // Check authentication and admin role
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    await initDatabase();
    const db = getDb();

    // Get all users with their project access in one query
    const usersResult = await db.execute({
      sql: 'SELECT id, email, name, role, created_at, last_login FROM authorized_users ORDER BY created_at DESC'
    });

    // Get project access for all users
    const projectAccessResult = await db.execute({
      sql: `
        SELECT 
          au.id as user_id,
          p.id as project_id,
          p.name as project_name,
          p.domain as project_domain
        FROM authorized_users au
        LEFT JOIN user_project_access upa ON au.email = upa.user_email
        LEFT JOIN projects p ON upa.project_id = p.id
        ORDER BY au.id, p.name
      `
    });

    // Group project access by user
    const projectAccessByUser = {};
    projectAccessResult.rows.forEach(row => {
      if (!projectAccessByUser[row.user_id]) {
        projectAccessByUser[row.user_id] = [];
      }
      // Only add projects that exist (not NULL from LEFT JOIN)
      if (row.project_id) {
        projectAccessByUser[row.user_id].push({
          id: row.project_id,
          name: row.project_name,
          domain: row.project_domain
        });
      }
    });

    // Combine users with their project access
    const usersWithProjects = usersResult.rows.map(user => ({
      ...user,
      projects: projectAccessByUser[user.id] || []
    }));

    return Response.json({
      success: true,
      users: usersWithProjects
    });

  } catch (error) {
    console.error('Error loading users:', error);
    return Response.json(
      { success: false, error: 'Fehler beim Laden der Benutzer' },
      { status: 500 }
    );
  }
}

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

    const { email, name, role } = await request.json();

    // Validation
    if (!email || !name || !role) {
      return Response.json(
        { success: false, error: 'E-Mail, Name und Rolle sind erforderlich' },
        { status: 400 }
      );
    }

    if (!email.includes('@')) {
      return Response.json(
        { success: false, error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    if (!['admin', 'user'].includes(role)) {
      return Response.json(
        { success: false, error: 'Rolle muss "admin" oder "user" sein' },
        { status: 400 }
      );
    }

    await initDatabase();
    const db = getDb();

    try {
      const result = await db.execute({
        sql: 'INSERT INTO authorized_users (email, name, role) VALUES (?, ?, ?)',
        args: [email.toLowerCase().trim(), name.trim(), role]
      });

      return Response.json({
        success: true,
        message: 'Benutzer erfolgreich erstellt',
        user: {
          id: Number(result.lastInsertRowid),
          email: email.toLowerCase().trim(),
          name: name.trim(),
          role: role
        }
      });

    } catch (dbError) {
      console.error('Database error creating user:', dbError);
      if (dbError.message && dbError.message.includes('UNIQUE constraint failed')) {
        return Response.json(
          { success: false, error: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits' },
          { status: 409 }
        );
      }
      throw dbError;
    }

  } catch (error) {
    console.error('Error creating user:', error);
    return Response.json(
      { success: false, error: 'Fehler beim Erstellen des Benutzers' },
      { status: 500 }
    );
  }
}