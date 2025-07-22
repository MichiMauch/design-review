import { getDb, initDatabase } from '../../../../../../lib/db.js';

function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new Response(null, { status: 200 }));
}

export async function GET(request, { params }) {
  try {
    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: 'SELECT * FROM projects WHERE name = ?',
      args: [params.name]
    });

    if (result.rows.length === 0) {
      return addCorsHeaders(new Response('Projekt nicht gefunden', { status: 404 }));
    }

    return addCorsHeaders(Response.json(result.rows[0]));

  } catch (error) {
    return addCorsHeaders(new Response('Fehler beim Laden des Projekts', { status: 500 }));
  }
}