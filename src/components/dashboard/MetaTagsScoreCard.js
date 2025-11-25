import React from 'react';
import { Tags } from 'lucide-react';
import AnalysisCard from './AnalysisCard';

export default function MetaTagsScoreCard({ data, isLoading, error, lastUpdated, projectId }) {
  if (!data && !isLoading && !error) {
    return null;
  }

  // Calculate metrics from data
  const metrics = [];

  if (data && data.summary) {
    // Basic Meta (Title + Description)
    const basicStatus = data.summary.hasBasicMeta ? 'success' : 'error';
    metrics.push({
      label: 'Basic Meta',
      value: data.summary.hasBasicMeta ? 'OK' : 'Fehlt',
      status: basicStatus
    });

    // Open Graph
    const ogStatus = data.summary.hasOpenGraph ? 'success' : 'warning';
    const ogCount = data.summary.openGraphCount || 0;
    metrics.push({
      label: 'OpenGraph',
      value: ogStatus === 'success' ? `${ogCount} Tags` : 'Fehlt',
      status: ogStatus
    });

    // Twitter Card
    const twitterStatus = data.summary.hasTwitterCard ? 'success' : 'warning';
    const twitterCount = data.summary.twitterCount || 0;
    metrics.push({
      label: 'Twitter Card',
      value: twitterStatus === 'success' ? `${twitterCount} Tags` : 'Fehlt',
      status: twitterStatus
    });
  }

  // Calculate score using weighted point system
  let score = 0;

  if (data && data.summary && data.basic) {
    // Basic Meta Tags (40 points) - CRITICAL
    if (data.summary.hasBasicMeta) {
      // Title (20 points)
      if (data.basic.title) {
        const titleLength = data.basic.title.length;
        if (titleLength >= 30 && titleLength <= 60) {
          score += 20; // Optimal
        } else if (titleLength >= 20 && titleLength < 30) {
          score += 12; // Somewhat short
        } else if (titleLength >= 10 && titleLength < 20) {
          score += 6; // Very short
        } else if (titleLength > 60 && titleLength <= 70) {
          score += 10; // Somewhat long
        } else if (titleLength > 0) {
          score += 3; // Extremely short or too long
        }
      }

      // Description (20 points)
      if (data.basic.description) {
        const descLength = data.basic.description.length;
        if (descLength >= 120 && descLength <= 160) {
          score += 20; // Optimal
        } else if (descLength >= 100 && descLength < 120) {
          score += 12; // Somewhat short
        } else if (descLength >= 80 && descLength < 100) {
          score += 6; // Very short
        } else if (descLength > 160 && descLength <= 200) {
          score += 10; // Somewhat long
        } else if (descLength > 0) {
          score += 3; // Extremely short or too long
        }
      }
    }

    // Open Graph Tags (30 points) - IMPORTANT for social media
    if (data.openGraph) {
      const ogTags = [
        data.openGraph.title,
        data.openGraph.description,
        data.openGraph.type,
        data.openGraph.url,
        data.openGraph.image
      ];
      const ogCount = ogTags.filter(t => t && t !== '').length;
      if (ogCount >= 5) {
        score += 30; // All tags
      } else if (ogCount >= 4) {
        score += 24; // Most tags
      } else if (ogCount >= 3) {
        score += 18; // Some tags
      } else if (ogCount >= 2) {
        score += 12; // Few tags
      } else if (ogCount >= 1) {
        score += 6; // Minimal
      }
    }

    // Twitter Card Tags (20 points) - IMPORTANT for Twitter
    if (data.twitter) {
      const twitterTags = [
        data.twitter.card,
        data.twitter.title,
        data.twitter.description,
        data.twitter.image
      ];
      const twitterCount = twitterTags.filter(t => t && t !== '').length;
      if (twitterCount >= 4) {
        score += 20; // All tags
      } else if (twitterCount >= 3) {
        score += 15; // Most tags
      } else if (twitterCount >= 2) {
        score += 10; // Some tags
      } else if (twitterCount >= 1) {
        score += 5; // Minimal
      }
    }

    // SEO Tags (10 points) - OPTIONAL but good
    if (data.seo) {
      if (data.seo.canonical) {
        score += 10; // Canonical is most important SEO tag
      } else if (data.seo.hreflang && data.seo.hreflang.length > 0) {
        score += 5; // Hreflang is helpful for multilingual
      }
    }
  }

  // Determine overall status based on score (like SEO card)
  let status = 'good';
  if (data) {
    if (score >= 80) status = 'success';
    else if (score >= 60) status = 'warning';
    else status = 'error';
  }

  return (
    <AnalysisCard
      title="Meta & OpenGraph"
      icon={Tags}
      score={score}
      status={status}
      metrics={metrics}
      detailsLink={projectId ? `/project/${projectId}/meta-tags-analysis` : null}
      isLoading={isLoading}
      error={error}
      lastUpdated={lastUpdated}
    />
  );
}
