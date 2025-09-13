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
    console.log(`Looking for project with name: "${params.name}"`);

    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: 'SELECT * FROM projects WHERE name = ?',
      args: [params.name]
    });

    console.log(`Query result: ${result.rows.length} rows found`);

    if (result.rows.length === 0) {
      // Also try to list all projects for debugging
      const allProjects = await db.execute({
        sql: 'SELECT id, name FROM projects ORDER BY id'
      });
      console.log('All projects:', allProjects.rows.map(p => `${p.id}: ${p.name}`).join(', '));

      return addCorsHeaders(new Response(`Projekt "${params.name}" nicht gefunden`, { status: 404 }));
    }

    return addCorsHeaders(Response.json(result.rows[0]));

  } catch (error) {
    console.error('Error in projects/by-name API:', error);
    return addCorsHeaders(new Response(`Fehler beim Laden des Projekts: ${error.message}`, { status: 500 }));
  }
}