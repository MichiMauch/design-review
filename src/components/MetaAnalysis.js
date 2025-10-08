'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle, XCircle, AlertCircle, RefreshCw, Globe, Image, Share2, Search } from 'lucide-react';
import InfoTooltip, { InfoTooltipMultiline } from './shared/InfoTooltip';

export default function MetaAnalysis({ projectId, projectUrl, showHeader = true }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalysis = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      // Build URL with optional custom URL parameter
      let apiUrl = `/api/projects/${projectId}/meta-analysis`;
      if (projectUrl) {
        // If projectUrl is provided, use it as a custom URL
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

  const renderSocialImage = (imageData) => {
    if (!imageData) return null;

    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <StatusIcon exists={imageData.exists} found={true} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Social Media Bild</span>
              <span className="text-xs text-gray-500">
                ({getStatusText({ exists: imageData.exists, found: true })})
              </span>
            </div>
            {imageData.exists ? (
              <div className="space-y-2">
                <img
                  src={imageData.absoluteUrl}
                  alt="Social Media Preview"
                  className="w-full max-w-xs h-auto rounded border border-gray-200"
                  style={{ maxHeight: '120px', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div style={{ display: 'none' }} className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  Bild konnte nicht geladen werden
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <a
                    href={imageData.absoluteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Original anzeigen
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                Bild-URL definiert aber nicht erreichbar:
                <br />
                <code className="text-xs bg-gray-100 px-1 rounded">{imageData.url}</code>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getCharacterCountInfo = (text, type) => {
    if (!text) return null;

    const length = text.length;
    let status = 'optimal';
    let message = '';
    let color = 'text-green-600';
    let bgColor = 'bg-green-50';

    if (type === 'title') {
      if (length < 30) {
        status = 'warning';
        message = 'Zu kurz (empfohlen: 30-60 Zeichen)';
        color = 'text-yellow-600';
        bgColor = 'bg-yellow-50';
      } else if (length > 70) {
        status = 'critical';
        message = 'Zu lang (wird abgeschnitten bei ~70 Zeichen)';
        color = 'text-red-600';
        bgColor = 'bg-red-50';
      } else if (length > 60) {
        status = 'warning';
        message = 'Etwas zu lang (optimal: 50-60 Zeichen)';
        color = 'text-yellow-600';
        bgColor = 'bg-yellow-50';
      } else {
        message = 'Optimal';
      }
    } else if (type === 'description') {
      if (length < 120) {
        status = 'warning';
        message = 'Zu kurz (empfohlen: 120-160 Zeichen)';
        color = 'text-yellow-600';
        bgColor = 'bg-yellow-50';
      } else if (length > 200) {
        status = 'critical';
        message = 'Zu lang (wird abgeschnitten bei ~200 Zeichen)';
        color = 'text-red-600';
        bgColor = 'bg-red-50';
      } else if (length > 160) {
        status = 'warning';
        message = 'Etwas zu lang (optimal: 150-160 Zeichen)';
        color = 'text-yellow-600';
        bgColor = 'bg-yellow-50';
      } else {
        message = 'Optimal';
      }
    }

    return {
      length,
      status,
      message,
      color,
      bgColor
    };
  };

  const renderMetaSection = (title, icon, data, emptyMessage = 'Keine Daten verfügbar', socialImageType = null, isBasicMeta = false) => {
    const hasData = Object.values(data).some(value => value && value !== '');

    // Find the corresponding social image
    const socialImage = socialImageType && analysis?.socialImages ?
      analysis.socialImages.find(img => img.type === socialImageType) : null;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {title === 'Basis Meta-Tags' && (
            <InfoTooltipMultiline
              title="Basis Meta-Tags"
              content="Grundlegende HTML Meta-Informationen:"
              items={[
                "Title: Seitentitel (30-60 Zeichen optimal)",
                "Description: Seitenbeschreibung (120-160 Zeichen)",
                "Keywords: Suchbegriffe (weniger wichtig heute)",
                "Viewport: Mobile Optimierung"
              ]}
              className="ml-2"
            />
          )}
          {title === 'Open Graph Tags' && (
            <InfoTooltipMultiline
              title="Open Graph Tags"
              content="Metadaten für Social Media Sharing:"
              items={[
                "og:title: Titel beim Teilen",
                "og:description: Beschreibung beim Teilen",
                "og:image: Vorschaubild (1200x630px empfohlen)",
                "og:type: Art des Inhalts (website, article, etc.)"
              ]}
              className="ml-2"
            />
          )}
          {title === 'Twitter Card Tags' && (
            <InfoTooltipMultiline
              title="Twitter Card Tags"
              content="Spezielle Meta-Tags für Twitter:"
              items={[
                "twitter:card: Kartentyp (summary, summary_large_image)",
                "twitter:title: Twitter-spezifischer Titel",
                "twitter:description: Twitter-spezifische Beschreibung",
                "twitter:image: Twitter Vorschaubild"
              ]}
              className="ml-2"
            />
          )}
        </div>

        {!hasData ? (
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(data).map(([key, value]) => {
              if (!value || value === '') return null;

              // Special handling for title and description with character count
              if (isBasicMeta && (key === 'title' || key === 'description')) {
                const charInfo = getCharacterCountInfo(value, key);
                return (
                  <div key={key} className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {key.charAt(0).toUpperCase() + key.slice(1)}:
                      </span>
                      {charInfo && (
                        <span className={`text-xs px-2 py-1 rounded-full ${charInfo.bgColor} ${charInfo.color} font-medium`}>
                          {charInfo.length} Zeichen - {charInfo.message}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 break-words">
                      {value}
                    </p>
                  </div>
                );
              }

              return (
                <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-sm font-medium text-gray-600 min-w-[100px]">
                    {key.charAt(0).toUpperCase() + key.slice(1)}:
                  </span>
                  <span className="text-sm text-gray-900 break-words flex-1">
                    {value.length > 100 ? `${value.substring(0, 100)}...` : value}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Render social image if available */}
        {socialImage && renderSocialImage(socialImage)}
      </div>
    );
  };

  const renderSeoSection = (title, seoData) => {
    // Prepare SEO items with status
    const seoItems = [
      {
        name: 'Canonical URL',
        value: seoData.canonical,
        exists: !!seoData.canonical,
        type: 'url'
      },
      {
        name: 'Alternate Links',
        value: seoData.alternate,
        exists: !!seoData.alternate,
        type: 'url'
      },
      {
        name: 'Previous Page',
        value: seoData.prev,
        exists: !!seoData.prev,
        type: 'url'
      },
      {
        name: 'Next Page',
        value: seoData.next,
        exists: !!seoData.next,
        type: 'url'
      },
      {
        name: 'Sprach-Alternativen (hreflang)',
        value: seoData.hreflang?.length > 0 ? `${seoData.hreflang.length} Sprachen definiert` : null,
        exists: seoData.hreflang && seoData.hreflang.length > 0,
        type: 'count',
        items: seoData.hreflang
      }
    ];

    const hasAnySeoTags = seoItems.some(item => item.exists);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <InfoTooltipMultiline
            title="SEO Tags"
            content="Suchmaschinenoptimierung Meta-Tags:"
            items={[
              "Canonical: Bevorzugte URL-Version gegen Duplicate Content",
              "Alternate: Alternative Sprachversionen der Seite",
              "Hreflang: Sprachspezifische Seitenversionen",
              "Prev/Next: Navigation für mehrseitige Inhalte"
            ]}
            className="ml-2"
          />
        </div>

        {!hasAnySeoTags && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Keine SEO-Tags gefunden. Empfehlung: Fügen Sie mindestens einen Canonical-Tag hinzu.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {seoItems.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {item.exists ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    {!item.exists && (
                      <span className="text-xs text-gray-500">(Nicht vorhanden)</span>
                    )}
                  </div>
                  {item.exists && item.value && (
                    <div className="mt-1">
                      {item.type === 'url' ? (
                        <a
                          href={item.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline break-all"
                        >
                          {item.value}
                        </a>
                      ) : item.type === 'count' ? (
                        <>
                          <span className="text-xs text-gray-600">{item.value}</span>
                          {item.items && item.items.length > 0 && (
                            <div className="mt-2 ml-4 space-y-1">
                              {item.items.slice(0, 3).map((lang, idx) => (
                                <div key={idx} className="text-xs text-gray-500">
                                  <span className="font-medium">{lang.hreflang}:</span>{' '}
                                  <a href={lang.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {lang.href}
                                  </a>
                                </div>
                              ))}
                              {item.items.length > 3 && (
                                <div className="text-xs text-gray-500">
                                  ... und {item.items.length - 3} weitere
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-600">{item.value}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
          ))}
        </div>
      </div>
    );
  };

  const renderIconSection = (title, icons, type) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Image className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {title === 'Favicon' && (
          <InfoTooltip
            content="Das kleine Icon das im Browser-Tab, Lesezeichen und Favoriten angezeigt wird"
            className="ml-2"
          />
        )}
        {title === 'Apple Touch Icons' && (
          <InfoTooltip
            content="Spezielle Icons für iOS Geräte wenn die Website zum Homescreen hinzugefügt wird"
            className="ml-2"
          />
        )}
        {title === 'Android Icons' && (
          <InfoTooltip
            content="Icons für Android Geräte und Progressive Web Apps (PWA)"
            className="ml-2"
          />
        )}
      </div>

      {icons.length === 0 ? (
        <p className="text-gray-500 text-sm">Keine Icons gefunden</p>
      ) : (
        <div className="space-y-3">
          {icons.map((icon, index) => (
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
                      {icon.url && (
                        <a
                          href={icon.url}
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
                  {icon.exists && icon.url && (
                    <div className="mt-2">
                      <img
                        src={icon.url}
                        alt={icon.name}
                        className="w-8 h-8 rounded border border-gray-200 bg-white"
                        style={{ objectFit: 'contain' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'inline-block';
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
          ))}
        </div>
      )}
    </div>
  );

  if (!projectUrl) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <p className="text-yellow-800">Keine Projekt-URL konfiguriert. Meta-Analyse nicht verfügbar.</p>
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
            <Globe className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Meta-Tags & Icons Analyse</h2>
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
          <span className="ml-3 text-gray-600">Analysiere Website...</span>
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
                title="Meta-Tags Übersicht"
                content="Schnellübersicht aller wichtigen Meta-Elemente:"
                items={[
                  "Favicon: Website-Icon im Browser-Tab",
                  "Open Graph: Social Media Vorschaubilder (Facebook, LinkedIn)",
                  "Twitter Card: Spezielle Twitter Vorschaubilder",
                  "Apple Icons: Icons für iOS Geräte"
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
                {analysis.summary.hasOpenGraph ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Open Graph</span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.summary.hasTwitterCard ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Twitter Card</span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.summary.hasAppleIcons ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Apple Icons</span>
              </div>
            </div>
            <div className="mt-3 text-sm text-blue-800">
              Icons gefunden: {analysis.summary.totalIconsFound} | Verfügbar: {analysis.summary.totalIconsExist}
            </div>
          </div>

          {/* Meta Tags */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderMetaSection(
              'Basis Meta-Tags',
              <Globe className="h-5 w-5 text-green-600" />,
              analysis.basic,
              'Keine Basis Meta-Tags gefunden',
              null,
              true  // isBasicMeta flag for character count
            )}

            {renderMetaSection(
              'Open Graph Tags',
              <Share2 className="h-5 w-5 text-blue-600" />,
              analysis.openGraph,
              'Keine Open Graph Tags gefunden',
              'openGraph'
            )}

            {renderMetaSection(
              'Twitter Card Tags',
              <Share2 className="h-5 w-5 text-sky-600" />,
              analysis.twitter,
              'Keine Twitter Card Tags gefunden',
              'twitter'
            )}

            {renderSeoSection('SEO Tags', analysis.seo)}
          </div>

          {/* Icons */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderIconSection('Favicon', analysis.icons.favicon, 'favicon')}
            {renderIconSection('Apple Touch Icons', analysis.icons.apple, 'apple')}
            {renderIconSection('Android Icons', analysis.icons.android, 'android')}
          </div>
        </>
      )}
    </div>
  );
}