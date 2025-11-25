import React from 'react';
import { Image } from 'lucide-react';
import AnalysisCard from './AnalysisCard';

export default function MediaScoreCard({ data, isLoading, error, lastUpdated, projectId }) {
  if (!data && !isLoading && !error) {
    return null;
  }

  // Calculate metrics from data
  const metrics = [];

  if (data) {
    // WebP/AVIF adoption
    if (data.images) {
      const hasModernFormats = data.images.webp > 0 || data.images.avif > 0;
      const modernFormatsStatus = hasModernFormats ? 'success' : 'warning';
      const modernFormatsValue = data.images.webp > 0
        ? `${data.images.webp} WebP`
        : data.images.avif > 0
          ? `${data.images.avif} AVIF`
          : 'Keine';

      metrics.push({
        label: 'Moderne Formate',
        value: modernFormatsValue,
        status: modernFormatsStatus
      });
    }

    // Lazy loading
    if (data.images) {
      const lazyPercentage = data.images.total > 0
        ? Math.round((data.images.lazy / data.images.total) * 100)
        : 0;
      const lazyStatus = lazyPercentage >= 80 ? 'success' : lazyPercentage >= 50 ? 'warning' : 'error';

      metrics.push({
        label: 'Lazy Loading',
        value: `${lazyPercentage}%`,
        status: lazyStatus
      });
    }

    // Fonts optimization
    if (data.fonts) {
      const hasFontDisplay = data.fonts.fontDisplay > 0;
      const fontStatus = hasFontDisplay ? 'success' : 'warning';

      metrics.push({
        label: 'Font Display',
        value: hasFontDisplay ? 'Optimiert' : 'Nicht optimiert',
        status: fontStatus
      });
    }
  }

  // Determine overall status
  let status = 'good';
  if (data) {
    const score = data.score || 0;
    if (score >= 80) status = 'success';
    else if (score >= 60) status = 'warning';
    else status = 'error';
  }

  return (
    <AnalysisCard
      title="Media"
      icon={Image}
      score={data?.score}
      status={status}
      metrics={metrics}
      detailsLink={projectId ? `/project/${projectId}/media-analysis` : null}
      isLoading={isLoading}
      error={error}
      lastUpdated={lastUpdated}
    />
  );
}
