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

    // Get all settings
    const result = await db.execute(`
      SELECT key, value, updated_at
      FROM app_settings
      ORDER BY key
    `);

    // Convert to object for easier access
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    return Response.json({
      success: true,
      settings: settings
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    return Response.json(
      { success: false, error: error.message || 'Fehler beim Laden der Einstellungen' },
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

    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return Response.json(
        { success: false, error: 'Setting key is required' },
        { status: 400 }
      );
    }

    // Add timeout for database initialization
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database initialization timeout')), 5000)
    );

    await Promise.race([initDatabase(), timeoutPromise]);
    const db = getDb();

    // Update or insert setting
    await db.execute({
      sql: `INSERT OR REPLACE INTO app_settings (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)`,
      args: [key, value]
    });

    return Response.json({
      success: true,
      message: 'Einstellung erfolgreich gespeichert'
    });

  } catch (error) {
    console.error('Error updating setting:', error);
    return Response.json(
      { success: false, error: error.message || 'Fehler beim Speichern der Einstellung' },
      { status: 500 }
    );
  }
}