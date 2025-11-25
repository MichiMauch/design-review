import React from 'react';
import { Zap } from 'lucide-react';
import AnalysisCard from './AnalysisCard';

export default function PerformanceScoreCard({ data, isLoading, error, lastUpdated, projectId }) {
  if (!data && !isLoading && !error) {
    return null;
  }

  // Calculate metrics from data
  const metrics = [];

  if (data) {
    const performance = data.performance || {};
    const coreWebVitals = performance.coreWebVitals || {};
    const pageSpeed = performance.pageSpeed || {};
    const resources = performance.resources || {};
    const metricsData = performance.metrics || {};

    // LCP (Largest Contentful Paint)
    if (coreWebVitals.lcp !== undefined && coreWebVitals.lcp !== null) {
      const lcpValue = typeof coreWebVitals.lcp === 'number' ? coreWebVitals.lcp : parseFloat(coreWebVitals.lcp);
      const lcpStatus = lcpValue <= 2.5 ? 'success' : lcpValue <= 4.0 ? 'warning' : 'error';
      metrics.push({
        label: 'LCP',
        value: `${lcpValue.toFixed(1)}s`,
        status: lcpStatus
      });
    }

    // FID (First Input Delay)
    if (coreWebVitals.fid !== undefined && coreWebVitals.fid !== null) {
      const fidValue = typeof coreWebVitals.fid === 'number' ? coreWebVitals.fid : parseFloat(coreWebVitals.fid);
      const fidStatus = fidValue <= 100 ? 'success' : fidValue <= 300 ? 'warning' : 'error';
      metrics.push({
        label: 'FID',
        value: `${fidValue}ms`,
        status: fidStatus
      });
    }

    // CLS (Cumulative Layout Shift)
    if (coreWebVitals.cls !== undefined && coreWebVitals.cls !== null) {
      const clsValue = typeof coreWebVitals.cls === 'number' ? coreWebVitals.cls : parseFloat(coreWebVitals.cls);
      const clsStatus = clsValue <= 0.1 ? 'success' : clsValue <= 0.25 ? 'warning' : 'error';
      metrics.push({
        label: 'CLS',
        value: clsValue.toFixed(2),
        status: clsStatus
      });
    }

    // If no Core Web Vitals, show alternative metrics
    if (metrics.length === 0) {
      // Response Time
      if (metricsData.responseTime !== undefined && metricsData.responseTime !== null) {
        const responseTime = metricsData.responseTime;
        const responseStatus = responseTime <= 200 ? 'success' : responseTime <= 500 ? 'warning' : 'error';
        metrics.push({
          label: 'Response Time',
          value: `${responseTime}ms`,
          status: responseStatus
        });
      }

      // Page Size
      if (metricsData.pageSize) {
        const totalMB = metricsData.pageSize.totalMB;
        const sizeStatus = totalMB <= 2 ? 'success' : totalMB <= 5 ? 'warning' : 'error';
        metrics.push({
          label: 'Page Size',
          value: `${totalMB.toFixed(1)} MB`,
          status: sizeStatus
        });
      }

      // Total Requests
      if (resources.totalRequests !== undefined) {
        const totalRequests = resources.totalRequests;
        const requestsStatus = totalRequests <= 50 ? 'success' : totalRequests <= 100 ? 'warning' : 'error';
        metrics.push({
          label: 'Requests',
          value: totalRequests.toString(),
          status: requestsStatus
        });
      }
    }
  }

  // Calculate score if not provided
  let score = data?.performance?.score || data?.score;
  if (!score && data && metrics.length > 0) {
    const successCount = metrics.filter(m => m.status === 'success').length;
    score = Math.round((successCount / metrics.length) * 100);
  }

  // Determine overall status based on score (consistent with other cards)
  let status = 'good';
  if (data) {
    if (score >= 80) status = 'success';
    else if (score >= 60) status = 'warning';
    else status = 'error';
  }

  return (
    <AnalysisCard
      title="Performance"
      icon={Zap}
      score={score}
      status={status}
      metrics={metrics}
      detailsLink={projectId ? `/project/${projectId}/performance` : null}
      isLoading={isLoading}
      error={error}
      lastUpdated={lastUpdated}
    />
  );
}
