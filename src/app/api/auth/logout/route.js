export async function POST() {
  try {
    // Create response
    const response = Response.json({
      success: true,
      message: 'Erfolgreich abgemeldet'
    });

    // Clear session cookie
    const isProduction = process.env.NODE_ENV === 'production';
    response.headers.set('Set-Cookie', 
      `next-auth.session-token=; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Strict; Path=/; Max-Age=0`
    );

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return Response.json(
      { success: false, error: 'Fehler beim Abmelden' },
      { status: 500 }
    );
  }
}