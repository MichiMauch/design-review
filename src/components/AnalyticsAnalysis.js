'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, BarChart3, Check, X, AlertTriangle } from 'lucide-react';
import InfoTooltip, { InfoTooltipMultiline } from './shared/InfoTooltip';

export default function AnalyticsAnalysis({ projectId, projectUrl, showHeader = true }) {
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
      const url = `/api/projects/${projectId}/analytics${projectUrl ? `?url=${encodeURIComponent(projectUrl)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Abrufen der Analytics-Daten');
      }

      setAnalysis(data);
    } catch (err) {
      console.error('Analytics analysis error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderToolSection = (title, tools, iconColor = 'text-blue-600') => {
    if (tools.length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center">
            <X className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-gray-600 font-medium">{title}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Nicht gefunden</p>
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <Check className={`h-5 w-5 ${iconColor} mr-2`} />
          <span className="text-gray-900 font-medium">{title}</span>
          <span className="ml-2 text-sm text-gray-500">({tools.length} gefunden)</span>
        </div>
        <div className="space-y-2">
          {tools.map((tool, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 rounded p-2">
              <div>
                <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Gefunden in: {tool.foundIn}</span>
                  {tool.foundIn.includes('GTM') && (
                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs font-medium">
                      GTM
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-600 font-mono">{tool.trackingId}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600">Analysiere Analytics & Tracking...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800 font-medium">Fehler beim Laden der Analytics-Analyse</span>
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
        Keine Analytics-Daten verfügbar
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center">
            <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Analytics & Tracking Analyse</h2>
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Erkennung von Analytics- und Tracking-Tools auf der Website
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
          <span className="font-medium text-blue-900">Zusammenfassung</span>
          <InfoTooltipMultiline
            title="Analytics Übersicht"
            content="Erkannte Tracking- und Analytics-Tools:"
            items={[
              "Google Analytics 4: Moderne Website-Besucheranalyse",
              "Google Tag Manager: Zentrale Tag-Verwaltung",
              "Facebook Pixel: Social Media Tracking",
              "Hotjar: Heatmaps und User-Session-Aufzeichnung",
              "Matomo: Datenschutzfreundliche Analytics-Alternative"
            ]}
            className="ml-2"
          />
        </div>
        <div className="text-sm text-blue-800">
          <p>Insgesamt <strong>{analysis.summary.totalToolsFound} Tracking-Tools</strong> gefunden</p>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className={`flex items-center ${analysis.summary.hasGoogleAnalytics ? 'text-green-700' : 'text-gray-600'}`}>
              {analysis.summary.hasGoogleAnalytics ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
              Google Analytics
            </div>
            <div className={`flex items-center ${analysis.summary.hasGoogleTagManager ? 'text-green-700' : 'text-gray-600'}`}>
              {analysis.summary.hasGoogleTagManager ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
              Google Tag Manager
            </div>
            <div className={`flex items-center ${analysis.summary.hasMatomo ? 'text-green-700' : 'text-gray-600'}`}>
              {analysis.summary.hasMatomo ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
              Matomo
            </div>
            <div className={`flex items-center ${analysis.summary.hasFacebookPixel ? 'text-green-700' : 'text-gray-600'}`}>
              {analysis.summary.hasFacebookPixel ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
              Facebook Pixel
            </div>
            <div className={`flex items-center ${analysis.summary.hasHotjar ? 'text-green-700' : 'text-gray-600'}`}>
              {analysis.summary.hasHotjar ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
              Hotjar
            </div>
            <div className={`flex items-center ${analysis.summary.hasOtherTools ? 'text-green-700' : 'text-gray-600'}`}>
              {analysis.summary.hasOtherTools ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
              Weitere Tools
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Tools */}
      <div className="grid gap-4">
        {renderToolSection(
          'Google Analytics 4',
          analysis.analytics.googleAnalytics4,
          'text-blue-600'
        )}
        
        {renderToolSection(
          'Google Tag Manager',
          analysis.analytics.googleTagManager,
          'text-green-600'
        )}
        
        {renderToolSection(
          'Matomo/Piwik',
          analysis.analytics.matomo,
          'text-orange-600'
        )}
        
        {renderToolSection(
          'Facebook Pixel',
          analysis.analytics.facebookPixel,
          'text-blue-800'
        )}
        
        {renderToolSection(
          'Hotjar',
          analysis.analytics.hotjar,
          'text-red-600'
        )}
        
        {renderToolSection(
          'Weitere Analytics-Tools',
          analysis.analytics.other,
          'text-purple-600'
        )}
      </div>

      {/* Recommendations */}
      {analysis.summary.totalToolsFound === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <span className="font-medium text-yellow-800">Empfehlungen</span>
          </div>
          <div className="text-sm text-yellow-700 mt-2">
            <p>Keine Analytics-Tools gefunden. Empfehlungen:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Google Analytics 4 für Besucheranalyse implementieren</li>
              <li>Google Tag Manager für einfaches Tag-Management einrichten</li>
              <li>Datenschutz-konforme Tracking-Einstellungen beachten</li>
            </ul>
          </div>
        </div>
      )}

      {/* Data Protection Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-600">
          <p className="font-medium mb-1">Hinweis zum Datenschutz:</p>
          <p>Stellen Sie sicher, dass alle verwendeten Tracking-Tools DSGVO-konform implementiert sind und entsprechende Cookie-Banner und Datenschutzerklärungen vorhanden sind.</p>
        </div>
      </div>
    </div>
  );
}