import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const errorCode = searchParams.get('code') || '404';
    const customMessage = searchParams.get('message');

    // Simulate different error types
    switch (errorCode) {
      case '404':
        return NextResponse.json(
          {
            error: 'Not Found',
            message: customMessage || 'Die angeforderte Ressource wurde nicht gefunden.',
            code: 404,
            type: 'not_found'
          },
          { status: 404 }
        );

      case '403':
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: customMessage || 'Sie haben keine Berechtigung, auf diese Ressource zuzugreifen.',
            code: 403,
            type: 'forbidden'
          },
          { status: 403 }
        );

      case '401':
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: customMessage || 'Authentifizierung erforderlich.',
            code: 401,
            type: 'unauthorized'
          },
          { status: 401 }
        );

      case '500':
        return NextResponse.json(
          {
            error: 'Internal Server Error',
            message: customMessage || 'Ein interner Serverfehler ist aufgetreten.',
            code: 500,
            type: 'server_error'
          },
          { status: 500 }
        );

      case '503':
        return NextResponse.json(
          {
            error: 'Service Unavailable',
            message: customMessage || 'Der Service ist temporär nicht verfügbar.',
            code: 503,
            type: 'service_unavailable'
          },
          { status: 503 }
        );

      case 'client_error':
        // Force a client-side error for testing
        throw new Error(customMessage || 'Simulated client-side error for testing purposes');

      default:
        return NextResponse.json(
          {
            error: 'Unknown Error',
            message: customMessage || `Unbekannter Fehlercode: ${errorCode}`,
            code: parseInt(errorCode) || 400,
            type: 'unknown'
          },
          { status: parseInt(errorCode) || 400 }
        );
    }

  } catch (error) {
    // This will trigger the error.js page
    console.error('Test error route error:', error);
    throw error;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { errorType, customMessage, customCode } = body;

    // Allow more complex error testing via POST
    switch (errorType) {
      case 'database_error':
        throw new Error(customMessage || 'Database connection failed');

      case 'validation_error':
        return NextResponse.json(
          {
            error: 'Validation Error',
            message: customMessage || 'Eingabedaten sind ungültig.',
            code: 422,
            type: 'validation_error',
            details: [
              { field: 'email', message: 'E-Mail ist erforderlich' },
              { field: 'password', message: 'Passwort muss mindestens 8 Zeichen haben' }
            ]
          },
          { status: 422 }
        );

      case 'rate_limit':
        return NextResponse.json(
          {
            error: 'Rate Limit Exceeded',
            message: customMessage || 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
            code: 429,
            type: 'rate_limit',
            retryAfter: 3600
          },
          {
            status: 429,
            headers: {
              'Retry-After': '3600'
            }
          }
        );

      case 'maintenance':
        return NextResponse.json(
          {
            error: 'Service Under Maintenance',
            message: customMessage || 'Der Service befindet sich in Wartung.',
            code: 503,
            type: 'maintenance',
            estimatedTime: '2 Stunden'
          },
          { status: 503 }
        );

      default:
        return NextResponse.json(
          {
            error: 'Bad Request',
            message: 'Ungültiger Error-Typ angegeben.',
            code: 400,
            type: 'bad_request'
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('POST test error route error:', error);
    throw error;
  }
}