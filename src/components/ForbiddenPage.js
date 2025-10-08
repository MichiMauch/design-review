'use client';

import Link from 'next/link';
import { Shield, Home, ArrowLeft, UserX } from 'lucide-react';

export default function ForbiddenPage({
  title = "Zugriff verweigert",
  message = "Sie haben keine Berechtigung, auf diese Ressource zuzugreifen.",
  showLoginButton = false,
  customActions = null
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* 403 Icon */}
          <div className="mx-auto h-24 w-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <Shield className="h-12 w-12 text-orange-600" />
          </div>

          {/* 403 Text */}
          <h1 className="text-9xl font-bold text-gray-200 mb-4">403</h1>

          {/* Error Message */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {title}
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {message}
          </p>

          {/* Action Buttons */}
          {customActions || (
            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              {showLoginButton && (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Anmelden
                </Link>
              )}

              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Home className="h-4 w-4 mr-2" />
                Zur Startseite
              </Link>
            </div>
          )}

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

      {/* Access Information */}
      <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Warum sehe ich diese Seite?
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>• Sie sind möglicherweise nicht angemeldet</p>
            <p>• Ihre Berechtigung reicht für diesen Bereich nicht aus</p>
            <p>• Der Zugriff auf diese Ressource ist eingeschränkt</p>
            <p>• Kontaktieren Sie einen Administrator für Hilfe</p>
          </div>
        </div>
      </div>
    </div>
  );
}