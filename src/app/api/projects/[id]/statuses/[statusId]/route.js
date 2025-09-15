import { NextResponse } from 'next/server';
import { statusService } from '../../../../../../services/statusService';
import { requireAuth, hasProjectAccess } from '../../../../../../lib/auth';

/**
 * PUT /api/projects/[id]/statuses/[statusId]
 * Update a specific status
 */
export async function PUT(request, { params }) {
  try {
    // Authentication
    const user = await requireAuth();
    const projectId = parseInt(params.id);
    const statusId = parseInt(params.statusId);

    // Check project access
    if (!hasProjectAccess(user, projectId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { label, color, sort_order } = body;

    // Update status
    const success = await statusService.updateStatus(statusId, projectId, {
      label,
      color,
      sort_order
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Status not found or no changes made' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { error: 'Failed to update status', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/statuses/[statusId]
 * Delete a specific status
 */
export async function DELETE(request, { params }) {
  try {
    // Authentication
    const user = await requireAuth();
    const projectId = parseInt(params.id);
    const statusId = parseInt(params.statusId);

    // Check project access
    if (!hasProjectAccess(user, projectId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete status
    const result = await statusService.deleteStatus(statusId, projectId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.includes('Cannot delete') ? 409 : 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting status:', error);
    return NextResponse.json(
      { error: 'Failed to delete status', details: error.message },
      { status: 500 }
    );
  }
}