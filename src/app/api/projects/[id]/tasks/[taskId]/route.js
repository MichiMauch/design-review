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
    
    const { title, description, jira_key, status } = requestBody;

    await initDatabase();
    const db = getDb();

    // If only jira_key or status is being updated, handle separately
    if ((!title && jira_key !== undefined) || (!title && status !== undefined && jira_key === undefined)) {
      
      const currentTask = await db.execute({
        sql: 'SELECT title, description FROM tasks WHERE id = ? AND project_id = ?',
        args: [resolvedParams.taskId, resolvedParams.id]
      });


      if (currentTask.rows.length === 0) {
        return addCorsHeaders(new Response('Task nicht gefunden', { status: 404 }));
      }

      // Update only the specified fields
      let updateSql, updateArgs;
      if (status !== undefined && jira_key === undefined) {
        // Status-only update
        updateSql = `UPDATE tasks SET status = ? WHERE id = ? AND project_id = ?`;
        updateArgs = [status, resolvedParams.taskId, resolvedParams.id];
      } else {
        // JIRA key update (original logic)
        updateSql = `UPDATE tasks SET jira_key = ? WHERE id = ? AND project_id = ?`;
        updateArgs = [jira_key, resolvedParams.taskId, resolvedParams.id];
      }
      
      const result = await db.execute({
        sql: updateSql,
        args: updateArgs
      });


      return addCorsHeaders(Response.json({
        success: true,
        message: status !== undefined ? 'Status erfolgreich aktualisiert' : 'JIRA key erfolgreich aktualisiert',
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
        SET title = ?, description = ?, jira_key = ?, status = ?
        WHERE id = ? AND project_id = ?
      `,
      args: [
        title,
        description || null,
        jira_key || null,
        status || 'open',
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