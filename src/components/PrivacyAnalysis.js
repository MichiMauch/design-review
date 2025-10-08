'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Cookie, Check, X, AlertTriangle, Shield, Eye, FileText, Users, ExternalLink } from 'lucide-react';

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

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-700 bg-green-100';
    if (score >= 70) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  const getScoreIcon = (score) => {
    if (score >= 90) return <Check className="h-4 w-4" />;
    if (score >= 70) return <AlertTriangle className="h-4 w-4" />;
    return <X className="h-4 w-4" />;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'compliance':
        return 'bg-orange-100 text-orange-700';
      case 'ux':
        return 'bg-purple-100 text-purple-700';
      case 'security':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
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

      {/* Privacy Score Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Privacy Compliance Score</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getScoreColor(analysis.score)}`}>
            {getScoreIcon(analysis.score)}
            {analysis.score}/100
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-orange-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${analysis.score}%` }}
          ></div>
        </div>

        <p className="text-sm text-gray-600">{analysis.summary}</p>
      </div>

      {/* Cookie Banner Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Cookie className="h-5 w-5 text-orange-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Cookie-Banner Analyse</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`text-center p-4 rounded-lg ${analysis.cookieBanner.detected ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`text-2xl font-bold ${analysis.cookieBanner.detected ? 'text-green-600' : 'text-red-600'}`}>
              {analysis.cookieBanner.detected ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600">Banner erkannt</div>
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

        {analysis.cookieBanner.detected && (
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Banner-Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <span className="px-2 py-1 bg-gray-100 rounded">Position: {analysis.cookieBanner.position}</span>
                <span className={`px-2 py-1 rounded ${analysis.cookieBanner.textAnalysis.mentionsGDPR ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  DSGVO: {analysis.cookieBanner.textAnalysis.mentionsGDPR ? 'Ja' : 'Nein'}
                </span>
                <span className={`px-2 py-1 rounded ${analysis.cookieBanner.textAnalysis.explainsPurpose ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  Zweck: {analysis.cookieBanner.textAnalysis.explainsPurpose ? 'Erklärt' : 'Unklar'}
                </span>
                <span className={`px-2 py-1 rounded ${analysis.cookieBanner.textAnalysis.providesDetails ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  Details: {analysis.cookieBanner.textAnalysis.providesDetails ? 'Ausführlich' : 'Kurz'}
                </span>
              </div>
            </div>

            {analysis.cookieBanner.bannerText && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Banner-Text (Auszug)</h4>
                <div className="p-3 bg-gray-50 rounded text-sm text-gray-700 max-h-24 overflow-y-auto">
                  {analysis.cookieBanner.bannerText.substring(0, 300)}
                  {analysis.cookieBanner.bannerText.length > 300 && '...'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cookies Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Eye className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Cookie-Kategorien</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{analysis.cookies.total}</div>
            <div className="text-sm text-gray-600">Cookies gesamt</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{analysis.cookies.categories.necessary}</div>
            <div className="text-sm text-gray-600">Notwendig</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{analysis.cookies.categories.analytics}</div>
            <div className="text-sm text-gray-600">Analytik</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{analysis.cookies.categories.marketing}</div>
            <div className="text-sm text-gray-600">Marketing</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{analysis.cookies.categories.functional}</div>
            <div className="text-sm text-gray-600">Funktional</div>
          </div>
        </div>

        {analysis.cookies.domains.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Third-Party Domains</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.cookies.domains.slice(0, 10).map((domain, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {domain}
                </span>
              ))}
              {analysis.cookies.domains.length > 10 && (
                <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm">
                  +{analysis.cookies.domains.length - 10} weitere
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* GDPR Compliance */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Shield className="h-5 w-5 text-green-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">DSGVO/GDPR Compliance</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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
          <div className={`text-center p-4 rounded-lg ${analysis.gdprCompliance.rightToErasure ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className={`text-2xl font-bold ${analysis.gdprCompliance.rightToErasure ? 'text-green-600' : 'text-yellow-600'}`}>
              {analysis.gdprCompliance.rightToErasure ? '✓' : '?'}
            </div>
            <div className="text-sm text-gray-600">Recht auf Löschung</div>
          </div>
          <div className={`text-center p-4 rounded-lg ${analysis.gdprCompliance.dataPortability ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className={`text-2xl font-bold ${analysis.gdprCompliance.dataPortability ? 'text-green-600' : 'text-yellow-600'}`}>
              {analysis.gdprCompliance.dataPortability ? '✓' : '?'}
            </div>
            <div className="text-sm text-gray-600">Datenportabilität</div>
          </div>
          <div className={`text-center p-4 rounded-lg ${analysis.gdprCompliance.rightToWithdraw ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className={`text-2xl font-bold ${analysis.gdprCompliance.rightToWithdraw ? 'text-green-600' : 'text-yellow-600'}`}>
              {analysis.gdprCompliance.rightToWithdraw ? '✓' : '?'}
            </div>
            <div className="text-sm text-gray-600">Widerrufsrecht</div>
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.gdprCompliance.privacyPolicyLinks.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Datenschutz-Links</h4>
              <div className="space-y-1">
                {analysis.gdprCompliance.privacyPolicyLinks.slice(0, 3).map((link, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <FileText className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-700">{link.text}</span>
                    <ExternalLink className="h-3 w-3 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.gdprCompliance.imprintLinks.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Impressum-Links</h4>
              <div className="space-y-1">
                {analysis.gdprCompliance.imprintLinks.slice(0, 3).map((link, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <FileText className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-700">{link.text}</span>
                    <ExternalLink className="h-3 w-3 text-gray-400" />
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

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Empfehlungen</h3>
          <div className="space-y-3">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  rec.priority === 'high' ? 'text-red-600' :
                  rec.priority === 'medium' ? 'text-yellow-600' :
                  'text-blue-600'
                }`} />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                      {rec.priority === 'high' ? 'Hoch' : rec.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                    </span>
                    {rec.category && (
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCategoryColor(rec.category)}`}>
                        {rec.category === 'compliance' ? 'Compliance' :
                         rec.category === 'ux' ? 'Benutzererfahrung' :
                         rec.category === 'security' ? 'Sicherheit' : rec.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}