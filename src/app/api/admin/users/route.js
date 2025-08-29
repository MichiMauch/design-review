import { getDb, initDatabase } from '../../../../../lib/db.js';

export async function GET() {
  try {
    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: 'SELECT id, email, name, role, created_at, last_login FROM authorized_users ORDER BY created_at DESC'
    });

    return Response.json({
      success: true,
      users: result.rows
    });

  } catch {
    return Response.json(
      { success: false, error: 'Fehler beim Laden der Benutzer' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { email, name, role } = await request.json();

    // Validation
    if (!email || !name || !role) {
      return Response.json(
        { success: false, error: 'E-Mail, Name und Rolle sind erforderlich' },
        { status: 400 }
      );
    }

    if (!email.includes('@')) {
      return Response.json(
        { success: false, error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    if (!['admin', 'user'].includes(role)) {
      return Response.json(
        { success: false, error: 'Rolle muss "admin" oder "user" sein' },
        { status: 400 }
      );
    }

    await initDatabase();
    const db = getDb();

    try {
      const result = await db.execute({
        sql: 'INSERT INTO authorized_users (email, name, role) VALUES (?, ?, ?)',
        args: [email.toLowerCase().trim(), name.trim(), role]
      });

      return Response.json({
        success: true,
        message: 'Benutzer erfolgreich erstellt',
        user: {
          id: result.lastInsertRowid,
          email: email.toLowerCase().trim(),
          name: name.trim(),
          role: role
        }
      });

    } catch (dbError) {
      if (dbError.message.includes('UNIQUE constraint failed')) {
        return Response.json(
          { success: false, error: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits' },
          { status: 409 }
        );
      }
      throw dbError;
    }

  } catch {
    return Response.json(
      { success: false, error: 'Fehler beim Erstellen des Benutzers' },
      { status: 500 }
    );
  }
}