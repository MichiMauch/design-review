'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

function MagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Ungültiger Magic Link. Token fehlt.');
      return;
    }

    authenticateWithToken(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const authenticateWithToken = async (token) => {
    try {
      const response = await fetch('/api/auth/verify-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus('success');
        setMessage('Erfolgreich angemeldet!');
        setUserInfo(result.user);
        
        // Redirect to admin or projects page after short delay
        setTimeout(() => {
          if (result.user.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/projects');
          }
        }, 2000);
      } else {
        setStatus('error');
        setMessage(result.error || 'Magic Link ist ungültig oder abgelaufen.');
      }
    } catch {
      setStatus('error');
      setMessage('Verbindungsfehler. Bitte versuche es erneut.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader className="mx-auto h-16 w-16 text-blue-500 animate-spin" />
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Anmeldung läuft...
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Dein Magic Link wird überprüft.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Willkommen zurück!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              {userInfo && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Name:</strong> {userInfo.name}
                  </p>
                  <p className="text-sm text-green-800">
                    <strong>E-Mail:</strong> {userInfo.email}
                  </p>
                  <p className="text-sm text-green-800">
                    <strong>Rolle:</strong> {userInfo.role === 'admin' ? 'Administrator' : 'Benutzer'}
                  </p>
                </div>
              )}
              <p className="mt-4 text-xs text-gray-500">
                Du wirst automatisch weitergeleitet...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="mx-auto h-16 w-16 text-red-500" />
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Anmeldung fehlgeschlagen
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/login')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                >
                  Neuen Magic Link anfordern
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <MagicLinkContent />
    </Suspense>
  );
}