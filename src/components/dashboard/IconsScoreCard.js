import React from 'react';
import { Smartphone } from 'lucide-react';
import AnalysisCard from './AnalysisCard';

export default function IconsScoreCard({ data, isLoading, error, lastUpdated, projectId }) {
  if (!data && !isLoading && !error) {
    return null;
  }

  // Calculate metrics from data
  const metrics = [];

  if (data && data.summary) {
    // Favicon
    const faviconStatus = data.summary.hasFavicon ? 'success' : 'error';
    metrics.push({
      label: 'Favicon',
      value: data.summary.hasFavicon ? 'Vorhanden' : 'Fehlt',
      status: faviconStatus
    });

    // Apple Touch Icons
    const appleCount = data.icons?.apple?.filter(i => i.exists).length || 0;
    const appleStatus = appleCount >= 3 ? 'success' : appleCount > 0 ? 'warning' : 'error';
    metrics.push({
      label: 'Apple Icons',
      value: appleCount > 0 ? `${appleCount} Icons` : 'Keine',
      status: appleStatus
    });

    // Android Icons (PWA)
    const androidStatus = data.summary.hasAndroidIcons ? 'success' : 'warning';
    metrics.push({
      label: 'Android Icons',
      value: data.summary.hasAndroidIcons ? 'Vorhanden' : 'Fehlt',
      status: androidStatus
    });
  }

  // Calculate score using weighted point system (like SEO)
  let score = 0;

  if (data && data.summary && data.icons) {
    // Favicon (40 points) - CRITICAL
    if (data.summary.hasFavicon) {
      score += 40;
    }

    // Apple Touch Icons (30 points) - IMPORTANT for iOS
    const appleIcons = data.icons.apple?.filter(i => i.exists) || [];
    if (appleIcons.length >= 5) {
      score += 30; // 5+ icons = full points
    } else if (appleIcons.length >= 3) {
      score += 24; // 3-4 icons = 80%
    } else if (appleIcons.length >= 1) {
      score += 15; // 1-2 icons = 50%
    }

    // Android Icons (20 points) - IMPORTANT for PWA
    const androidIcons = data.icons.android?.filter(i => i.exists) || [];
    if (androidIcons.length >= 2) {
      score += 20; // Both sizes present
    } else if (androidIcons.length === 1) {
      score += 10; // Only one size
    }

    // Microsoft Tiles (10 points) - OPTIONAL
    const msIcons = data.icons.microsoft?.filter(i => i.exists) || [];
    if (msIcons.length >= 2) {
      score += 10;
    } else if (msIcons.length === 1) {
      score += 5;
    }
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
      title="Favicons"
      icon={Smartphone}
      score={score}
      status={status}
      metrics={metrics}
      detailsLink={projectId ? `/project/${projectId}/icons-analysis` : null}
      isLoading={isLoading}
      error={error}
      lastUpdated={lastUpdated}
    />
  );
}
