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

export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params;
    const { status, taskOrder } = await request.json();

    if (!Array.isArray(taskOrder)) {
      return addCorsHeaders(new Response('Task order must be an array', { status: 400 }));
    }

    await initDatabase();
    const db = getDb();

    // Update sort_order for each task in the order
    const promises = taskOrder.map((taskId, index) =>
      db.execute({
        sql: 'UPDATE tasks SET sort_order = ? WHERE id = ? AND project_id = ? AND status = ?',
        args: [index + 1, taskId, resolvedParams.id, status]
      })
    );

    await Promise.all(promises);

    return addCorsHeaders(Response.json({
      success: true,
      message: 'Tasks reordered successfully'
    }));

  } catch (error) {
    console.error('Error reordering tasks:', error);
    return addCorsHeaders(Response.json({
      success: false,
      error: 'Failed to reorder tasks',
      details: error.message
    }, { status: 500 }));
  }
}