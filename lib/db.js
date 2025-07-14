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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id)
      )
    `);

    initialized = true;
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}
