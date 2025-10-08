'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Shield, Check, X, AlertTriangle, Lock, Unlock, ExternalLink } from 'lucide-react';
import InfoTooltip, { InfoTooltipMultiline } from './shared/InfoTooltip';

export default function SecurityAnalysis({ projectId, projectUrl, showHeader = true }) {
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
      const url = `/api/projects/${projectId}/security${projectUrl ? `?url=${encodeURIComponent(projectUrl)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Abrufen der Security-Daten');
      }

      setAnalysis(data);
    } catch (err) {
      console.error('Security analysis error:', err);
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
    if (score >= 90) return <Shield className="h-4 w-4" />;
    if (score >= 70) return <AlertTriangle className="h-4 w-4" />;
    return <Unlock className="h-4 w-4" />;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-700 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-700 bg-blue-100 border-blue-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const renderSecurityHeaders = () => {
    if (!analysis?.security?.headers) return null;

    const { securityHeaders, missingHeaders } = analysis.security.headers;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <h3 className="font-medium text-gray-900">Security Headers</h3>
          <InfoTooltipMultiline
            title="Security Headers"
            content="HTTP-Header die vor verschiedenen Angriffen schützen:"
            items={[
              "Content-Security-Policy (CSP): Schutz vor XSS-Angriffen",
              "Strict-Transport-Security (HSTS): Erzwingt HTTPS",
              "X-Frame-Options: Schutz vor Clickjacking",
              "X-Content-Type-Options: Verhindert MIME-Type Sniffing"
            ]}
            className="ml-2"
          />
        </div>
        
        {securityHeaders.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Vorhandene Headers ({securityHeaders.length})
            </h4>
            <div className="space-y-2">
              {securityHeaders.map((header, index) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-900">{header.name}</span>
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                      {header.description}
                    </span>
                  </div>
                  <div className="text-sm text-green-700 mt-1 font-mono break-all">
                    {header.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {missingHeaders.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center">
              <X className="h-4 w-4 mr-1" />
              Fehlende Headers ({missingHeaders.length})
            </h4>
            <div className="space-y-2">
              {missingHeaders.map((header, index) => (
                <div key={index} className={`border rounded p-3 ${getSeverityColor(header.importance)}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{header.name}</span>
                    <span className="text-xs px-2 py-1 rounded capitalize">
                      {header.importance}
                    </span>
                  </div>
                  <div className="text-sm mt-1">{header.description}</div>
                  <div className="text-xs mt-2 opacity-90">{header.recommendation}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderVulnerabilities = () => {
    if (!analysis?.security?.vulnerabilities?.length) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">Keine Schwachstellen gefunden</span>
          </div>
          <p className="text-green-700 text-sm mt-1">Ihre Website zeigt keine offensichtlichen Sicherheitsprobleme.</p>
        </div>
      );
    }

    const groupedVulns = {
      high: analysis.security.vulnerabilities.filter(v => v.severity === 'high'),
      medium: analysis.security.vulnerabilities.filter(v => v.severity === 'medium'),
      low: analysis.security.vulnerabilities.filter(v => v.severity === 'low')
    };

    return (
      <div className="space-y-4">
        {groupedVulns.high.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="font-medium text-red-900">Hohe Risiken ({groupedVulns.high.length})</span>
            </div>
            <div className="space-y-3">
              {groupedVulns.high.map((vuln, index) => (
                <div key={index} className="bg-white border border-red-200 rounded p-3">
                  <div className="font-medium text-red-900">{vuln.message}</div>
                  <div className="text-sm text-red-700 mt-1">{vuln.description}</div>
                  <div className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">
                    <strong>Empfehlung:</strong> {vuln.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {groupedVulns.medium.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="font-medium text-yellow-900">Mittlere Risiken ({groupedVulns.medium.length})</span>
            </div>
            <div className="space-y-3">
              {groupedVulns.medium.map((vuln, index) => (
                <div key={index} className="bg-white border border-yellow-200 rounded p-3">
                  <div className="font-medium text-yellow-900">{vuln.message}</div>
                  <div className="text-sm text-yellow-700 mt-1">{vuln.description}</div>
                  <div className="text-xs text-yellow-600 mt-2 bg-yellow-50 p-2 rounded">
                    <strong>Empfehlung:</strong> {vuln.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {groupedVulns.low.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">Niedrige Risiken ({groupedVulns.low.length})</span>
            </div>
            <div className="space-y-3">
              {groupedVulns.low.map((vuln, index) => (
                <div key={index} className="bg-white border border-blue-200 rounded p-3">
                  <div className="font-medium text-blue-900">{vuln.message}</div>
                  <div className="text-sm text-blue-700 mt-1">{vuln.description}</div>
                  <div className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded">
                    <strong>Empfehlung:</strong> {vuln.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContentSecurity = () => {
    if (!analysis?.security?.content) return null;

    const { mixedContent, externalResources, insecureLinks } = analysis.security.content;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <h3 className="font-medium text-gray-900">Content Sicherheit</h3>
          <InfoTooltipMultiline
            title="Content Sicherheit"
            content="Analyse der geladenen Inhalte auf Sicherheitsrisiken:"
            items={[
              "Mixed Content: HTTP-Inhalte auf HTTPS-Seiten (gefährlich!)",
              "Externe Ressourcen: Scripts/Styles von anderen Domains",
              "Unsichere Links: HTTP-Links können Nutzer gefährden"
            ]}
            className="ml-2"
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className={`text-2xl font-bold ${mixedContent.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {mixedContent.length}
            </div>
            <div className="text-sm text-gray-600">Mixed Content</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className={`text-2xl font-bold ${externalResources.length > 10 ? 'text-yellow-600' : 'text-gray-900'}`}>
              {externalResources.length}
            </div>
            <div className="text-sm text-gray-600">Externe Ressourcen</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className={`text-2xl font-bold ${insecureLinks.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {insecureLinks.length}
            </div>
            <div className="text-sm text-gray-600">Unsichere Links</div>
          </div>
        </div>

        {mixedContent.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-red-800 mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Mixed Content Probleme
            </h4>
            <div className="space-y-1 text-sm">
              {mixedContent.slice(0, 5).map((item, index) => (
                <div key={index} className="bg-red-50 border border-red-200 rounded p-2">
                  <span className="font-medium">{item.type}:</span>
                  <span className="ml-2 text-red-700 font-mono text-xs break-all">{item.url}</span>
                </div>
              ))}
              {mixedContent.length > 5 && (
                <div className="text-xs text-gray-600 italic">
                  ... und {mixedContent.length - 5} weitere
                </div>
              )}
            </div>
          </div>
        )}

        {externalResources.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-800 mb-2 flex items-center">
              <ExternalLink className="h-4 w-4 mr-1" />
              Externe Ressourcen
            </h4>
            <div className="text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from(new Set(externalResources.map(r => r.domain))).slice(0, 6).map((domain, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded p-2">
                    <div className="font-medium text-gray-900">{domain}</div>
                    <div className="text-xs text-gray-600">
                      {externalResources.filter(r => r.domain === domain).length} Ressourcen
                    </div>
                  </div>
                ))}
              </div>
              {externalResources.length > 6 && (
                <div className="text-xs text-gray-600 italic mt-2">
                  Insgesamt {externalResources.length} externe Ressourcen von {Array.from(new Set(externalResources.map(r => r.domain))).length} Domains
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600">Analysiere Sicherheit...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800 font-medium">Fehler beim Laden der Security-Analyse</span>
        </div>
        <p className="text-red-700 text-sm mt-1">{error}</p>
        <button
          onClick={fetchAnalysis}
          className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center p-8 text-gray-500">
        Keine Security-Daten verfügbar
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Security Analyse</h2>
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Analyse von SSL, Security Headers und Schwachstellen
          </p>
        </div>
      )}

      {/* Security Score */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-900">Security Score</span>
          </div>
          <div className={`flex items-center px-3 py-1 rounded-full font-bold text-lg ${getScoreColor(analysis.security.score)}`}>
            {getScoreIcon(analysis.security.score)}
            <span className="ml-1">{analysis.security.score}/100</span>
          </div>
        </div>
        
        <div className="text-sm text-blue-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
            <div className="text-center">
              <div className={`font-medium flex items-center justify-center ${analysis.summary.isHTTPS ? 'text-green-700' : 'text-red-700'}`}>
                {analysis.summary.isHTTPS ? <Lock className="h-4 w-4 mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
                {analysis.summary.isHTTPS ? 'HTTPS' : 'HTTP'}
              </div>
              <div className="text-xs">Verbindung</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{analysis.summary.securityHeadersPresent}</div>
              <div className="text-xs">Security Headers</div>
            </div>
            <div className="text-center">
              <div className={`font-medium ${analysis.summary.vulnerabilitiesFound > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {analysis.summary.vulnerabilitiesFound}
              </div>
              <div className="text-xs">Schwachstellen</div>
            </div>
            <div className="text-center">
              <div className={`font-medium ${analysis.summary.mixedContentIssues > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {analysis.summary.mixedContentIssues}
              </div>
              <div className="text-xs">Mixed Content</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Headers */}
      {renderSecurityHeaders()}

      {/* Content Security */}
      {renderContentSecurity()}

      {/* Vulnerabilities */}
      <div>
        <div className="flex items-center mb-3">
          <h3 className="font-medium text-gray-900">Schwachstellen</h3>
          <InfoTooltipMultiline
            title="Schwachstellen"
            content="Automatisierte Erkennung häufiger Sicherheitsprobleme:"
            items={[
              "XSS (Cross-Site Scripting): Gefährliche Inline-Scripts",
              "eval() Nutzung: Unsichere JavaScript-Ausführung",
              "CSRF-Token: Fehlende Schutzmaßnahmen gegen Cross-Site Request Forgery",
              "Inline JavaScript: Code der Angreifern helfen könnte"
            ]}
            className="ml-2"
          />
        </div>
        {renderVulnerabilities()}
      </div>

    </div>
  );
}