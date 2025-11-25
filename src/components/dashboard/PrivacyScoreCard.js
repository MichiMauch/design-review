import React from 'react';
import { Shield } from 'lucide-react';
import AnalysisCard from './AnalysisCard';

export default function PrivacyScoreCard({ data, isLoading, error, lastUpdated, projectId }) {
  if (!data && !isLoading && !error) {
    return null;
  }

  // Calculate metrics from data
  const metrics = [];

  if (data) {
    // Cookie Banner
    const bannerStatus = data.cookieBanner?.detected ? 'success' : 'warning';
    const bannerValue = data.cookieBanner?.detected
      ? (data.cookieBanner.cmpProvider || 'Erkannt')
      : 'Nicht gefunden';
    metrics.push({
      label: 'Cookie Banner',
      value: bannerValue,
      status: bannerStatus
    });

    // GDPR Compliance - Privacy Policy
    const privacyStatus = data.gdprCompliance?.hasPrivacyPolicy ? 'success' : 'error';
    metrics.push({
      label: 'Datenschutz',
      value: data.gdprCompliance?.hasPrivacyPolicy ? 'Vorhanden' : 'Fehlt',
      status: privacyStatus
    });

    // GDPR Compliance - Imprint
    const imprintStatus = data.gdprCompliance?.hasImprint ? 'success' : 'warning';
    metrics.push({
      label: 'Impressum',
      value: data.gdprCompliance?.hasImprint ? 'Vorhanden' : 'Fehlt',
      status: imprintStatus
    });
  }

  // Determine overall status
  let status = 'good';
  if (data && metrics.length > 0) {
    const errorCount = metrics.filter(m => m.status === 'error').length;
    const warningCount = metrics.filter(m => m.status === 'warning').length;

    if (errorCount > 0) status = 'error';
    else if (warningCount > 0) status = 'warning';
    else status = 'success';
  }

  // Calculate score if not provided
  let score = data?.score;
  if (!score && data) {
    let points = 0;
    const maxPoints = 3;

    if (data.cookieBanner?.detected) points += 1;
    if (data.gdprCompliance?.hasPrivacyPolicy) points += 1;
    if (data.gdprCompliance?.hasImprint) points += 1;

    score = Math.round((points / maxPoints) * 100);
  }

  return (
    <AnalysisCard
      title="Privacy"
      icon={Shield}
      score={score}
      status={status}
      metrics={metrics}
      detailsLink={projectId ? `/project/${projectId}/privacy-analysis` : null}
      isLoading={isLoading}
      error={error}
      lastUpdated={lastUpdated}
    />
  );
}
