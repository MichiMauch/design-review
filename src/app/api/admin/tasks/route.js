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

    // Add timeout for database initialization
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database initialization timeout')), 5000)
    );

    await Promise.race([initDatabase(), timeoutPromise]);
    const db = getDb();

    // Get recent tasks for admin with project information (limit to 100 most recent)
    const result = await db.execute(`
      SELECT
        t.*,
        p.name as project_name,
        p.domain as project_domain
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      ORDER BY t.created_at DESC
      LIMIT 100
    `);

    return Response.json({
      success: true,
      tasks: result.rows
    });

  } catch (error) {
    console.error('Error fetching admin tasks:', error);
    return Response.json(
      { success: false, error: 'Fehler beim Laden der Tasks' },
      { status: 500 }
    );
  }
}