import { getDb, initDatabase } from '../../../../../../lib/db.js';

export async function GET(request, { params }) {
  try {
    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: 'SELECT * FROM projects WHERE name = ?',
      args: [params.name]
    });

    if (result.rows.length === 0) {
      return new Response('Projekt nicht gefunden', { status: 404 });
    }

    return Response.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching project by name:', error);
    return new Response('Fehler beim Laden des Projekts', { status: 500 });
  }
}