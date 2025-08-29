export async function POST() {
  try {
    // Create response
    const response = Response.json({
      success: true,
      message: 'Erfolgreich abgemeldet'
    });

    // Clear session cookie
    response.headers.set('Set-Cookie', 
      'session=; HttpOnly; Secure=${process.env.NODE_ENV === \'production\'}; SameSite=Strict; Path=/; Max-Age=0'
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