import { getDb, initDatabase } from '../../../../../../lib/db.js';
import { requireAuth, hasProjectAccess } from '../../../../../../lib/auth.js';

export async function GET(request, { params }) {
  try {
    const user = await requireAuth();
    const projectId = parseInt(params.id);

    if (!hasProjectAccess(user, projectId)) {
      return Response.json(
        { success: false, error: 'Project access required' },
        { status: 403 }
      );
    }

    await initDatabase();
    const db = getDb();

    // Get all users with access to this project
    const result = await db.execute({
      sql: `
        SELECT
          au.id,
          au.name,
          au.email,
          au.role,
          au.created_at,
          upa.created_at as access_granted_at
        FROM authorized_users au
        INNER JOIN user_project_access upa ON au.email = upa.user_email
        WHERE upa.project_id = ?
        ORDER BY au.name ASC
      `,
      args: [projectId]
    });

    return Response.json({
      success: true,
      users: result.rows.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        access_granted_at: user.access_granted_at,
        initials: user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      }))
    });

  } catch (error) {
    console.error('Error fetching project users:', error);
    return Response.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}