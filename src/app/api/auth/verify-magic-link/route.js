import { getDb, initDatabase } from '../../../../../lib/db.js';
import { SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export async function POST(request) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return Response.json(
        { success: false, error: 'Token ist erforderlich' },
        { status: 400 }
      );
    }

    await initDatabase();
    const db = getDb();

    // Find and validate token
    const tokenResult = await db.execute({
      sql: `
        SELECT mt.*, au.name, au.email, au.role 
        FROM magic_tokens mt
        JOIN authorized_users au ON mt.email = au.email
        WHERE mt.token = ? AND mt.used_at IS NULL
      `,
      args: [token]
    });

    if (tokenResult.rows.length === 0) {
      return Response.json(
        { success: false, error: 'Ungültiger oder bereits verwendeter Token' },
        { status: 400 }
      );
    }

    const tokenData = tokenResult.rows[0];
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    // Check if token is expired
    if (now > expiresAt) {
      return Response.json(
        { success: false, error: 'Token ist abgelaufen. Bitte fordere einen neuen Magic Link an.' },
        { status: 400 }
      );
    }

    // Mark token as used
    await db.execute({
      sql: 'UPDATE magic_tokens SET used_at = ? WHERE token = ?',
      args: [now.toISOString(), token]
    });

    // Update last login
    await db.execute({
      sql: 'UPDATE authorized_users SET last_login = ? WHERE email = ?',
      args: [now.toISOString(), tokenData.email]
    });

    // Get user's project access if not admin
    let projectAccess = [];
    if (tokenData.role !== 'admin') {
      const accessResult = await db.execute({
        sql: 'SELECT project_id FROM user_project_access WHERE user_email = ?',
        args: [tokenData.email]
      });
      projectAccess = accessResult.rows.map(row => row.project_id);
    }

    // Create JWT session token using jose
    const secret = new TextEncoder().encode(JWT_SECRET);
    const sessionToken = await new SignJWT({
      email: tokenData.email,
      name: tokenData.name,
      role: tokenData.role,
      projectAccess: projectAccess,
      loginTime: now.toISOString()
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .setIssuedAt()
      .sign(secret);

    // Create response with secure cookie
    const response = Response.json({
      success: true,
      message: 'Erfolgreich angemeldet',
      user: {
        email: tokenData.email,
        name: tokenData.name,
        role: tokenData.role,
        projectAccess: projectAccess
      }
    });

    // Set secure HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    response.headers.set('Set-Cookie', 
      `next-auth.session-token=${sessionToken}; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`
    );
    
    console.log('🍪 Setting cookie:', `next-auth.session-token=${sessionToken.substring(0, 20)}...; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Strict`);

    return response;

  } catch (error) {
    console.error('Magic link verification error:', error);
    return Response.json(
      { success: false, error: 'Server-Fehler bei der Anmeldung' },
      { status: 500 }
    );
  }
}