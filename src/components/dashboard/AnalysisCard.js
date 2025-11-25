import React from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function AnalysisCard({
  title,
  icon: Icon,
  score,
  status,
  metrics = [],
  detailsLink,
  isLoading = false,
  error = null,
  lastUpdated = null
}) {
  // Determine card border color based on status
  const getStatusColor = () => {
    if (error) return 'border-red-300 bg-red-50';
    if (isLoading) return 'border-gray-300 bg-gray-50';

    if (status === 'success' || status === 'good') return 'border-green-300 bg-green-50';
    if (status === 'warning') return 'border-yellow-300 bg-yellow-50';
    if (status === 'error' || status === 'critical') return 'border-red-300 bg-red-50';
    return 'border-gray-300 bg-gray-50';
  };

  // Determine score color
  const getScoreColor = () => {
    if (!score && score !== 0) return 'text-gray-600';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Determine metric status color
  const getMetricStatusColor = (metricStatus) => {
    if (metricStatus === 'success' || metricStatus === 'good') return 'text-green-600';
    if (metricStatus === 'warning') return 'text-yellow-600';
    if (metricStatus === 'error' || metricStatus === 'critical') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className={`border-2 rounded-lg p-4 transition-all hover:shadow-md ${getStatusColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-gray-700" />}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {score !== null && score !== undefined && !isLoading && !error && (
          <div className={`text-2xl font-bold ${getScoreColor()}`}>
            {score}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          <span className="ml-2 text-sm text-gray-600">Analysiere...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex items-start gap-2 py-4">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700 font-medium">Fehler beim Laden</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <>
          {/* Metrics */}
          {metrics.length > 0 && (
            <div className="space-y-2 mb-4">
              {metrics.map((metric, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{metric.label}</span>
                  <span className={`font-medium ${getMetricStatusColor(metric.status)}`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                {formatLastUpdated(lastUpdated)}
              </span>
            )}
            {detailsLink && (
              <Link
                href={detailsLink}
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                Details
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to format last updated timestamp
function formatLastUpdated(timestamp) {
  if (!timestamp) return '';

  const now = new Date();
  const updated = new Date(timestamp);
  const diffMs = now - updated;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min.`;
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;

  return updated.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
