import { getDb, initDatabase } from '../../../../../../../lib/db.js';

function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new Response(null, { status: 200 }));
}

export async function PATCH(request, { params }) {
  return PUT(request, { params });
}

export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params;
    
    const requestBody = await request.json();
    
    const { title, description, jira_key } = requestBody;

    await initDatabase();
    const db = getDb();

    // If only jira_key is being updated, get current data first
    if (!title && jira_key !== undefined) {
      
      const currentTask = await db.execute({
        sql: 'SELECT title, description FROM tasks WHERE id = ? AND project_id = ?',
        args: [resolvedParams.taskId, resolvedParams.id]
      });


      if (currentTask.rows.length === 0) {
        return addCorsHeaders(new Response('Task nicht gefunden', { status: 404 }));
      }

      const result = await db.execute({
        sql: `UPDATE tasks SET jira_key = ? WHERE id = ? AND project_id = ?`,
        args: [jira_key, resolvedParams.taskId, resolvedParams.id]
      });


      return addCorsHeaders(Response.json({
        success: true,
        message: 'JIRA key erfolgreich aktualisiert',
        rowsAffected: result.rowsAffected
      }));
    }

    // Normal update with title validation
    if (!title) {
      return addCorsHeaders(new Response('Titel ist erforderlich', { status: 400 }));
    }


    const result = await db.execute({
      sql: `
        UPDATE tasks 
        SET title = ?, description = ?, jira_key = ?
        WHERE id = ? AND project_id = ?
      `,
      args: [
        title,
        description || null,
        jira_key || null,
        resolvedParams.taskId,
        resolvedParams.id
      ]
    });


    if (result.rowsAffected === 0) {
      return addCorsHeaders(new Response('Task nicht gefunden', { status: 404 }));
    }

    return addCorsHeaders(Response.json({
      success: true,
      message: 'Task erfolgreich aktualisiert'
    }));

  } catch (error) {
    return addCorsHeaders(Response.json({ 
      success: false, 
      error: 'Fehler beim Aktualisieren der Task',
      details: error.message 
    }, { status: 500 }));
  }
}

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;

    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: 'DELETE FROM tasks WHERE id = ? AND project_id = ?',
      args: [resolvedParams.taskId, resolvedParams.id]
    });


    if (result.rowsAffected === 0) {
      return addCorsHeaders(new Response('Task nicht gefunden', { status: 404 }));
    }

    return addCorsHeaders(Response.json({
      success: true,
      message: 'Task erfolgreich gelöscht'
    }));

  } catch (error) {
    return addCorsHeaders(Response.json({ 
      success: false, 
      error: 'Fehler beim Löschen der Task',
      details: error.message 
    }, { status: 500 }));
  }
}