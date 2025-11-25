import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useAnalysisData } from '@/hooks/useAnalysisData';
import SeoScoreCard from './SeoScoreCard';
import PerformanceScoreCard from './PerformanceScoreCard';
import MediaScoreCard from './MediaScoreCard';
import IconsScoreCard from './IconsScoreCard';
import MetaTagsScoreCard from './MetaTagsScoreCard';

export default function AnalyticsOverview({ projectId, projectUrl }) {
  const { analyses, isRefreshing, refreshAll } = useAnalysisData(projectId, projectUrl);

  if (!projectUrl) {
    return null;
  }

  // Get the oldest lastUpdated timestamp
  const getOldestUpdateTime = () => {
    const timestamps = Object.values(analyses)
      .map(a => a.lastUpdated)
      .filter(t => t !== null);

    if (timestamps.length === 0) return null;

    return Math.min(...timestamps);
  };

  const oldestUpdate = getOldestUpdateTime();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Analyse-Übersicht</h2>
        <button
          onClick={refreshAll}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Aktualisiere...' : 'Jetzt aktualisieren'}
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* SEO Score Card */}
        <SeoScoreCard
          data={analyses.seo.data}
          isLoading={analyses.seo.isLoading}
          error={analyses.seo.error}
          lastUpdated={analyses.seo.lastUpdated}
          projectId={projectId}
        />

        {/* Performance Score Card */}
        <PerformanceScoreCard
          data={analyses.performance.data}
          isLoading={analyses.performance.isLoading}
          error={analyses.performance.error}
          lastUpdated={analyses.performance.lastUpdated}
          projectId={projectId}
        />

        {/* Media Score Card */}
        <MediaScoreCard
          data={analyses.media.data}
          isLoading={analyses.media.isLoading}
          error={analyses.media.error}
          lastUpdated={analyses.media.lastUpdated}
          projectId={projectId}
        />

        {/* Icons Score Card (Favicons) */}
        <IconsScoreCard
          data={analyses.icons.data}
          isLoading={analyses.icons.isLoading}
          error={analyses.icons.error}
          lastUpdated={analyses.icons.lastUpdated}
          projectId={projectId}
        />

        {/* Meta Tags Score Card */}
        <MetaTagsScoreCard
          data={analyses.metatags.data}
          isLoading={analyses.metatags.isLoading}
          error={analyses.metatags.error}
          lastUpdated={analyses.metatags.lastUpdated}
          projectId={projectId}
        />
      </div>

      {/* Footer with last update time */}
      {oldestUpdate && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            Letzte Analyse: {formatLastUpdate(oldestUpdate)}
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to format last update timestamp
function formatLastUpdate(timestamp) {
  if (!timestamp) return 'Nie';

  const now = new Date();
  const updated = new Date(timestamp);
  const diffMs = now - updated;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Minute${diffMins > 1 ? 'n' : ''}`;
  if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours > 1 ? 'n' : ''}`;
  if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;

  return updated.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
