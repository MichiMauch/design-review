import { getDb } from '../../lib/db';
import { statusService } from './statusService';

/**
 * Service for migrating project statuses
 * Handles one-time migration of existing projects
 */
class StatusMigrationService {
  /**
   * Migrate all projects to use project-specific statuses
   * Projects 3 & 4 keep their existing statuses
   * All others get default statuses
   */
  async migrateAllProjects() {
    const db = getDb();

    // Get all projects
    const projectsResult = await db.execute({
      sql: 'SELECT id, name FROM projects ORDER BY id',
      args: []
    });

    const results = {
      migrated: [],
      skipped: [],
      errors: []
    };

    for (const project of projectsResult.rows) {
      try {
        const migrationResult = await this.migrateProject(project.id);

        if (migrationResult.migrated) {
          results.migrated.push({
            id: project.id,
            name: project.name,
            statusCount: migrationResult.statusCount
          });
        } else {
          results.skipped.push({
            id: project.id,
            name: project.name,
            reason: migrationResult.reason
          });
        }
      } catch (error) {
        results.errors.push({
          id: project.id,
          name: project.name,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Migrate a single project
   * @param {number} projectId - The project ID
   * @returns {Promise<Object>} Migration result
   */
  async migrateProject(projectId) {
    const db = getDb();

    // Check if project already has statuses
    const hasStatuses = await statusService.hasCustomStatuses(projectId);

    // Projects 3 & 4 already have correct statuses
    if (projectId === 3 || projectId === 4) {
      if (hasStatuses) {
        return {
          migrated: false,
          reason: 'Project already has statuses (protected project)'
        };
      }
    }

    // For project 12, remove existing statuses and create defaults
    if (projectId === 12 && hasStatuses) {
      await db.execute({
        sql: 'DELETE FROM project_task_statuses WHERE project_id = ?',
        args: [projectId]
      });
    }

    // For all other projects, check if they already have statuses
    if (hasStatuses && projectId !== 12) {
      return {
        migrated: false,
        reason: 'Project already has statuses'
      };
    }

    // Create default statuses for projects without them
    const createdStatuses = await statusService.createDefaultStatuses(projectId);

    // Migrate tasks with problematic statuses to 'open'
    await this.migrateTaskStatuses(projectId);

    return {
      migrated: true,
      statusCount: createdStatuses.length
    };
  }

  /**
   * Migrate task statuses for a project
   * Changes 'problem' to 'open', ensures all statuses are valid
   * @param {number} projectId - The project ID
   */
  async migrateTaskStatuses(projectId) {
    const db = getDb();

    // For projects 3 & 4, don't change anything
    if (projectId === 3 || projectId === 4) {
      return;
    }

    // Update 'problem' status to 'open'
    await db.execute({
      sql: `UPDATE tasks
            SET status = 'open'
            WHERE project_id = ? AND status = 'problem'`,
      args: [projectId]
    });

    // Update any non-standard statuses to 'open'
    // (for projects that now use the default 3 statuses)
    await db.execute({
      sql: `UPDATE tasks
            SET status = 'open'
            WHERE project_id = ?
            AND status NOT IN ('open', 'in_progress', 'done')`,
      args: [projectId]
    });
  }

  /**
   * Check migration status for all projects
   * @returns {Promise<Object>} Migration status report
   */
  async checkMigrationStatus() {
    const db = getDb();

    const projectsResult = await db.execute({
      sql: `SELECT
              p.id,
              p.name,
              COUNT(pts.id) as status_count,
              COUNT(DISTINCT t.id) as task_count
            FROM projects p
            LEFT JOIN project_task_statuses pts ON p.id = pts.project_id
            LEFT JOIN tasks t ON p.id = t.project_id
            GROUP BY p.id, p.name
            ORDER BY p.id`,
      args: []
    });

    const projects = projectsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      hasCustomStatuses: row.status_count > 0,
      statusCount: row.status_count,
      taskCount: row.task_count,
      needsMigration: row.status_count === 0
    }));

    return {
      totalProjects: projects.length,
      migratedProjects: projects.filter(p => p.hasCustomStatuses).length,
      pendingProjects: projects.filter(p => p.needsMigration).length,
      projects
    };
  }
}

// Export singleton instance
export const statusMigrationService = new StatusMigrationService();