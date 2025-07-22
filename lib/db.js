import { createClient } from '@libsql/client';

let db = null;
let initialized = false;

export function getDb() {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;

    db = createClient({
      url,
      authToken: authToken || undefined,
    });
  }
  return db;
}

export async function initDatabase() {
  if (initialized) {
    return; // Bereits initialisiert
  }

  const db = getDb();
  
  try {
    // Feedback-Tabelle
    await db.execute(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        url TEXT NOT NULL,
        screenshot TEXT,
        user_agent TEXT,
        project_id TEXT DEFAULT 'default',
        selected_area TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings-Tabelle
    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Projects-Tabelle
    await db.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        domain TEXT NOT NULL,
        widget_installed BOOLEAN DEFAULT FALSE,
        widget_last_ping DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        jira_server_url TEXT,
        jira_username TEXT,
        jira_api_token TEXT,
        jira_project_key TEXT,
        jira_auto_create BOOLEAN DEFAULT FALSE
      )
    `);

    // Add JIRA columns if they don't exist (for existing databases)
    try {
      await db.execute(`ALTER TABLE projects ADD COLUMN jira_server_url TEXT`);
    } catch {
      // Column already exists
    }
    try {
      await db.execute(`ALTER TABLE projects ADD COLUMN jira_username TEXT`);
    } catch {
      // Column already exists
    }
    try {
      await db.execute(`ALTER TABLE projects ADD COLUMN jira_api_token TEXT`);
    } catch {
      // Column already exists
    }
    try {
      await db.execute(`ALTER TABLE projects ADD COLUMN jira_project_key TEXT`);
    } catch {
      // Column already exists
    }
    try {
      await db.execute(`ALTER TABLE projects ADD COLUMN jira_auto_create BOOLEAN DEFAULT FALSE`);
    } catch {
      // Column already exists
    }

    // Tasks-Tabelle
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        screenshot TEXT,
        url TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        selected_area TEXT,
        jira_key TEXT,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (project_id) REFERENCES projects (id)
      )
    `);

    // Add jira_key column if it doesn't exist (migration)
    try {
      await db.execute(`
        ALTER TABLE tasks ADD COLUMN jira_key TEXT
      `);
    } catch (error) {
      // Column already exists or other error - ignore
      if (!error.message.includes('duplicate column name')) {
      }
    }

    // Add English translation columns if they don't exist (migration)
    try {
      await db.execute(`
        ALTER TABLE tasks ADD COLUMN title_en TEXT
      `);
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
      }
    }

    try {
      await db.execute(`
        ALTER TABLE tasks ADD COLUMN description_en TEXT
      `);
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
      }
    }

    // Add screenshot_url column for R2 URLs (migration)
    try {
      await db.execute(`
        ALTER TABLE tasks ADD COLUMN screenshot_url TEXT
      `);
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
      }
    }

    // Add title column to feedback table if it doesn't exist (migration)
    try {
      await db.execute(`
        ALTER TABLE feedback ADD COLUMN title TEXT
      `);
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
      }
    }

    initialized = true;
  } catch (error) {
    throw error;
  }
}
