import { NextResponse } from 'next/server';
import { statusService } from '../../../../../../services/statusService';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { statusOrder } = body;

    if (!Array.isArray(statusOrder)) {
      return NextResponse.json(
        { error: 'Status order must be an array' },
        { status: 400 }
      );
    }

    const success = await statusService.reorderStatuses(projectId, statusOrder);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to reorder statuses' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error reordering statuses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}