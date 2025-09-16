import { NextResponse } from 'next/server';
import { statusService } from '../../../../../services/statusService';
import { requireAuth, hasProjectAccess } from '../../../../../lib/auth';

/**
 * GET /api/projects/[id]/statuses
 * Get all statuses for a project
 */
export async function GET(request, { params }) {
  try {
    // Authentication
    const user = await requireAuth();
    const resolvedParams = await params;
    const projectId = parseInt(resolvedParams.id);

    // Check project access
    if (!hasProjectAccess(user, projectId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get statuses from service
    const statuses = await statusService.getProjectStatuses(projectId);

    // If no statuses exist, create defaults
    if (statuses.length === 0) {
      const defaultStatuses = await statusService.createDefaultStatuses(projectId);
      return NextResponse.json({ statuses: defaultStatuses });
    }

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Error fetching project statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statuses', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/statuses
 * Create a new status for a project
 */
export async function POST(request, { params }) {
  try {
    // Authentication
    const user = await requireAuth();
    const resolvedParams = await params;
    const projectId = parseInt(resolvedParams.id);

    // Check project access
    if (!hasProjectAccess(user, projectId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { value, label, color, sort_order } = body;

    // Validation
    if (!value || !label || !color) {
      return NextResponse.json(
        { error: 'Missing required fields: value, label, color' },
        { status: 400 }
      );
    }

    // Create status
    const newStatus = await statusService.createStatus(projectId, {
      value: value.toLowerCase().replace(/\s+/g, '_'),
      label,
      color,
      sort_order
    });

    return NextResponse.json({ status: newStatus }, { status: 201 });
  } catch (error) {
    console.error('Error creating status:', error);

    // Handle unique constraint violation
    if (error.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'A status with this value already exists for this project' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create status', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/statuses/reorder
 * Reorder statuses for a project
 */
export async function PUT(request, { params }) {
  try {
    // Authentication
    const user = await requireAuth();
    const resolvedParams = await params;
    const projectId = parseInt(resolvedParams.id);

    // Check project access
    if (!hasProjectAccess(user, projectId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { statusOrder } = body;

    if (!Array.isArray(statusOrder)) {
      return NextResponse.json(
        { error: 'statusOrder must be an array of status IDs' },
        { status: 400 }
      );
    }

    // Reorder statuses
    await statusService.reorderStatuses(projectId, statusOrder);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering statuses:', error);
    return NextResponse.json(
      { error: 'Failed to reorder statuses', details: error.message },
      { status: 500 }
    );
  }
}