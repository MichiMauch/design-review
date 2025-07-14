// Legacy support - redirects to new Turso implementation
import { getDb, initDatabase } from './db.js';

// Wrapper for legacy code
class Database {
  constructor() {
    this.db = getDb();
    this.ready = true;
    initDatabase().catch(console.error);
  }

  async insertFeedback(data) {
    const result = await this.db.execute({
      sql: `
        INSERT INTO feedback (text, url, screenshot, user_agent, project_id, selected_area, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      args: [
        data.text,
        data.url,
        data.screenshot || null,
        data.userAgent || '',
        data.projectId,
        data.selectedArea ? JSON.stringify(data.selectedArea) : null
      ]
    });
    
    return { id: result.lastInsertRowid };
  }

  async getAllFeedback() {
    const result = await this.db.execute('SELECT * FROM feedback ORDER BY created_at DESC');
    return result.rows;
  }

  async getFeedbackByProject(projectId) {
    const result = await this.db.execute({
      sql: 'SELECT * FROM feedback WHERE project_id = ? ORDER BY created_at DESC',
      args: [projectId]
    });
    return result.rows;
  }

  async getFeedbackByUrl(url) {
    const result = await this.db.execute({
      sql: 'SELECT * FROM feedback WHERE url = ? ORDER BY created_at DESC',
      args: [url]
    });
    return result.rows;
  }

  async deleteFeedback(id) {
    const result = await this.db.execute({
      sql: 'DELETE FROM feedback WHERE id = ?',
      args: [id]
    });
    return { id, changes: result.rowsAffected };
  }

  async updateFeedback(id, updates) {
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    });
    
    values.push(id);
    
    const result = await this.db.execute({
      sql: `UPDATE feedback SET ${fields.join(', ')} WHERE id = ?`,
      args: values
    });
    
    return { id, changes: result.rowsAffected };
  }

  async getStats() {
    const [total, byProject, recent] = await Promise.all([
      this.db.execute('SELECT COUNT(*) as count FROM feedback'),
      this.db.execute('SELECT project_id, COUNT(*) as count FROM feedback GROUP BY project_id'),
      this.db.execute('SELECT COUNT(*) as count FROM feedback WHERE created_at > datetime("now", "-7 days")')
    ]);

    return {
      total: total.rows[0]?.count || 0,
      byProject: byProject.rows,
      recent: recent.rows[0]?.count || 0
    };
  }
}

let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

module.exports = { getDatabase, Database };
