import { NextResponse } from 'next/server';
import { initDatabase, getDb } from '../../../../../../../../lib/db.js';
import { requireAuth, hasProjectAccess } from '../../../../../../../../lib/auth.js';

export async function PUT(request, context) {
  try {
    const user = await requireAuth();
    const params = await context.params;
    const projectId = parseInt(params.id);
    const taskId = parseInt(params.taskId);

    // Check project access
    if (!hasProjectAccess(user, projectId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { sentiment } = body;

    // Initialize database
    await initDatabase();
    const db = getDb();

    // Update task sentiment category
    await db.execute({
      sql: `
        UPDATE tasks
        SET sentiment_category = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ? AND project_id = ?
      `,
      args: [sentiment, taskId, projectId]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating sentiment category:', error);
    return NextResponse.json(
      { error: 'Failed to update sentiment category', details: error.message },
      { status: 500 }
    );
  }
}