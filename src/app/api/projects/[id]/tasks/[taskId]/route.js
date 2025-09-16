import { getDb, initDatabase } from '../../../../../../../lib/db.js';
import { requireAuth, hasProjectAccess } from '../../../../../../../lib/auth.js';

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
    const user = await requireAuth();
    const resolvedParams = await params;

    // Check project access
    if (!hasProjectAccess(user, resolvedParams.id)) {
      return addCorsHeaders(new Response('Access denied', { status: 403 }));
    }
    
    const requestBody = await request.json();
    
    const { title, description, jira_key, jira_url, status, sort_order, ai_category, sentiment_category } = requestBody;

    await initDatabase();
    const db = getDb();

    // If only jira_key/jira_url, status, sort_order, ai_category, or sentiment_category is being updated, handle separately
    if ((!title && (jira_key !== undefined || jira_url !== undefined)) || (!title && (status !== undefined || sort_order !== undefined || ai_category !== undefined || sentiment_category !== undefined) && jira_key === undefined && jira_url === undefined)) {
      
      const currentTask = await db.execute({
        sql: 'SELECT title, description FROM tasks WHERE id = ? AND project_id = ?',
        args: [resolvedParams.taskId, resolvedParams.id]
      });


      if (currentTask.rows.length === 0) {
        return addCorsHeaders(new Response('Task nicht gefunden', { status: 404 }));
      }

      // Update only the specified fields
      let updateSql, updateArgs;
      if ((status !== undefined || sort_order !== undefined || ai_category !== undefined || sentiment_category !== undefined) && jira_key === undefined && jira_url === undefined) {
        // Partial update (status, sort_order, ai_category, sentiment_category)
        const fieldsToUpdate = [];
        const valuesToUpdate = [];

        if (status !== undefined) {
          fieldsToUpdate.push('status = ?');
          valuesToUpdate.push(status);
        }
        if (sort_order !== undefined) {
          fieldsToUpdate.push('sort_order = ?');
          valuesToUpdate.push(sort_order);
        }
        if (ai_category !== undefined) {
          fieldsToUpdate.push('ai_category = ?');
          valuesToUpdate.push(ai_category);
        }
        if (sentiment_category !== undefined) {
          fieldsToUpdate.push('sentiment_category = ?');
          valuesToUpdate.push(sentiment_category);
        }

        updateSql = `UPDATE tasks SET ${fieldsToUpdate.join(', ')} WHERE id = ? AND project_id = ?`;
        updateArgs = [...valuesToUpdate, resolvedParams.taskId, resolvedParams.id];
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
        SET title = ?, description = ?, jira_key = ?, jira_url = ?, status = ?, sort_order = ?, ai_category = ?, sentiment_category = ?
        WHERE id = ? AND project_id = ?
      `,
      args: [
        title,
        description || null,
        jira_key || null,
        jira_url || null,
        status || 'open',
        sort_order || null,
        ai_category || null,
        sentiment_category || null,
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
    console.error('Error updating task:', error);
    return addCorsHeaders(Response.json({
      success: false,
      error: 'Fehler beim Aktualisieren der Task',
      details: error.message
    }, { status: 500 }));
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth();
    const resolvedParams = await params;

    // Check project access
    if (!hasProjectAccess(user, resolvedParams.id)) {
      return addCorsHeaders(new Response('Access denied', { status: 403 }));
    }

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
    console.error('Error deleting task:', error);
    return addCorsHeaders(Response.json({
      success: false,
      error: 'Fehler beim Löschen der Task',
      details: error.message
    }, { status: 500 }));
  }
}