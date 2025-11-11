'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Image, Check, X, AlertTriangle, Video, Type, Star, Zap, Play, Pause, Volume2, VolumeX } from 'lucide-react';

export default function MediaAnalysis({ projectId, projectUrl, showHeader = true }) {
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
      const url = `/api/analysis/media${projectUrl ? `?url=${encodeURIComponent(projectUrl)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Abrufen der Media-Daten');
      }

      setAnalysis(data);
    } catch (err) {
      console.error('Media analysis error:', err);
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
    if (score >= 90) return <Check className="h-4 w-4" />;
    if (score >= 70) return <AlertTriangle className="h-4 w-4" />;
    return <X className="h-4 w-4" />;
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'performance':
        return 'bg-blue-100 text-blue-700';
      case 'accessibility':
        return 'bg-green-100 text-green-700';
      case 'ux':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 text-violet-600 animate-spin mb-4" />
        <p className="text-gray-600">Analysiere Media & Resources...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchAnalysis}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Keine Media-Daten verfügbar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Image className="h-6 w-6 text-violet-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Media & Resources Analyse</h2>
          </div>
          <button
            onClick={fetchAnalysis}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Analyse aktualisieren"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Media Score Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Media Score</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getScoreColor(analysis.score)}`}>
            {getScoreIcon(analysis.score)}
            {analysis.score}/100
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-violet-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${analysis.score}%` }}
          ></div>
        </div>

        <p className="text-sm text-gray-600">{analysis.summary}</p>
      </div>

      {/* Images Analysis */}
      {analysis.images && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Image className="h-5 w-5 text-pink-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Bilder-Analyse</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">{analysis.images.total}</div>
              <div className="text-sm text-gray-600">Bilder gesamt</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analysis.images.withAlt}</div>
              <div className="text-sm text-gray-600">Mit Alt-Text</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analysis.images.lazy}</div>
              <div className="text-sm text-gray-600">Lazy Loading</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{analysis.images.webp + analysis.images.avif}</div>
              <div className="text-sm text-gray-600">Moderne Formate</div>
            </div>
          </div>

          {/* Issues */}
          {analysis.images.missingAlt > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h4 className="font-medium text-yellow-900">
                  {analysis.images.missingAlt} Bilder ohne Alt-Text gefunden
                </h4>
              </div>
              {analysis.images.imagesWithoutAlt && analysis.images.imagesWithoutAlt.length > 0 && (
                <div className="space-y-3 mt-3">
                  {analysis.images.imagesWithoutAlt.slice(0, 20).map((image, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 bg-white rounded border border-yellow-200 hover:border-yellow-300 transition-colors">
                      <img
                        src={image.src}
                        alt=""
                        className="w-20 h-20 object-cover rounded border border-gray-200 flex-shrink-0"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden w-20 h-20 items-center justify-center bg-gray-100 rounded border border-gray-200 flex-shrink-0">
                        <Image className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={image.src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-xs break-all"
                        >
                          {image.src}
                        </a>
                      </div>
                    </div>
                  ))}
                  {analysis.images.imagesWithoutAlt.length > 20 && (
                    <p className="text-xs text-yellow-700 mt-2">
                      +{analysis.images.imagesWithoutAlt.length - 20} weitere Bilder
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Videos Analysis */}
      {analysis.videos && analysis.videos.total > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Video className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Video-Analyse</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{analysis.videos.total}</div>
              <div className="text-sm text-gray-600">Videos gesamt</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analysis.videos.withPoster}</div>
              <div className="text-sm text-gray-600">Mit Poster</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analysis.videos.autoplay}</div>
              <div className="text-sm text-gray-600">Autoplay</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{analysis.videos.muted}</div>
              <div className="text-sm text-gray-600">Stumm</div>
            </div>
          </div>

          {/* Video Formats */}
          {Object.keys(analysis.videos.formats).length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Video-Formate</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(analysis.videos.formats).map(([format, count]) => (
                  <span
                    key={format}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                  >
                    {format.toUpperCase()}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fonts Analysis */}
      {analysis.fonts && analysis.fonts.total > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Type className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Font-Analyse</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{analysis.fonts.total}</div>
              <div className="text-sm text-gray-600">Fonts gesamt</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analysis.fonts.preloaded}</div>
              <div className="text-sm text-gray-600">Preloaded</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analysis.fonts.displaySwap}</div>
              <div className="text-sm text-gray-600">Display Swap</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{analysis.fonts.external}</div>
              <div className="text-sm text-gray-600">Extern</div>
            </div>
          </div>

          {/* Font Formats */}
          {Object.keys(analysis.fonts.formats).length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Font-Formate</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(analysis.fonts.formats).map(([format, count]) => (
                  <span
                    key={format}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                  >
                    {format.toUpperCase()}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Empfehlungen</h3>
          <div className="space-y-3">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  rec.priority === 'high' ? 'text-red-600' :
                  rec.priority === 'medium' ? 'text-yellow-600' :
                  'text-blue-600'
                }`} />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {rec.priority === 'high' ? 'Hoch' : rec.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                    </span>
                    {rec.category && (
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCategoryColor(rec.category)}`}>
                        {rec.category === 'performance' ? 'Performance' :
                         rec.category === 'accessibility' ? 'Zugänglichkeit' :
                         rec.category === 'ux' ? 'Benutzererfahrung' : rec.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}