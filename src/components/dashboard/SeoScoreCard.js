import React from 'react';
import { Search } from 'lucide-react';
import AnalysisCard from './AnalysisCard';

export default function SeoScoreCard({ data, isLoading, error, lastUpdated, projectId }) {
  if (!data && !isLoading && !error) {
    return null;
  }

  // Calculate metrics from data
  const metrics = [];

  if (data) {
    // Meta Tags status
    const metaStatus = data.meta?.title && data.meta?.description ? 'success' : 'warning';
    metrics.push({
      label: 'Meta Tags',
      value: metaStatus === 'success' ? 'OK' : 'Fehlt',
      status: metaStatus
    });

    // Headings structure
    const h1Count = data.headings?.filter(h => h.level === 'h1').length || 0;
    const headingsStatus = h1Count === 1 ? 'success' : 'warning';
    metrics.push({
      label: 'H1 Headings',
      value: h1Count === 1 ? '1 H1' : `${h1Count} H1`,
      status: headingsStatus
    });

    // Images alt text
    if (data.images) {
      const altCoverage = data.images.total > 0
        ? Math.round((data.images.withAlt / data.images.total) * 100)
        : 0;
      const altStatus = altCoverage >= 90 ? 'success' : altCoverage >= 70 ? 'warning' : 'error';
      metrics.push({
        label: 'Alt Text',
        value: `${altCoverage}%`,
        status: altStatus
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
      title="SEO"
      icon={Search}
      score={data?.score}
      status={status}
      metrics={metrics}
      detailsLink={projectId ? `/project/${projectId}/seo-analysis` : null}
      isLoading={isLoading}
      error={error}
      lastUpdated={lastUpdated}
    />
  );
}
