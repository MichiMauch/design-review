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
    
    const { title, description, jira_key, jira_url, status, sort_order } = requestBody;

    await initDatabase();
    const db = getDb();

    // If only jira_key/jira_url, status, or sort_order is being updated, handle separately
    if ((!title && (jira_key !== undefined || jira_url !== undefined)) || (!title && (status !== undefined || sort_order !== undefined) && jira_key === undefined && jira_url === undefined)) {
      
      const currentTask = await db.execute({
        sql: 'SELECT title, description FROM tasks WHERE id = ? AND project_id = ?',
        args: [resolvedParams.taskId, resolvedParams.id]
      });


      if (currentTask.rows.length === 0) {
        return addCorsHeaders(new Response('Task nicht gefunden', { status: 404 }));
      }

      // Update only the specified fields
      let updateSql, updateArgs;
      if ((status !== undefined || sort_order !== undefined) && jira_key === undefined && jira_url === undefined) {
        // Status and/or sort_order update
        if (status !== undefined && sort_order !== undefined) {
          updateSql = `UPDATE tasks SET status = ?, sort_order = ? WHERE id = ? AND project_id = ?`;
          updateArgs = [status, sort_order, resolvedParams.taskId, resolvedParams.id];
        } else if (status !== undefined) {
          updateSql = `UPDATE tasks SET status = ? WHERE id = ? AND project_id = ?`;
          updateArgs = [status, resolvedParams.taskId, resolvedParams.id];
        } else if (sort_order !== undefined) {
          updateSql = `UPDATE tasks SET sort_order = ? WHERE id = ? AND project_id = ?`;
          updateArgs = [sort_order, resolvedParams.taskId, resolvedParams.id];
        }
      } else if (jira_key !== undefined || jira_url !== undefined) {
        // JIRA key/url update
        updateSql = `UPDATE tasks SET jira_key = ?, jira_url = ? WHERE id = ? AND project_id = ?`;
        updateArgs = [jira_key || null, jira_url || null, resolvedParams.taskId, resolvedParams.id];
      }
      
      const result = await db.execute({
        sql: updateSql,
        args: updateArgs
      });


      let message = 'Erfolgreich aktualisiert';
      if (status !== undefined && sort_order !== undefined) {
        message = 'Status und Position erfolgreich aktualisiert';
      } else if (status !== undefined) {
        message = 'Status erfolgreich aktualisiert';
      } else if (sort_order !== undefined) {
        message = 'Position erfolgreich aktualisiert';
      } else if (jira_key !== undefined || jira_url !== undefined) {
        message = 'JIRA Daten erfolgreich aktualisiert';
      }

      return addCorsHeaders(Response.json({
        success: true,
        message: message,
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
        SET title = ?, description = ?, jira_key = ?, jira_url = ?, status = ?, sort_order = ?
        WHERE id = ? AND project_id = ?
      `,
      args: [
        title,
        description || null,
        jira_key || null,
        jira_url || null,
        status || 'open',
        sort_order || null,
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