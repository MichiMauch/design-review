import { NextResponse } from 'next/server';
import { getDb } from '../../../../../../lib/db';
import { requireAuth, hasProjectAccess } from '../../../../../../lib/auth';

export async function GET(request, { params }) {
  try {
    const projectId = params.id;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Check authentication and project access
    const user = await requireAuth();
    if (!hasProjectAccess(user, projectId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const db = getDb();

    // Get project settings
    const project = await db.prepare(
      'SELECT id, name, jira_auto_create FROM projects WHERE id = ?'
    ).get(projectId);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        jira_auto_create: Boolean(project.jira_auto_create)
      }
    });

  } catch (error) {
    console.error('Error fetching project settings:', error);

    // Handle authentication errors
    if (error.message === 'Authentication required') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch project settings'
    }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const projectId = params.id;
    const { jira_auto_create } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Check authentication and project access
    const user = await requireAuth();
    if (!hasProjectAccess(user, projectId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (typeof jira_auto_create !== 'boolean') {
      return NextResponse.json({ error: 'jira_auto_create must be a boolean' }, { status: 400 });
    }

    const db = getDb();

    // Check if project exists
    const project = await db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update project settings
    await db.prepare(`
      UPDATE projects
      SET jira_auto_create = ?
      WHERE id = ?
    `).run(jira_auto_create ? 1 : 0, projectId);

    return NextResponse.json({
      success: true,
      message: 'Project settings updated successfully',
      project: {
        id: parseInt(projectId),
        jira_auto_create
      }
    });

  } catch (error) {
    console.error('Error updating project settings:', error);

    // Handle authentication errors
    if (error.message === 'Authentication required') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update project settings'
    }, { status: 500 });
  }
}