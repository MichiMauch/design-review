import { getDb, initDatabase } from '../../../../lib/db.js';

function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new Response(null, { status: 200 }));
}

export async function GET() {
  try {
    await initDatabase();
    const db = getDb();

    const users = await db.execute({
      sql: 'SELECT email, role FROM authorized_users ORDER BY email',
      args: []
    });

    return addCorsHeaders(Response.json({
      success: true,
      users: users.rows
    }));

  } catch (error) {
    console.error('Error loading authorized users:', error);
    return addCorsHeaders(Response.json({
      success: false,
      error: 'Fehler beim Laden der Benutzer',
      details: error.message
    }, { status: 500 }));
  }
}