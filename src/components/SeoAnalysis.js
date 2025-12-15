'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Search, Check, X, AlertTriangle, ExternalLink, FileText, Hash, Link, ImageIcon, Sparkles, Copy, ClipboardCheck } from 'lucide-react';
import InfoTooltip, { InfoTooltipMultiline } from './shared/InfoTooltip';

export default function SeoAnalysis({ projectId, projectUrl, showHeader = true }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(null);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [copiedField, setCopiedField] = useState('');

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
      const url = `/api/analysis/seo${projectUrl ? `?url=${encodeURIComponent(projectUrl)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Abrufen der SEO-Daten');
      }

      setAnalysis(data);
    } catch (err) {
      console.error('SEO analysis error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAISuggestions = async () => {
    if (!analysis) return;

    setLoadingSuggestions(true);
    setSuggestionsError(null);

    try {
      const response = await fetch('/api/ai/seo-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: projectUrl,
          currentTitle: analysis.titleMeta?.title?.content || '',
          currentDescription: analysis.titleMeta?.description?.content || '',
          pageContent: analysis.pageContent || ''
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Abrufen der AI-Vorschläge');
      }

      setSuggestions(data.suggestions);
      setShowSuggestionsModal(true);
    } catch (err) {
      console.error('AI suggestions error:', err);
      setSuggestionsError(err.message);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'good':
        return 'text-green-700 bg-green-100';
      case 'warning':
        return 'text-yellow-700 bg-yellow-100';
      case 'error':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good':
        return <Check className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <X className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Analysiere SEO & Content...</p>
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
        <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Keine SEO-Daten verfügbar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Search className="h-6 w-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">SEO & Content Analyse</h2>
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

      {/* SEO Score Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">SEO Score</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getScoreColor(analysis.score)}`}>
            {getScoreIcon(analysis.score)}
            {analysis.score}/100
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${analysis.score}%` }}
          ></div>
        </div>

        <p className="text-sm text-gray-600">{analysis.summary}</p>
      </div>

      {/* Title & Meta Analysis */}
      {analysis.titleMeta && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Title & Meta Description</h3>
            </div>
            <button
              onClick={fetchAISuggestions}
              disabled={loadingSuggestions}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="AI-Verbesserungsvorschläge generieren"
            >
              {loadingSuggestions ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI Vorschlag
            </button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Page Title</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(analysis.titleMeta.title.status)}`}>
                  {getStatusIcon(analysis.titleMeta.title.status)}
                  {analysis.titleMeta.title.length} Zeichen
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{analysis.titleMeta.title.content}</p>
              <p className="text-xs text-gray-500">{analysis.titleMeta.title.recommendation}</p>
            </div>

            {/* Meta Description */}
            {analysis.titleMeta.description && (
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Meta Description</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(analysis.titleMeta.description.status)}`}>
                    {getStatusIcon(analysis.titleMeta.description.status)}
                    {analysis.titleMeta.description.length} Zeichen
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{analysis.titleMeta.description.content}</p>
                <p className="text-xs text-gray-500">{analysis.titleMeta.description.recommendation}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Heading Structure */}
      {analysis.headings && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Hash className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Heading Structure</h3>
          </div>

          <div className="space-y-2">
            {[...analysis.headings]
              .sort((a, b) => parseInt(a.level.substring(1)) - parseInt(b.level.substring(1)))
              .map((heading, index) => (
              <div key={index} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0">
                <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${
                  heading.level === 'h1' ? 'bg-red-100 text-red-700' :
                  heading.level === 'h2' ? 'bg-orange-100 text-orange-700' :
                  heading.level === 'h3' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {heading.level.toUpperCase()}
                </span>
                <span className="text-sm text-gray-900 flex-1">{heading.text}</span>
                <span className="text-xs text-gray-500">{heading.text.length} Zeichen</span>
              </div>
            ))}
          </div>

          {analysis.headingAnalysis && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{analysis.headingAnalysis}</p>
            </div>
          )}
        </div>
      )}

      {/* Links Analysis */}
      {analysis.links && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Link className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Links</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analysis.links.internal}</div>
              <div className="text-sm text-gray-600">Interne Links</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analysis.links.external}</div>
              <div className="text-sm text-gray-600">Externe Links</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{analysis.links.total}</div>
              <div className="text-sm text-gray-600">Gesamt Links</div>
            </div>
          </div>

          {analysis.links.issues && analysis.links.issues.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Link-Probleme</h4>
              <div className="space-y-2">
                {analysis.links.issues.map((issue, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                    <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-700">{issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Images Analysis */}
      {analysis.images && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ImageIcon className="h-5 w-5 text-pink-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Bilder</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">{analysis.images.total}</div>
              <div className="text-sm text-gray-600">Bilder gesamt</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analysis.images.withAlt}</div>
              <div className="text-sm text-gray-600">Mit Alt-Text</div>
            </div>
          </div>

          {analysis.images.missingAlt > 0 && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">
                  {analysis.images.missingAlt} Bilder ohne Alt-Text gefunden
                </span>
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
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900">{rec.title}</h4>
                  <p className="text-sm text-blue-700 mt-1">{rec.description}</p>
                  {rec.priority && (
                    <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {rec.priority === 'high' ? 'Hoch' : rec.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions Modal */}
      {showSuggestionsModal && suggestions && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSuggestionsModal(false)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">AI SEO-Verbesserungsvorschläge</h3>
                </div>
                <button
                  onClick={() => setShowSuggestionsModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {suggestions.fallback && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700">
                      AI-Service nicht verfügbar. Fallback-Vorschläge werden angezeigt.
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Title Suggestion */}
                {suggestions.title && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Optimierter Title-Tag</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        suggestions.title.length >= 30 && suggestions.title.length <= 60
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {suggestions.title.length} Zeichen
                      </span>
                    </div>

                    {/* Current vs Suggested */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Aktuell</label>
                        <div className="mt-1 p-3 bg-gray-50 rounded border text-sm text-gray-700">
                          {analysis.titleMeta?.title?.content || 'Kein Title vorhanden'}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">AI-Vorschlag</label>
                        <div className="mt-1 p-3 bg-blue-50 rounded border text-sm text-blue-900 font-medium">
                          {suggestions.title.suggestion}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600">{suggestions.title.reasoning}</p>
                      <button
                        onClick={() => copyToClipboard(suggestions.title.suggestion, 'title')}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        {copiedField === 'title' ? (
                          <>
                            <ClipboardCheck className="h-3 w-3" />
                            Kopiert!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Kopieren
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Meta Description Suggestion */}
                {suggestions.metaDescription && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Optimierte Meta Description</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        suggestions.metaDescription.length >= 120 && suggestions.metaDescription.length <= 160
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {suggestions.metaDescription.length} Zeichen
                      </span>
                    </div>

                    {/* Current vs Suggested */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">Aktuell</label>
                        <div className="mt-1 p-3 bg-gray-50 rounded border text-sm text-gray-700">
                          {analysis.titleMeta?.description?.content || 'Keine Meta Description vorhanden'}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">AI-Vorschlag</label>
                        <div className="mt-1 p-3 bg-green-50 rounded border text-sm text-green-900 font-medium">
                          {suggestions.metaDescription.suggestion}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600">{suggestions.metaDescription.reasoning}</p>
                      <button
                        onClick={() => copyToClipboard(suggestions.metaDescription.suggestion, 'description')}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        {copiedField === 'description' ? (
                          <>
                            <ClipboardCheck className="h-3 w-3" />
                            Kopiert!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Kopieren
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Keywords */}
                {suggestions.keywords && suggestions.keywords.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Vorgeschlagene Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSuggestionsModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message for AI Suggestions */}
      {suggestionsError && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <X className="h-4 w-4" />
            <span className="text-sm">{suggestionsError}</span>
            <button
              onClick={() => setSuggestionsError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}