import { getDb, initDatabase } from '../../../../../../lib/db.js';

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
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

    // Check if user exists
    const existingUser = await db.execute({
      sql: 'SELECT id FROM authorized_users WHERE id = ?',
      args: [id]
    });

    if (existingUser.rows.length === 0) {
      return Response.json(
        { success: false, error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    try {
      await db.execute({
        sql: 'UPDATE authorized_users SET email = ?, name = ?, role = ? WHERE id = ?',
        args: [email.toLowerCase().trim(), name.trim(), role, id]
      });

      return Response.json({
        success: true,
        message: 'Benutzer erfolgreich aktualisiert'
      });

    } catch (dbError) {
      if (dbError.message.includes('UNIQUE constraint failed')) {
        return Response.json(
          { success: false, error: 'Ein anderer Benutzer mit dieser E-Mail-Adresse existiert bereits' },
          { status: 409 }
        );
      }
      throw dbError;
    }

  } catch {
    return Response.json(
      { success: false, error: 'Fehler beim Aktualisieren des Benutzers' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    await initDatabase();
    const db = getDb();

    // Check if user exists and get email
    const existingUser = await db.execute({
      sql: 'SELECT id, email FROM authorized_users WHERE id = ?',
      args: [id]
    });

    if (existingUser.rows.length === 0) {
      return Response.json(
        { success: false, error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    const userEmail = existingUser.rows[0].email;

    // Delete user project access first (foreign key constraint)
    await db.execute({
      sql: 'DELETE FROM user_project_access WHERE user_email = ?',
      args: [userEmail]
    });

    // Delete magic tokens for this user
    await db.execute({
      sql: 'DELETE FROM magic_tokens WHERE email = ?',
      args: [userEmail]
    });

    // Delete the user
    await db.execute({
      sql: 'DELETE FROM authorized_users WHERE id = ?',
      args: [id]
    });

    return Response.json({
      success: true,
      message: 'Benutzer erfolgreich gelöscht'
    });

  } catch {
    return Response.json(
      { success: false, error: 'Fehler beim Löschen des Benutzers' },
      { status: 500 }
    );
  }
}