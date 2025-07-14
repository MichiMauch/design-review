import { getDb, initDatabase } from '../../../../../../lib/db.js';

export async function GET(request, { params }) {
  try {
    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: 'SELECT widget_installed, widget_last_ping FROM projects WHERE id = ?',
      args: [params.id]
    });

    if (result.rows.length === 0) {
      return new Response('Projekt nicht gefunden', { status: 404 });
    }

    const project = result.rows[0];

    return Response.json({
      installed: Boolean(project.widget_installed),
      last_ping: project.widget_last_ping
    });

  } catch (error) {
    console.error('Error checking widget status:', error);
    return new Response('Fehler beim Prüfen des Widget-Status', { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    await initDatabase();
    const db = getDb();

    // Update widget installation status and last ping
    await db.execute({
      sql: `
        UPDATE projects 
        SET widget_installed = TRUE, widget_last_ping = datetime('now')
        WHERE id = ?
      `,
      args: [params.id]
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error updating widget status:', error);
    return new Response('Fehler beim Aktualisieren des Widget-Status', { status: 500 });
  }
}