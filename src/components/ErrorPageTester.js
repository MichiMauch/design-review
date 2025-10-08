'use client';

import { useState, useEffect } from 'react';
import { Eye, RefreshCw, Monitor, Smartphone, ExternalLink, AlertCircle } from 'lucide-react';
import InfoTooltip, { InfoTooltipMultiline } from './shared/InfoTooltip';

export default function ErrorPageTester({ projectUrl = null }) {
  const [activeError, setActiveError] = useState('404');
  const [viewMode, setViewMode] = useState('desktop'); // desktop, mobile
  const [customPath, setCustomPath] = useState('');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [corsError, setCorsError] = useState(false);

  const errorTypes = [
    { code: '404', name: 'Not Found', defaultPath: '/non-existent-page-12345' },
    { code: '403', name: 'Forbidden', defaultPath: '/admin' },
    { code: '500', name: 'Server Error', defaultPath: '/api/server-error' },
    { code: '401', name: 'Unauthorized', defaultPath: '/dashboard' }
  ];

  // Generate error URL for target website
  const generateErrorUrl = (errorCode, customPathOverride = null) => {
    if (!projectUrl) return null;

    const errorType = errorTypes.find(type => type.code === errorCode);
    const path = customPathOverride || customPath || errorType?.defaultPath || '/non-existent-page';

    // Clean up projectUrl and ensure proper format
    const baseUrl = projectUrl.replace(/\/+$/, ''); // Remove trailing slashes
    const fullUrl = `${baseUrl}${path}`;

    return fullUrl;
  };

  // Reset iframe states when error type or URL changes
  useEffect(() => {
    setIframeLoaded(false);
    setCorsError(false);
  }, [activeError, customPath, projectUrl]);

  // Handle iframe load events
  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setCorsError(false);
  };

  const handleIframeError = () => {
    setCorsError(true);
    setIframeLoaded(false);
  };

  // Open error page in new tab
  const openInNewTab = () => {
    const url = generateErrorUrl(activeError);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };


  const renderErrorPage = () => {
    if (!projectUrl) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Keine Projekt-URL verfügbar</p>
            <p className="text-sm text-gray-500">ErrorPageTester benötigt eine gültige Projekt-URL</p>
          </div>
        </div>
      );
    }

    const errorUrl = generateErrorUrl(activeError);
    const iframeStyle = {
      width: viewMode === 'mobile' ? '375px' : '100%',
      height: viewMode === 'mobile' ? '667px' : '800px',
      border: 'none',
      borderRadius: '4px'
    };

    if (corsError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg p-6">
          <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">CORS-Einschränkung</h3>
          <p className="text-gray-600 text-center mb-4">
            Die Website blockiert die Einbettung in einem iframe.
          </p>
          <div className="space-y-2">
            <button
              onClick={openInNewTab}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              In neuem Tab öffnen
            </button>
            <p className="text-xs text-gray-500 text-center">
              URL: {errorUrl}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg z-10">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">Lade Error-Seite...</p>
            </div>
          </div>
        )}
        <iframe
          src={errorUrl}
          style={iframeStyle}
          sandbox="allow-same-origin allow-scripts allow-forms"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={`${activeError} Error Page`}
        />
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <h3 className="font-medium text-gray-900">Error-Seiten Tester</h3>
        <InfoTooltipMultiline
          title="Error-Seiten Tester (Zielwebsite)"
          content="Testen Sie Error-Seiten der analysierten Website:"
          items={[
            "404: Lädt nicht-existierende Seiten der Zielwebsite",
            "403: Testet geschützte Bereiche wie /admin",
            "500/401: Prüft Server- und Auth-Fehler",
            "CORS-Fallback: Öffnet Seiten in neuem Tab",
            "Live-Preview: Desktop/Mobile Ansicht"
          ]}
          className="ml-2"
        />
      </div>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        {/* Error Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Error-Typ wählen:
          </label>
          <div className="flex flex-wrap gap-2">
            {errorTypes.map((error) => (
              <button
                key={error.code}
                onClick={() => setActiveError(error.code)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  activeError === error.code
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {error.code} - {error.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Path Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Error-Pfad (optional):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder={errorTypes.find(type => type.code === activeError)?.defaultPath || '/custom-path'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => setCustomPath('')}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
          {projectUrl && (
            <p className="mt-1 text-xs text-gray-500">
              Test-URL: {generateErrorUrl(activeError)}
            </p>
          )}
        </div>

        {/* View Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ansichtsmodus:
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('desktop')}
              className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                viewMode === 'desktop'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Monitor className="h-4 w-4 mr-1" />
              Desktop
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                viewMode === 'mobile'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Smartphone className="h-4 w-4 mr-1" />
              Mobile
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openInNewTab}
            disabled={!projectUrl}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            In neuem Tab öffnen
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
        <div className="bg-gray-200 px-4 py-2 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              Live-Vorschau: {activeError} Error ({viewMode})
            </div>
            {projectUrl && (
              <div className="text-xs text-gray-500 truncate ml-4">
                {generateErrorUrl(activeError)}
              </div>
            )}
          </div>
          {iframeLoaded && (
            <div className="mt-1 text-xs text-green-600">
              ✓ Iframe geladen
            </div>
          )}
        </div>

        <div className={`${viewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'}`}>
          {renderErrorPage()}
        </div>
      </div>


      {/* Usage Information */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="font-medium text-blue-900 mb-2">Funktionsweise:</h4>
        <div className="space-y-1 text-sm text-blue-800">
          <p>• <strong>Iframe-Einbettung:</strong> Lädt Error-Seiten der Zielwebsite direkt</p>
          <p>• <strong>CORS-Fallback:</strong> Bei blockierten iframe-Inhalten wird "In neuem Tab öffnen" angeboten</p>
          <p>• <strong>Custom Pfade:</strong> Testen Sie spezifische Error-URLs der Zielwebsite</p>
          <p>• <strong>Live-Preview:</strong> Desktop/Mobile Ansicht der Error-Seiten</p>
        </div>
      </div>
    </div>
  );
}