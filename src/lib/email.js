import mailchimp from '@mailchimp/mailchimp_transactional';

// Initialize Mandrill client - only if API key is available
const mandrill = process.env.MANDRILL_API_KEY 
  ? mailchimp(process.env.MANDRILL_API_KEY)
  : null;

/**
 * Send a magic link email via Mandrill
 * @param {string} email - Recipient email address
 * @param {string} token - Magic link token
 * @param {string} name - Recipient name
 * @returns {Promise<boolean>} - Success status
 */
export async function sendMagicLinkEmail(email, token, name) {
  const magicLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/magic?token=${token}`;
  
  // Always log in development for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('\n🪄 MAGIC LINK EMAIL (Development Mode)');
    console.log('To:', email);
    console.log('Name:', name);
    console.log('Link:', magicLink);
    console.log('Valid for: 15 minutes');
    console.log('Mandrill:', mandrill ? 'Configured' : 'Not configured\n');
  }
  
  // If no Mandrill API key, just log and return
  if (!mandrill) {
    console.warn('⚠️ Mandrill API key not configured. Magic link logged to console only.');
    console.log('Magic Link for', email, ':', magicLink);
    return true;
  }
  
  try {
    // Create the email HTML template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Magic Link - Design Review Tool</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 30px 0; }
          .logo { width: 60px; height: 60px; background: #2563EB; border-radius: 12px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
          .content { background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .button { display: inline-block; padding: 16px 32px; background: #2563EB; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 30px 0; }
          .footer { text-align: center; padding: 30px 0; color: #6B7280; font-size: 14px; }
          .warning { background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 12px; margin-top: 20px; color: #92400E; font-size: 14px; }
        </style>
      </head>
      <body style="background: #F9FAFB; margin: 0; padding: 0;">
        <div class="container">
          <div class="header">
            <div class="logo" style="width: 60px; height: 60px; background: #2563EB; border-radius: 12px; margin: 0 auto 20px;">
              <div style="color: white; font-size: 24px; font-weight: bold; text-align: center; line-height: 60px;">DR</div>
            </div>
            <h1 style="color: #111827; font-size: 24px; margin: 0;">Design Review Tool</h1>
          </div>
          
          <div class="content" style="background: white; border-radius: 12px; padding: 40px; margin: 0 20px;">
            <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Hallo ${name || 'dort'}!</h2>
            
            <p style="color: #4B5563; line-height: 1.6;">
              Du hast einen Magic Link zum Anmelden angefordert. Klicke auf den Button unten, um dich anzumelden:
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${magicLink}" class="button" style="display: inline-block; padding: 16px 32px; background: #2563EB; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                🔐 Jetzt anmelden
              </a>
            </div>
            
            <div class="warning" style="background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 16px; margin-top: 30px;">
              <strong>⏱️ Wichtig:</strong> Dieser Link ist nur 15 Minuten gültig.
            </div>
            
            <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              Falls du diese E-Mail nicht angefordert hast, kannst du sie einfach ignorieren. 
              Es wird kein Account erstellt oder geändert.
            </p>
            
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
            
            <p style="color: #9CA3AF; font-size: 12px; line-height: 1.4;">
              Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
              <a href="${magicLink}" style="color: #2563EB; word-break: break-all;">${magicLink}</a>
            </p>
          </div>
          
          <div class="footer">
            <p style="color: #6B7280; font-size: 14px; margin: 0;">
              © ${new Date().getFullYear()} Design Review Tool. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text version for email clients that don't support HTML
    const textContent = `
Hallo ${name || 'dort'}!

Du hast einen Magic Link zum Anmelden angefordert.

Klicke auf den folgenden Link, um dich anzumelden:
${magicLink}

⏱️ Wichtig: Dieser Link ist nur 15 Minuten gültig.

Falls du diese E-Mail nicht angefordert hast, kannst du sie einfach ignorieren.

© ${new Date().getFullYear()} Design Review Tool
    `.trim();

    // Send email via Mandrill
    const message = {
      from_email: process.env.MANDRILL_FROM_EMAIL || 'noreply@design-review.com',
      from_name: process.env.MANDRILL_FROM_NAME || 'Design Review Tool',
      to: [{
        email: email,
        name: name || email,
        type: 'to'
      }],
      subject: '🔐 Dein Magic Link für Design Review Tool',
      html: htmlContent,
      text: textContent,
      tags: ['magic-link'],
      metadata: {
        website: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      }
    };

    const response = await mandrill.messages.send({ message });
    
    if (response && response[0] && response[0].status === 'sent') {
      console.log('✅ Magic Link email sent successfully to:', email);
      return true;
    } else {
      console.error('❌ Mandrill response:', response);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Failed to send Magic Link email:', error);
    
    // In production, we might want to notify admins or use a fallback
    if (process.env.NODE_ENV === 'production') {
      // Log the magic link as fallback
      console.error('Fallback - Magic Link for', email, ':', magicLink);
    }
    
    return false;
  }
}