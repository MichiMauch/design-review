import { getDb, initDatabase } from '../../../../../lib/db.js';

// Helper function to add CORS headers
function addCORSHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  const response = new Response(null, { status: 200 });
  return addCORSHeaders(response);
}

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: 'SELECT * FROM projects WHERE id = ?',
      args: [resolvedParams.id]
    });

    if (result.rows.length === 0) {
      const response = new Response('Projekt nicht gefunden', { status: 404 });
      return addCORSHeaders(response);
    }

    const response = Response.json(result.rows[0]);
    return addCORSHeaders(response);

  } catch (error) {
    console.error('Error fetching project:', error);
    const response = new Response('Fehler beim Laden des Projekts', { status: 500 });
    return addCORSHeaders(response);
  }
}

export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    await initDatabase();
    const db = getDb();

    const {
      name,
      domain,
      jira_server_url,
      jira_username,
      jira_api_token,
      jira_project_key,
      jira_auto_create
    } = body;

    console.log('Updating project with JIRA config:', { 
      id: resolvedParams.id, 
      name, 
      domain, 
      jira_server_url: jira_server_url ? 'SET' : 'NULL' 
    });

    // First check if project exists
    const existingProject = await db.execute({
      sql: 'SELECT * FROM projects WHERE id = ?',
      args: [resolvedParams.id]
    });

    if (existingProject.rows.length === 0) {
      return new Response('Projekt nicht gefunden', { status: 404 });
    }

    // Try to update with JIRA fields
    const result = await db.execute({
      sql: `UPDATE projects SET 
            name = ?, 
            domain = ?, 
            jira_server_url = ?, 
            jira_username = ?, 
            jira_api_token = ?, 
            jira_project_key = ?, 
            jira_auto_create = ? 
            WHERE id = ?`,
      args: [
        name,
        domain,
        jira_server_url,
        jira_username,
        jira_api_token,
        jira_project_key,
        jira_auto_create || false,
        resolvedParams.id
      ]
    });

    console.log('Project update result:', result);

    const response = Response.json({ success: true, message: 'Projekt erfolgreich aktualisiert' });
    return addCORSHeaders(response);

  } catch (error) {
    console.error('Error updating project:', error);
    console.error('Error details:', error.message);
    const response = new Response(`Fehler beim Aktualisieren des Projekts: ${error.message}`, { status: 500 });
    return addCORSHeaders(response);
  }
}

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;
    await initDatabase();
    const db = getDb();

    // First, delete all tasks associated with this project
    await db.execute({
      sql: 'DELETE FROM tasks WHERE project_id = ?',
      args: [resolvedParams.id]
    });

    // Then delete the project itself
    const result = await db.execute({
      sql: 'DELETE FROM projects WHERE id = ?',
      args: [resolvedParams.id]
    });

    if (result.rowsAffected === 0) {
      const response = new Response('Projekt nicht gefunden', { status: 404 });
      return addCORSHeaders(response);
    }

    const response = Response.json({ success: true, message: 'Projekt erfolgreich gelöscht' });
    return addCORSHeaders(response);

  } catch (error) {
    console.error('Error deleting project:', error);
    const response = new Response('Fehler beim Löschen des Projekts', { status: 500 });
    return addCORSHeaders(response);
  }
}