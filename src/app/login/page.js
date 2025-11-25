'use client';

import { useState } from 'react';
import { Mail, Send, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Bitte gib eine E-Mail-Adresse ein');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const result = await response.json();
      
      if (response.ok) {
        setIsEmailSent(true);
      } else {
        setError(result.error || 'Ein Fehler ist aufgetreten');
      }
    } catch {
      setError('Verbindungsfehler. Bitte versuche es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              E-Mail gesendet!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Wir haben dir einen Magic Link an <strong>{email}</strong> gesendet.
              Klicke auf den Link in der E-Mail, um dich anzumelden.
            </p>
            <p className="mt-4 text-xs text-gray-500">
              Der Link ist 15 Minuten gültig. Prüfe auch deinen Spam-Ordner.
            </p>
          </div>
          
          <div className="text-center">
            <button
              onClick={() => {
                setIsEmailSent(false);
                setEmail('');
              }}
              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
            >
              ← Zurück zum Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-lg flex items-center justify-center">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Design Review Tool
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Gib deine E-Mail-Adresse ein, um einen Magic Link zu erhalten
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} action="#">
          <div>
            <label htmlFor="email" className="sr-only">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10"
              placeholder="deine@email.com"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sende Magic Link...
                </div>
              ) : (
                <div className="flex items-center">
                  <Send className="h-4 w-4 mr-2" />
                  Magic Link senden
                </div>
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Nur autorisierte E-Mail-Adressen können sich anmelden.
          </p>
        </div>
      </div>
    </div>
  );
}