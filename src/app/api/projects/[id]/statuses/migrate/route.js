import { NextResponse } from 'next/server';
import { statusMigrationService } from '../../../../../../services/statusMigrationService';
import { requireAuth, hasProjectAccess } from '../../../../../../lib/auth';

/**
 * POST /api/projects/[id]/statuses/migrate
 * Migrate a single project to use custom statuses
 */
export async function POST(request, { params }) {
  try {
    // Authentication - only admin can migrate
    const user = await requireAuth();
    const projectId = parseInt(params.id);

    // Check project access
    if (!hasProjectAccess(user, projectId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Perform migration for this project
    const result = await statusMigrationService.migrateProject(projectId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error migrating project:', error);
    return NextResponse.json(
      { error: 'Failed to migrate project', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/statuses/migrate
 * Check migration status for a project
 */
export async function GET(request, { params }) {
  try {
    // Authentication
    const user = await requireAuth();
    const projectId = parseInt(params.id);

    // Check project access
    if (!hasProjectAccess(user, projectId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get migration status
    const status = await statusMigrationService.checkMigrationStatus();
    const projectStatus = status.projects.find(p => p.id === projectId);

    if (!projectStatus) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      projectId,
      hasCustomStatuses: projectStatus.hasCustomStatuses,
      statusCount: projectStatus.statusCount,
      taskCount: projectStatus.taskCount,
      needsMigration: projectStatus.needsMigration
    });
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status', details: error.message },
      { status: 500 }
    );
  }
}