import { getDb, initDatabase } from '../../../../../../../lib/db.js';
import { getUser } from '../../../../../../../lib/auth.js';

export async function GET(request, { params }) {
  try {
    // Check authentication and admin role
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const userId = params.id;
    await initDatabase();
    const db = getDb();

    // Get user email first
    const userResult = await db.execute({
      sql: 'SELECT email FROM authorized_users WHERE id = ?',
      args: [userId]
    });

    if (userResult.rows.length === 0) {
      return Response.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userEmail = userResult.rows[0].email;

    // Get user's project access
    const accessResult = await db.execute({
      sql: `
        SELECT p.id, p.name, p.domain, 
               CASE WHEN upa.id IS NOT NULL THEN 1 ELSE 0 END as has_access
        FROM projects p
        LEFT JOIN user_project_access upa ON p.id = upa.project_id AND upa.user_email = ?
        ORDER BY p.name
      `,
      args: [userEmail]
    });

    return Response.json({
      success: true,
      projects: accessResult.rows
    });

  } catch (error) {
    console.error('Error fetching user project access:', error);
    return Response.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    // Check authentication and admin role
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const userId = params.id;
    const { projectId } = await request.json();

    if (!projectId) {
      return Response.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    await initDatabase();
    const db = getDb();

    // Get user email
    const userResult = await db.execute({
      sql: 'SELECT email FROM authorized_users WHERE id = ?',
      args: [userId]
    });

    if (userResult.rows.length === 0) {
      return Response.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userEmail = userResult.rows[0].email;

    // Grant access (using INSERT OR IGNORE to prevent duplicates)
    await db.execute({
      sql: 'INSERT OR IGNORE INTO user_project_access (user_email, project_id) VALUES (?, ?)',
      args: [userEmail, projectId]
    });

    return Response.json({
      success: true,
      message: 'Project access granted'
    });

  } catch (error) {
    console.error('Error granting project access:', error);
    return Response.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    // Check authentication and admin role
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const userId = params.id;
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return Response.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    await initDatabase();
    const db = getDb();

    // Get user email
    const userResult = await db.execute({
      sql: 'SELECT email FROM authorized_users WHERE id = ?',
      args: [userId]
    });

    if (userResult.rows.length === 0) {
      return Response.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userEmail = userResult.rows[0].email;

    // Revoke access
    await db.execute({
      sql: 'DELETE FROM user_project_access WHERE user_email = ? AND project_id = ?',
      args: [userEmail, projectId]
    });

    return Response.json({
      success: true,
      message: 'Project access revoked'
    });

  } catch (error) {
    console.error('Error revoking project access:', error);
    return Response.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}