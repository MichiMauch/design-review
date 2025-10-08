'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TestTube } from 'lucide-react';
import ErrorPageTester from '../../components/ErrorPageTester';

export default function TestErrorPagesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuthentication = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
        } else {
          router.push('/login');
          return;
        }
      } else {
        router.push('/login');
        return;
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      router.push('/login');
      return;
    } finally {
      setAuthChecked(true);
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Lade Error-Seiten Test...</div>
      </div>
    );
  }

  // Don't render anything if user doesn't exist (will redirect to login)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Zurück
          </button>

          <div className="flex items-center">
            <TestTube className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Error-Seiten Tester
              </h1>
              <p className="text-gray-600">
                Testen und Screenshot-Erfassung Ihrer benutzerdefinierten Error-Seiten
              </p>
            </div>
          </div>
        </div>

        {/* Quick Test Links */}
        <div className="mb-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Quick Tests - Error-Seiten direkt testen:
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/diese-seite-existiert-nicht"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              <div className="font-medium text-red-800">404 - Not Found</div>
              <div className="text-sm text-red-600">Test 404 Error-Seite</div>
            </a>

            <a
              href="/api/test-error-pages?code=403"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors"
            >
              <div className="font-medium text-orange-800">403 - Forbidden</div>
              <div className="text-sm text-orange-600">Test 403 Error-API</div>
            </a>

            <a
              href="/api/test-error-pages?code=500"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              <div className="font-medium text-red-800">500 - Server Error</div>
              <div className="text-sm text-red-600">Test 500 Error-API</div>
            </a>

            <a
              href="/api/test-error-pages?code=401"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 border border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors"
            >
              <div className="font-medium text-yellow-800">401 - Unauthorized</div>
              <div className="text-sm text-yellow-600">Test 401 Error-API</div>
            </a>
          </div>
        </div>

        {/* Error Page Tester Component */}
        <div className="bg-white shadow rounded-lg p-6">
          <ErrorPageTester />
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            Anleitung zur Nutzung:
          </h3>
          <div className="space-y-3 text-sm text-blue-800">
            <p>
              <strong>1. Quick Tests:</strong> Klicken Sie auf die Links oben, um Error-Seiten direkt in einem neuen Tab zu testen.
            </p>
            <p>
              <strong>2. Screenshot-Tool:</strong> Nutzen Sie das Tool unten, um verschiedene Error-Seiten zu visualisieren und Screenshots zu erstellen.
            </p>
            <p>
              <strong>3. Responsive Testing:</strong> Wechseln Sie zwischen Desktop- und Mobile-Ansicht, um das responsive Design zu testen.
            </p>
            <p>
              <strong>4. Download:</strong> Erstellen und laden Sie Screenshots Ihrer Error-Seiten für Dokumentation oder Design-Reviews herunter.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}