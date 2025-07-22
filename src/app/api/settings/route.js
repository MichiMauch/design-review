import { NextResponse } from 'next/server';
import { getDb, initDatabase } from '../../../../lib/db.js';

// GET - Settings abrufen
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    const db = getDb();
    
    if (key) {
      // Einzelne Setting abrufen
      const result = await db.execute({
        sql: 'SELECT * FROM settings WHERE key = ?',
        args: [key]
      });
      
      const setting = result.rows[0];
      
      return NextResponse.json({
        success: true,
        setting: setting ? {
          key: setting.key,
          value: JSON.parse(setting.value),
          updated_at: setting.updated_at
        } : null
      });
    } else {
      // Alle Settings abrufen
      const result = await db.execute('SELECT * FROM settings');
      
      const settingsObject = {};
      result.rows.forEach(setting => {
        settingsObject[setting.key] = JSON.parse(setting.value);
      });
      
      return NextResponse.json({
        success: true,
        settings: settingsObject
      });
    }
  } catch (error) {
    
    // Bei Tabellen-Fehler versuchen wir die Datenbank zu initialisieren
    if (error.message && error.message.includes('no such table')) {
      try {
        await initDatabase();
        return NextResponse.json({
          success: true,
          settings: {},
          message: 'Database initialized'
        });
      } catch (initError) {
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// POST - Settings speichern/aktualisieren
export async function POST(request) {
  try {
    const { key, value } = await request.json();
    
    if (!key) {
      return NextResponse.json({ 
        success: false, 
        error: 'Key ist erforderlich' 
      }, { status: 400 });
    }
    
    const db = getDb();
    
    // Upsert mit Turso
    await db.execute({
      sql: `
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, datetime('now', 'localtime'))
        ON CONFLICT(key) DO UPDATE SET 
          value = excluded.value,
          updated_at = datetime('now', 'localtime')
      `,
      args: [key, JSON.stringify(value)]
    });
    
    return NextResponse.json({
      success: true,
      message: 'Setting gespeichert'
    });
    
  } catch (error) {
    
    // Bei Tabellen-Fehler versuchen wir die Datenbank zu initialisieren
    if (error.message && error.message.includes('no such table')) {
      try {
        await initDatabase();
        // Retry nach Initialisierung
        return await POST(request);
      } catch (initError) {
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// DELETE - Setting löschen
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ 
        success: false, 
        error: 'Key ist erforderlich' 
      }, { status: 400 });
    }
    
    const db = getDb();
    const result = await db.execute({
      sql: 'DELETE FROM settings WHERE key = ?',
      args: [key]
    });
    
    return NextResponse.json({
      success: true,
      deleted: result.rowsAffected > 0,
      message: result.rowsAffected > 0 ? 'Setting gelöscht' : 'Setting nicht gefunden'
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
