import { getDb } from '../../lib/db';

/**
 * Service for managing project task statuses
 * Handles all database operations for status management
 */
class StatusService {
  /**
   * Get all statuses for a project
   * @param {number} projectId - The project ID
   * @returns {Promise<Array>} Array of status objects
   */
  async getProjectStatuses(projectId) {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT id, project_id, value, label, color, sort_order, created_at
            FROM project_task_statuses
            WHERE project_id = ?
            ORDER BY sort_order ASC`,
      args: [projectId]
    });
    return result.rows;
  }

  /**
   * Create a new status for a project
   * @param {number} projectId - The project ID
   * @param {Object} statusData - Status data (value, label, color, sort_order)
   * @returns {Promise<Object>} Created status object
   */
  async createStatus(projectId, statusData) {
    const db = getDb();
    const { value, label, color, sort_order = 999 } = statusData;

    const result = await db.execute({
      sql: `INSERT INTO project_task_statuses (project_id, value, label, color, sort_order)
            VALUES (?, ?, ?, ?, ?)`,
      args: [projectId, value, label, color, sort_order]
    });

    return {
      id: Number(result.lastInsertRowid),
      project_id: projectId,
      value,
      label,
      color,
      sort_order
    };
  }

  /**
   * Update an existing status
   * @param {number} statusId - The status ID
   * @param {number} projectId - The project ID (for validation)
   * @param {Object} updateData - Fields to update
   * @returns {Promise<boolean>} Success status
   */
  async updateStatus(statusId, projectId, updateData) {
    const db = getDb();
    const { label, color, sort_order } = updateData;

    const updates = [];
    const args = [];

    if (label !== undefined) {
      updates.push('label = ?');
      args.push(label);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      args.push(color);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      args.push(sort_order);
    }

    if (updates.length === 0) return false;

    args.push(statusId, projectId);

    const result = await db.execute({
      sql: `UPDATE project_task_statuses
            SET ${updates.join(', ')}
            WHERE id = ? AND project_id = ?`,
      args
    });

    return result.rowsAffected > 0;
  }

  /**
   * Delete a status (only if not used by any tasks)
   * @param {number} statusId - The status ID
   * @param {number} projectId - The project ID
   * @returns {Promise<{success: boolean, error?: string}>} Result
   */
  async deleteStatus(statusId, projectId) {
    const db = getDb();

    // First get the status value
    const statusResult = await db.execute({
      sql: 'SELECT value FROM project_task_statuses WHERE id = ? AND project_id = ?',
      args: [statusId, projectId]
    });

    if (statusResult.rows.length === 0) {
      return { success: false, error: 'Status not found' };
    }

    const statusValue = statusResult.rows[0].value;

    // Check if status is used by any tasks
    const tasksResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND status = ?',
      args: [projectId, statusValue]
    });

    if (tasksResult.rows[0].count > 0) {
      return {
        success: false,
        error: `Cannot delete status: ${tasksResult.rows[0].count} task(s) are using this status`
      };
    }

    // Delete the status
    await db.execute({
      sql: 'DELETE FROM project_task_statuses WHERE id = ? AND project_id = ?',
      args: [statusId, projectId]
    });

    return { success: true };
  }

  /**
   * Reorder statuses
   * @param {number} projectId - The project ID
   * @param {Array} statusOrder - Array of status IDs in new order
   * @returns {Promise<boolean>} Success status
   */
  async reorderStatuses(projectId, statusOrder) {
    const db = getDb();

    // Update each status with new sort_order
    const promises = statusOrder.map((statusId, index) =>
      db.execute({
        sql: 'UPDATE project_task_statuses SET sort_order = ? WHERE id = ? AND project_id = ?',
        args: [index + 1, statusId, projectId]
      })
    );

    await Promise.all(promises);
    return true;
  }

  /**
   * Check if a project has custom statuses
   * @param {number} projectId - The project ID
   * @returns {Promise<boolean>} True if project has custom statuses
   */
  async hasCustomStatuses(projectId) {
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM project_task_statuses WHERE project_id = ?',
      args: [projectId]
    });
    return result.rows[0].count > 0;
  }

  /**
   * Create default statuses for a project
   * @param {number} projectId - The project ID
   * @returns {Promise<Array>} Created statuses
   */
  async createDefaultStatuses(projectId) {
    const defaultStatuses = [
      { value: 'open', label: 'Offen', color: 'bg-red-100 text-red-800 border-red-200', sort_order: 1 },
      { value: 'in_progress', label: 'In Bearbeitung', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', sort_order: 2 },
      { value: 'done', label: 'Erledigt', color: 'bg-green-100 text-green-800 border-green-200', sort_order: 3 }
    ];

    const createdStatuses = [];
    for (const status of defaultStatuses) {
      const created = await this.createStatus(projectId, status);
      createdStatuses.push(created);
    }

    return createdStatuses;
  }
}

// Export singleton instance
export const statusService = new StatusService();