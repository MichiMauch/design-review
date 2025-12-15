'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle, XCircle, AlertCircle, RefreshCw, Smartphone, Image, Search } from 'lucide-react';
import InfoTooltip, { InfoTooltipMultiline } from './shared/InfoTooltip';

export default function IconsAnalysis({ projectId, projectUrl, showHeader = true }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalysis = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      // Build URL with optional custom URL parameter
      let apiUrl = `/api/projects/${projectId}/icons-analysis`;
      if (projectUrl) {
        const urlParam = encodeURIComponent(projectUrl);
        apiUrl += `?url=${urlParam}`;
      }

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analysis');
      }

      setAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectUrl) {
      fetchAnalysis();
    }
  }, [projectId, projectUrl]);

  const StatusIcon = ({ exists, found }) => {
    if (!found) return <XCircle className="h-4 w-4 text-gray-400" />;
    if (exists) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-orange-500" />;
  };

  const getStatusText = ({ exists, found }) => {
    if (!found) return 'Nicht gefunden';
    if (exists) return 'Verfügbar';
    return 'Definiert aber nicht erreichbar';
  };

  const renderIconSection = (title, icons, tooltipContent) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Image className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {tooltipContent && (
          <InfoTooltip
            content={tooltipContent}
            className="ml-2"
          />
        )}
      </div>

      {icons.length === 0 ? (
        <p className="text-gray-500 text-sm">Keine Icons gefunden</p>
      ) : (
        <div className="space-y-3">
          {icons.map((icon, index) => {
            let finalImageUrl = null;
            let absoluteIconUrl = null;

            if (icon.url) {
              if (icon.url.startsWith('data:')) {
                finalImageUrl = icon.url;
                absoluteIconUrl = null; // No external link for data URIs
              } else {
                absoluteIconUrl = new URL(icon.url, projectUrl).href;
                finalImageUrl = `/api/image-proxy?url=${encodeURIComponent(
                  absoluteIconUrl
                )}`;
              }
            }

            return (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <StatusIcon exists={icon.exists} found={icon.found} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{icon.name}</div>
                        {icon.sizes && (
                          <div className="text-xs text-gray-500">Größe: {icon.sizes}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {getStatusText(icon)}
                        </span>
                        {absoluteIconUrl && (
                          <a
                            href={absoluteIconUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Icon preview */}
                    {icon.exists && finalImageUrl && (
                      <div className="mt-2">
                        <img
                          src={finalImageUrl}
                          alt={icon.name}
                          className="w-8 h-8 rounded border border-gray-200 bg-white"
                          style={{ objectFit: 'contain' }}
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (img.dataset.fallbackAttempted) {
                              img.style.display = 'none';
                              const errorSpan = img.nextElementSibling;
                              if (errorSpan) errorSpan.style.display = 'inline-block';
                              return;
                            }
                            
                            try {
                              const siteUrl = new URL(projectUrl);
                              const fallbackUrl = `${siteUrl.origin}/favicon.ico`;
                              const proxiedFallbackUrl = `/api/image-proxy?url=${encodeURIComponent(fallbackUrl)}`;
                              
                              img.setAttribute('data-fallback-attempted', 'true');
                              img.src = proxiedFallbackUrl;
                            } catch (error) {
                              img.style.display = 'none';
                              const errorSpan = img.nextElementSibling;
                              if (errorSpan) errorSpan.style.display = 'inline-block';
                            }
                          }}
                        />
                        <span style={{ display: 'none' }} className="text-xs text-red-600">
                          Bild nicht ladbar
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!projectUrl) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <p className="text-yellow-800">Keine Projekt-URL konfiguriert. Icons-Analyse nicht verfügbar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Favicons Analyse</h2>
              <p className="text-sm text-gray-600">
                Analyse von: <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{projectUrl}</a>
              </p>
            </div>
          </div>
          <button
            onClick={fetchAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      )}

      {/* Refresh Button - wenn kein Header gezeigt wird */}
      {!showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Analyse von: <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{projectUrl}</a>
            </p>
          </div>
          <button
            onClick={fetchAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Analysiere Icons...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800">Fehler beim Laden der Analyse: {error}</p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !loading && (
        <>
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Zusammenfassung</h3>
              <InfoTooltipMultiline
                title="Icons Übersicht"
                content="Schnellübersicht aller wichtigen Icons:"
                items={[
                  "Favicon: Website-Icon im Browser-Tab",
                  "Apple Icons: Icons für iOS Geräte (Homescreen)",
                  "Android Icons: Icons für Android & PWA",
                  "Microsoft Tiles: Windows Start-Menü Icons"
                ]}
                className="ml-2"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {analysis.summary.hasFavicon ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Favicon</span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.summary.hasAppleIcons ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Apple Icons</span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.summary.hasAndroidIcons ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Android Icons</span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.summary.hasMicrosoftIcons ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Microsoft Tiles</span>
              </div>
            </div>
            <div className="mt-3 text-sm text-blue-800">
              Icons gefunden: {analysis.summary.totalIconsFound} | Verfügbar: {analysis.summary.totalIconsExist}
            </div>
          </div>

          {/* Icons Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderIconSection(
              'Favicon',
              analysis.icons.favicon,
              'Das kleine Icon das im Browser-Tab, Lesezeichen und Favoriten angezeigt wird'
            )}
            {renderIconSection(
              'Apple Touch Icons',
              analysis.icons.apple,
              'Spezielle Icons für iOS Geräte wenn die Website zum Homescreen hinzugefügt wird'
            )}
            {renderIconSection(
              'Android Icons',
              analysis.icons.android,
              'Icons für Android Geräte und Progressive Web Apps (PWA)'
            )}
          </div>

          {/* Microsoft Tiles (optional 4th column on full width) */}
          {analysis.icons.microsoft && analysis.icons.microsoft.length > 0 && (
            <div className="grid grid-cols-1 gap-6">
              {renderIconSection(
                'Microsoft Tiles',
                analysis.icons.microsoft,
                'Spezielle Kacheln für Windows Start-Menü'
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
