'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Cookie, Check, X, AlertTriangle, Shield, Eye, FileText, Users, ExternalLink, BarChart3 } from 'lucide-react';

export default function PrivacyAnalysis({ projectId, projectUrl, showHeader = true }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (projectUrl) {
      fetchAnalysis();
    } else {
      setLoading(false);
      setError('Keine URL zum Analysieren verfügbar');
    }
  }, [projectUrl, projectId]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/analysis/privacy${projectUrl ? `?url=${encodeURIComponent(projectUrl)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Abrufen der Privacy-Daten');
      }

      setAnalysis(data);
    } catch (err) {
      console.error('Privacy analysis error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 text-orange-600 animate-spin mb-4" />
        <p className="text-gray-600">Analysiere Privacy & Compliance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchAnalysis}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <Cookie className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Keine Privacy-Daten verfügbar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Cookie className="h-6 w-6 text-orange-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Cookie & Privacy Compliance</h2>
          </div>
          <button
            onClick={fetchAnalysis}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Analyse aktualisieren"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Cookie Banner Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Cookie className="h-5 w-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Cookie-Banner Analyse</h3>
          </div>
          {analysis.cookieBanner.confidence > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Confidence:</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                analysis.cookieBanner.confidence >= 0.9 ? 'bg-green-100 text-green-700' :
                analysis.cookieBanner.confidence >= 0.7 ? 'bg-yellow-100 text-yellow-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {Math.round(analysis.cookieBanner.confidence * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* GTM & CMP Detection Info - Only show if CMP is detected */}
        {analysis.detectedCMPs?.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 text-sm">Erkannte Implementierung:</h4>
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-blue-800">
                    ✓ CMP-Provider: <strong>{analysis.detectedCMPs.map(c => c.name).join(', ')}</strong>
                  </p>
                  {analysis.gtm?.detected && (
                    <p className="text-xs text-blue-700">
                      ✓ Wird über Google Tag Manager geladen {analysis.gtm.containerId && `(${analysis.gtm.containerId})`}
                    </p>
                  )}
                  {analysis.cookieBanner.detectionMethod === 'cmp-script' && (
                    <p className="text-xs text-blue-600 mt-1">
                      ℹ Banner wird dynamisch geladen - Details nach Seiten-Rendering verfügbar
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warning if GTM detected but no CMP */}
        {analysis.gtm?.detected && analysis.detectedCMPs?.length === 0 && !analysis.cookieBanner.detected && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900 text-sm">Hinweis:</h4>
                <p className="text-xs text-yellow-800 mt-1">
                  Google Tag Manager erkannt {analysis.gtm.containerId && `(${analysis.gtm.containerId})`}, aber kein bekannter Cookie-Banner oder CMP gefunden. Bitte überprüfen Sie die GTM-Tags manuell.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error message if no banner detected at all */}
        {!analysis.cookieBanner.detected && analysis.detectedCMPs?.length === 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900 text-sm">Kein Cookie-Banner erkannt</h4>
                <p className="text-xs text-red-800 mt-1">
                  Es wurde weder ein Cookie-Banner im DOM gefunden, noch ein bekannter CMP-Provider erkannt.
                  {analysis.gtm?.detected ?
                    ' Überprüfen Sie die GTM-Tags manuell auf Cookie-Banner-Implementierungen.' :
                    ' Möglicherweise verwenden Sie einen Custom-Banner oder es ist kein Banner vorhanden.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`text-center p-4 rounded-lg ${analysis.cookieBanner.detected ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`text-2xl font-bold ${analysis.cookieBanner.detected ? 'text-green-600' : 'text-red-600'}`}>
              {analysis.cookieBanner.detected ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Banner erkannt</div>
            {analysis.cookieBanner.cmpProvider && (
              <div className="text-xs text-gray-500 mt-1">{analysis.cookieBanner.cmpProvider}</div>
            )}
          </div>
          <div className={`text-center p-4 rounded-lg ${analysis.cookieBanner.hasRejectButton ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`text-2xl font-bold ${analysis.cookieBanner.hasRejectButton ? 'text-green-600' : 'text-red-600'}`}>
              {analysis.cookieBanner.hasRejectButton ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Ablehnen-Button</div>
          </div>
          <div className={`text-center p-4 rounded-lg ${analysis.cookieBanner.hasAcceptButton ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className={`text-2xl font-bold ${analysis.cookieBanner.hasAcceptButton ? 'text-green-600' : 'text-yellow-600'}`}>
              {analysis.cookieBanner.hasAcceptButton ? '✓' : '?'}
            </div>
            <div className="text-sm text-gray-600">Akzeptieren-Button</div>
          </div>
          <div className={`text-center p-4 rounded-lg ${analysis.cookieBanner.hasSettingsLink ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className={`text-2xl font-bold ${analysis.cookieBanner.hasSettingsLink ? 'text-green-600' : 'text-yellow-600'}`}>
              {analysis.cookieBanner.hasSettingsLink ? '✓' : '?'}
            </div>
            <div className="text-sm text-gray-600">Einstellungen</div>
          </div>
        </div>
      </div>

      {/* GDPR Compliance */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Shield className="h-5 w-5 text-green-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">DSGVO/GDPR Compliance</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`text-center p-4 rounded-lg ${analysis.gdprCompliance.hasPrivacyPolicy ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`text-2xl font-bold ${analysis.gdprCompliance.hasPrivacyPolicy ? 'text-green-600' : 'text-red-600'}`}>
              {analysis.gdprCompliance.hasPrivacyPolicy ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Datenschutzerklärung</div>
          </div>
          <div className={`text-center p-4 rounded-lg ${analysis.gdprCompliance.hasImprint ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`text-2xl font-bold ${analysis.gdprCompliance.hasImprint ? 'text-green-600' : 'text-red-600'}`}>
              {analysis.gdprCompliance.hasImprint ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Impressum</div>
          </div>
          <div className={`text-center p-4 rounded-lg ${analysis.gdprCompliance.hasContactInfo ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className={`text-2xl font-bold ${analysis.gdprCompliance.hasContactInfo ? 'text-green-600' : 'text-yellow-600'}`}>
              {analysis.gdprCompliance.hasContactInfo ? '✓' : '?'}
            </div>
            <div className="text-sm text-gray-600">Kontaktdaten</div>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-4">
          {analysis.gdprCompliance.privacyPolicyLinks.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                Datenschutzerklärung
              </h4>
              <div className="space-y-2 pl-6">
                {analysis.gdprCompliance.privacyPolicyLinks.slice(0, 5).map((link, index) => (
                  <div key={index} className="flex flex-col gap-1">
                    <a
                      href={link.href.startsWith('http') ? link.href : `https://${analysis.url}${link.href}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium flex items-center gap-1"
                    >
                      {link.text}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="text-xs text-gray-500 font-mono truncate">{link.href}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.gdprCompliance.imprintLinks.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Impressum
              </h4>
              <div className="space-y-2 pl-6">
                {analysis.gdprCompliance.imprintLinks.slice(0, 5).map((link, index) => (
                  <div key={index} className="flex flex-col gap-1">
                    <a
                      href={link.href.startsWith('http') ? link.href : `https://${analysis.url}${link.href}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium flex items-center gap-1"
                    >
                      {link.text}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="text-xs text-gray-500 font-mono truncate">{link.href}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.gdprCompliance.contactLinks.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Kontakt
              </h4>
              <div className="space-y-2 pl-6">
                {analysis.gdprCompliance.contactLinks.slice(0, 5).map((link, index) => (
                  <div key={index} className="flex flex-col gap-1">
                    <a
                      href={link.href.startsWith('http') ? link.href : `https://${analysis.url}${link.href}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium flex items-center gap-1"
                    >
                      {link.text}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="text-xs text-gray-500 font-mono truncate">{link.href}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Consent Management Platform */}
      {analysis.consentManagement.detected && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Consent Management Platform</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <div className="text-lg font-bold text-indigo-600">{analysis.consentManagement.platform}</div>
              <div className="text-sm text-gray-600">CMP Anbieter</div>
            </div>
            <div className={`text-center p-4 rounded-lg ${analysis.consentManagement.iabTcfCompliant ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <div className={`text-2xl font-bold ${analysis.consentManagement.iabTcfCompliant ? 'text-green-600' : 'text-yellow-600'}`}>
                {analysis.consentManagement.iabTcfCompliant ? '✓' : '?'}
              </div>
              <div className="text-sm text-gray-600">IAB TCF 2.0</div>
            </div>
            <div className={`text-center p-4 rounded-lg ${analysis.consentManagement.granularSettings ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <div className={`text-2xl font-bold ${analysis.consentManagement.granularSettings ? 'text-green-600' : 'text-yellow-600'}`}>
                {analysis.consentManagement.granularSettings ? '✓' : '?'}
              </div>
              <div className="text-sm text-gray-600">Granulare Einstellungen</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-600">{analysis.consentManagement.providers.length}</div>
              <div className="text-sm text-gray-600">Erkannte CMPs</div>
            </div>
          </div>
        </div>
      )}

      {/* Third-Party Services */}
      {Object.values(analysis.thirdPartyServices).some(services => services.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ExternalLink className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Third-Party Services</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(analysis.thirdPartyServices).map(([category, services]) => {
              if (services.length === 0) return null;

              const categoryColors = {
                analytics: 'bg-blue-50 border-blue-200',
                marketing: 'bg-red-50 border-red-200',
                social: 'bg-green-50 border-green-200',
                other: 'bg-gray-50 border-gray-200'
              };

              return (
                <div key={category} className={`p-4 rounded-lg border ${categoryColors[category]}`}>
                  <h4 className="font-medium text-gray-900 mb-2 capitalize">{category}</h4>
                  <div className="space-y-1">
                    {services.slice(0, 3).map((service, index) => (
                      <div key={index} className="text-sm text-gray-700">
                        {service.name}
                      </div>
                    ))}
                    {services.length > 3 && (
                      <div className="text-xs text-gray-500">+{services.length - 3} weitere</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}