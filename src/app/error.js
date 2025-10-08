'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw, ArrowLeft } from 'lucide-react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  // Determine error type and message
  const getErrorInfo = () => {
    if (error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
      return {
        code: '403',
        title: 'Zugriff verweigert',
        message: 'Sie haben keine Berechtigung, auf diese Ressource zuzugreifen.',
        color: 'orange'
      };
    }

    if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
      return {
        code: '401',
        title: 'Nicht autorisiert',
        message: 'Bitte melden Sie sich an, um auf diese Seite zuzugreifen.',
        color: 'yellow'
      };
    }

    // Default to 500 error
    return {
      code: '500',
      title: 'Serverfehler',
      message: 'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
      color: 'red'
    };
  };

  const errorInfo = getErrorInfo();

  const getColorClasses = (color) => {
    switch (color) {
      case 'orange':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-600',
          button: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
        };
      default:
        return {
          bg: 'bg-red-100',
          text: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        };
    }
  };

  const colors = getColorClasses(errorInfo.color);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Error Icon */}
          <div className={`mx-auto h-24 w-24 ${colors.bg} rounded-full flex items-center justify-center mb-6`}>
            <AlertTriangle className={`h-12 w-12 ${colors.text}`} />
          </div>

          {/* Error Code */}
          <h1 className="text-9xl font-bold text-gray-200 mb-4">{errorInfo.code}</h1>

          {/* Error Message */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {errorInfo.title}
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {errorInfo.message}
          </p>

          {/* Action Buttons */}
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <button
              onClick={reset}
              className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${colors.button} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Erneut versuchen
            </button>

            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Home className="h-4 w-4 mr-2" />
              Zur Startseite
            </Link>
          </div>

          {/* Back Button */}
          <div className="mt-6">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Zurück zur vorherigen Seite
            </button>
          </div>
        </div>
      </div>

      {/* Error Details (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-2xl">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Fehlerdetails (Entwicklungsmodus)
            </h3>
            <div className="bg-gray-100 p-4 rounded-md">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                {error?.message}
              </pre>
            </div>
            {error?.stack && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  Stack Trace anzeigen
                </summary>
                <div className="mt-2 bg-gray-100 p-4 rounded-md">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Weitere Hilfe benötigt?
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>• Aktualisieren Sie die Seite</p>
            <p>• Überprüfen Sie Ihre Internetverbindung</p>
            <p>• Kontaktieren Sie den Support, falls das Problem weiterhin besteht</p>
          </div>
        </div>
      </div>
    </div>
  );
}