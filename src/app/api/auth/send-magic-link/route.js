import { getDb, initDatabase } from '../../../../../lib/db.js';
import crypto from 'crypto';

// Rate limiting in memory (in production use Redis)
const rateLimitMap = new Map();

function checkRateLimit(email) {
  const now = Date.now();
  const key = email.toLowerCase();
  const attempts = rateLimitMap.get(key) || [];
  
  // Remove attempts older than 5 minutes
  const validAttempts = attempts.filter(timestamp => now - timestamp < 5 * 60 * 1000);
  
  if (validAttempts.length >= 3) {
    return false; // Too many attempts
  }
  
  validAttempts.push(now);
  rateLimitMap.set(key, validAttempts);
  return true;
}

async function sendMagicLinkEmail(email, token, name) {
  const magicLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/magic?token=${token}`;
  
  // For development: log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('\n🪄 MAGIC LINK EMAIL');
    console.log('To:', email);
    console.log('Name:', name);
    console.log('Link:', magicLink);
    console.log('Valid for: 15 minutes\n');
    return true;
  }
  
  // TODO: Implement actual email sending with SMTP
  // For now, just log the link
  console.log('Magic Link for', email, ':', magicLink);
  
  return true;
}

export async function POST(request) {
  try {
    const { email } = await request.json();
    
    if (!email || !email.trim()) {
      return Response.json(
        { success: false, error: 'E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check rate limiting
    if (!checkRateLimit(normalizedEmail)) {
      return Response.json(
        { success: false, error: 'Zu viele Anfragen. Bitte warte 5 Minuten.' },
        { status: 429 }
      );
    }

    await initDatabase();
    const db = getDb();

    // Check if user is authorized
    const user = await db.execute({
      sql: 'SELECT email, name, role FROM authorized_users WHERE email = ?',
      args: [normalizedEmail]
    });

    if (user.rows.length === 0) {
      // Return success even for non-authorized users (security)
      return Response.json({
        success: true,
        message: 'Falls deine E-Mail-Adresse autorisiert ist, wurde ein Magic Link gesendet.'
      });
    }

    const userData = user.rows[0];

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token in database
    await db.execute({
      sql: `
        INSERT INTO magic_tokens (token, email, expires_at)
        VALUES (?, ?, ?)
      `,
      args: [token, normalizedEmail, expiresAt.toISOString()]
    });

    // Send magic link email
    await sendMagicLinkEmail(normalizedEmail, token, userData.name);

    return Response.json({
      success: true,
      message: 'Magic Link wurde gesendet!'
    });

  } catch (error) {
    console.error('Magic link error:', error);
    return Response.json(
      { success: false, error: 'Server-Fehler. Bitte versuche es erneut.' },
      { status: 500 }
    );
  }
}