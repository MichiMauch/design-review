'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Zap, Check, X, AlertTriangle, TrendingUp, TrendingDown, Clock, Smartphone, HardDrive, Image as ImageIcon } from 'lucide-react';
import InfoTooltip, { InfoTooltipMultiline } from './shared/InfoTooltip';

export default function PerformanceAnalysis({ projectId, projectUrl, showHeader = true }) {
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
      const url = `/api/projects/${projectId}/performance${projectUrl ? `?url=${encodeURIComponent(projectUrl)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Abrufen der Performance-Daten');
      }

      setAnalysis(data);
    } catch (err) {
      console.error('Performance analysis error:', err);
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
    if (score >= 90) return <TrendingUp className="h-4 w-4" />;
    if (score >= 70) return <Clock className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const renderRecommendations = () => {
    if (!analysis?.performance?.recommendations?.length) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">Keine Performance-Probleme gefunden</span>
          </div>
          <p className="text-green-700 text-sm mt-1">Ihre Website erfüllt die grundlegenden Performance-Kriterien.</p>
        </div>
      );
    }

    const groupedRecommendations = {
      high: analysis.performance.recommendations.filter(r => r.priority === 'high'),
      medium: analysis.performance.recommendations.filter(r => r.priority === 'medium'),
      low: analysis.performance.recommendations.filter(r => r.priority === 'low')
    };

    return (
      <div className="space-y-4">
        {groupedRecommendations.high.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="font-medium text-red-900">Hohe Priorität ({groupedRecommendations.high.length})</span>
            </div>
            <div className="space-y-2">
              {groupedRecommendations.high.map((rec, index) => (
                <div key={index} className="bg-white rounded p-3">
                  <div className="font-medium text-red-900">{rec.message}</div>
                  <div className="text-sm text-red-700 mt-1">{rec.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {groupedRecommendations.medium.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Clock className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="font-medium text-yellow-900">Mittlere Priorität ({groupedRecommendations.medium.length})</span>
            </div>
            <div className="space-y-2">
              {groupedRecommendations.medium.map((rec, index) => (
                <div key={index} className="bg-white rounded p-3">
                  <div className="font-medium text-yellow-900">{rec.message}</div>
                  <div className="text-sm text-yellow-700 mt-1">{rec.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {groupedRecommendations.low.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">Niedrige Priorität ({groupedRecommendations.low.length})</span>
            </div>
            <div className="space-y-2">
              {groupedRecommendations.low.map((rec, index) => (
                <div key={index} className="bg-white rounded p-3">
                  <div className="font-medium text-blue-900">{rec.message}</div>
                  <div className="text-sm text-blue-700 mt-1">{rec.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderResourcesSection = () => {
    if (!analysis?.performance?.resources) return null;

    const { resources } = analysis.performance;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <h3 className="font-medium text-gray-900">Resource Analyse</h3>
          <InfoTooltipMultiline
            title="Resource Analyse"
            content="Analyse der geladenen Website-Ressourcen:"
            items={[
              "Bilder: Optimierung durch Lazy Loading und Alt-Text",
              "JavaScript: Async/Defer für bessere Performance",
              "Total Requests: Anzahl HTTP-Anfragen der Seite"
            ]}
            className="ml-2"
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-gray-900">{resources.totalRequests}</div>
            <div className="text-sm text-gray-600">Gesamt Requests</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-gray-900">{resources.images.length}</div>
            <div className="text-sm text-gray-600">Bilder</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-gray-900">{resources.scripts.length}</div>
            <div className="text-sm text-gray-600">Scripts</div>
          </div>
        </div>

        {resources.images.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-800 mb-2">Bilder Optimierung</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Mit Lazy Loading:</span>
                <span className={resources.images.filter(img => img.loading === 'lazy').length > 0 ? 'text-green-600' : 'text-red-600'}>
                  {resources.images.filter(img => img.loading === 'lazy').length} / {resources.images.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Mit Alt-Text:</span>
                <span className={resources.images.filter(img => img.hasAlt).length === resources.images.length ? 'text-green-600' : 'text-yellow-600'}>
                  {resources.images.filter(img => img.hasAlt).length} / {resources.images.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {resources.scripts.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-800 mb-2">JavaScript Optimierung</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Async Scripts:</span>
                <span className={resources.scripts.filter(script => script.async).length > 0 ? 'text-green-600' : 'text-gray-600'}>
                  {resources.scripts.filter(script => script.async).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Defer Scripts:</span>
                <span className={resources.scripts.filter(script => script.defer).length > 0 ? 'text-green-600' : 'text-gray-600'}>
                  {resources.scripts.filter(script => script.defer).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getPageSizeColor = (rating) => {
    switch (rating) {
      case 'excellent': return 'text-green-700 bg-green-100';
      case 'good': return 'text-blue-700 bg-blue-100';
      case 'needs-improvement': return 'text-yellow-700 bg-yellow-100';
      case 'poor': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const renderPageSizeSection = () => {
    if (!analysis?.performance?.resources?.sizes) return null;

    const { sizes } = analysis.performance.resources;
    const { pageSize } = analysis.performance.metrics;

    // Calculate percentages for breakdown
    const total = sizes.total;
    const htmlPercent = ((sizes.html / total) * 100).toFixed(1);
    const imagesPercent = ((sizes.images / total) * 100).toFixed(1);
    const scriptsPercent = ((sizes.scripts / total) * 100).toFixed(1);
    const stylesheetsPercent = ((sizes.stylesheets / total) * 100).toFixed(1);

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <h3 className="font-medium text-gray-900">Seitengröße-Analyse</h3>
          <InfoTooltipMultiline
            title="Seitengröße-Analyse"
            content="Gesamtgröße der Website und Aufschlüsselung nach Ressourcentypen:"
            items={[
              "< 1 MB: Excellent - Sehr schnell auch bei langsamer Verbindung",
              "1-3 MB: Good - Akzeptabel für die meisten Nutzer",
              "3-5 MB: Needs Improvement - Kann bei langsamer Verbindung problematisch sein",
              "> 5 MB: Poor - Deutliche Optimierung erforderlich"
            ]}
            className="ml-2"
          />
        </div>

        {/* Desktop vs Mobile Comparison */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Desktop Size */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <HardDrive className="h-5 w-5 text-gray-600 mr-2" />
                <span className="font-medium text-gray-900">Desktop</span>
              </div>
              <div className={`flex items-center px-3 py-1 rounded-full font-bold text-lg ${getPageSizeColor(pageSize?.rating)}`}>
                <span>{sizes.totalMB} MB</span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPageSizeColor(pageSize?.rating)}`}>
                {pageSize?.message}
              </span>
            </div>
          </div>

          {/* Mobile Size */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Smartphone className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium text-gray-900">Mobile (geschätzt)</span>
              </div>
              <div className="flex items-center px-3 py-1 rounded-full font-bold text-lg text-blue-700 bg-blue-100">
                <span>{sizes.mobile.totalMB} MB</span>
              </div>
            </div>
            <div className="text-sm text-blue-600">
              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                {(((sizes.total - sizes.mobile.total) / sizes.total) * 100).toFixed(1)}% kleiner
              </span>
            </div>
          </div>
        </div>

        {/* Size Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800 text-sm">Aufschlüsselung nach Ressourcentypen:</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between bg-gray-50 rounded p-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                <span className="text-sm text-gray-700">HTML</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {(sizes.html / 1024).toFixed(1)} KB
                </div>
                <div className="text-xs text-gray-500">{htmlPercent}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded p-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <span className="text-sm text-gray-700">Bilder</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {(sizes.images / (1024 * 1024)).toFixed(2)} MB
                </div>
                <div className="text-xs text-gray-500">{imagesPercent}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded p-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
                <span className="text-sm text-gray-700">JavaScript</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {(sizes.scripts / 1024).toFixed(1)} KB
                </div>
                <div className="text-xs text-gray-500">{scriptsPercent}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded p-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
                <span className="text-sm text-gray-700">CSS</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {(sizes.stylesheets / 1024).toFixed(1)} KB
                </div>
                <div className="text-xs text-gray-500">{stylesheetsPercent}%</div>
              </div>
            </div>
          </div>

          {/* Measurement Info */}
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            <span className="font-medium">Messung:</span> {sizes.measuredResources} von {sizes.totalResources} Ressourcen erfolgreich gemessen
          </div>
        </div>
      </div>
    );
  };

  const renderMetricsSection = () => {
    if (!analysis?.performance?.metrics) return null;

    const { metrics } = analysis.performance;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <h3 className="font-medium text-gray-900">Performance Metriken</h3>
          <InfoTooltipMultiline
            title="Performance Metriken"
            content="Wichtige Leistungsindikatoren für Website-Performance:"
            items={[
              "Antwortzeit: Zeit bis Server antwortet (< 500ms ideal)",
              "Service Worker: Offline-Funktionalität und Caching",
              "Lazy Loading: Bilder werden nur bei Bedarf geladen",
              "Mobile Viewport: Responsive Design für Mobilgeräte"
            ]}
            className="ml-2"
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Server Antwortzeit:</span>
              <span className={`font-medium ${metrics.responseTime > 1000 ? 'text-red-600' : metrics.responseTime > 500 ? 'text-yellow-600' : 'text-green-600'}`}>
                {metrics.responseTime}ms
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Service Worker:</span>
              <span className={`flex items-center ${metrics.hasServiceWorker ? 'text-green-600' : 'text-gray-600'}`}>
                {metrics.hasServiceWorker ? <Check className="h-4 w-4 mr-1" /> : <X className="h-4 w-4 mr-1" />}
                {metrics.hasServiceWorker ? 'Aktiv' : 'Nicht gefunden'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Lazy Loading:</span>
              <span className={`flex items-center ${metrics.hasLazyLoading ? 'text-green-600' : 'text-gray-600'}`}>
                {metrics.hasLazyLoading ? <Check className="h-4 w-4 mr-1" /> : <X className="h-4 w-4 mr-1" />}
                {metrics.hasLazyLoading ? 'Implementiert' : 'Nicht implementiert'}
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Mobile Viewport:</span>
              <span className={`flex items-center ${metrics.metaViewport ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.metaViewport ? <Check className="h-4 w-4 mr-1" /> : <X className="h-4 w-4 mr-1" />}
                {metrics.metaViewport ? 'Konfiguriert' : 'Fehlt'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Preload Links:</span>
              <span className={`flex items-center ${metrics.hasPreloadLinks ? 'text-green-600' : 'text-gray-600'}`}>
                {metrics.hasPreloadLinks ? <Check className="h-4 w-4 mr-1" /> : <X className="h-4 w-4 mr-1" />}
                {metrics.hasPreloadLinks ? 'Gefunden' : 'Nicht gefunden'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">HTML Größe:</span>
              <span className="font-medium text-gray-900">
                {(metrics.htmlSize / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600">Analysiere Performance...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800 font-medium">Fehler beim Laden der Performance-Analyse</span>
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
        Keine Performance-Daten verfügbar
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center">
            <Zap className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Performance Analyse</h2>
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Analyse von Ladezeiten, Optimierungen und Core Web Vitals
          </p>
        </div>
      )}

      {/* Performance Score */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Zap className="h-5 w-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-900">Performance Score</span>
          </div>
          <div className={`flex items-center px-3 py-1 rounded-full font-bold text-lg ${getScoreColor(analysis.performance.score)}`}>
            {getScoreIcon(analysis.performance.score)}
            <span className="ml-1">{analysis.performance.score}/100</span>
          </div>
        </div>
        
        <div className="text-sm text-blue-800">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-3">
            <div className="text-center">
              <div className="font-medium">{analysis.summary.responseTime}ms</div>
              <div className="text-xs">Antwortzeit</div>
            </div>
            <div className="text-center">
              <div className={`font-medium ${analysis.performance?.resources?.sizes ? getPageSizeColor(analysis.performance.metrics.pageSize?.rating).split(' ')[0] : 'text-gray-700'}`}>
                {analysis.performance?.resources?.sizes?.totalMB || '?'} MB
              </div>
              <div className="text-xs">Seitengröße</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{analysis.summary.totalRecommendations}</div>
              <div className="text-xs">Verbesserungen</div>
            </div>
            <div className="text-center">
              <div className={`font-medium ${analysis.summary.hasLazyLoading ? 'text-green-700' : 'text-red-700'}`}>
                {analysis.summary.hasLazyLoading ? 'Ja' : 'Nein'}
              </div>
              <div className="text-xs">Lazy Loading</div>
            </div>
            <div className="text-center">
              <div className={`font-medium ${analysis.summary.isMobileOptimized ? 'text-green-700' : 'text-red-700'}`}>
                {analysis.summary.isMobileOptimized ? 'Ja' : 'Nein'}
              </div>
              <div className="text-xs flex items-center justify-center">
                <Smartphone className="h-3 w-3 mr-1" />
                Mobile
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Size Analysis */}
      {renderPageSizeSection()}

      {/* Performance Metrics */}
      {renderMetricsSection()}

      {/* Resources Analysis */}
      {renderResourcesSection()}

      {/* Recommendations */}
      <div>
        <div className="flex items-center mb-3">
          <h3 className="font-medium text-gray-900">Empfehlungen</h3>
          <InfoTooltipMultiline
            title="Performance Empfehlungen"
            content="Automatisch generierte Verbesserungsvorschläge:"
            items={[
              "Hohe Priorität: Kritische Performance-Probleme",
              "Mittlere Priorität: Deutliche Verbesserungen möglich",
              "Niedrige Priorität: Kleinere Optimierungen"
            ]}
            className="ml-2"
          />
        </div>
        {renderRecommendations()}
      </div>
    </div>
  );
}