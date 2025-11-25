'use client';

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  FileText,
  Check,
  X,
  AlertTriangle,
  Target,
  Users,
  Layout,
  CheckCircle2,
  MousePointer,
  Lightbulb,
  Sparkles,
  Copy,
  ClipboardCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function ContentAnalysis({ projectId, projectUrl, showHeader = true }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [loadingOptimization, setLoadingOptimization] = useState(false);
  const [optimizationError, setOptimizationError] = useState(null);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [expandedSections, setExpandedSections] = useState({});

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
      const url = `/api/analysis/content${projectUrl ? `?url=${encodeURIComponent(projectUrl)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Abrufen der Content-Analyse');
      }

      setAnalysis(data);
    } catch (err) {
      console.error('Content analysis error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptimization = async () => {
    if (!analysis || !analysis.keyTextSections) return;

    setLoadingOptimization(true);
    setOptimizationError(null);

    try {
      const response = await fetch('/api/ai/content-optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sections: analysis.keyTextSections,
          url: projectUrl,
          targetAudience: analysis.analysis?.targetAudience?.identified || ''
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Generieren der Optimierungen');
      }

      setOptimization(data.optimization);
      setShowOptimizationModal(true);
    } catch (err) {
      console.error('Content optimization error:', err);
      setOptimizationError(err.message);
    } finally {
      setLoadingOptimization(false);
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-700 bg-green-100';
    if (score >= 60) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  const getScoreGradient = (score) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getBooleanIcon = (value) => {
    if (value === null || value === undefined) {
      return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
    return value ? (
      <Check className="h-4 w-4 text-green-600" />
    ) : (
      <X className="h-4 w-4 text-red-600" />
    );
  };

  const getFitColor = (fit) => {
    switch (fit) {
      case 'gut':
        return 'text-green-700 bg-green-100';
      case 'mittel':
        return 'text-yellow-700 bg-yellow-100';
      case 'schlecht':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Analysiere Content-Qualität mit AI...</p>
        <p className="text-sm text-gray-400 mt-2">Dies kann einige Sekunden dauern</p>
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

  if (!analysis || !analysis.analysis) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Keine Content-Analyse verfügbar</p>
      </div>
    );
  }

  const { analysis: contentAnalysis } = analysis;

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-purple-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Content-Qualitätsanalyse</h2>
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

      {/* Fallback Warning */}
      {contentAnalysis.fallback && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              AI-Service nicht verfügbar. Fallback-Analyse wird angezeigt.
            </span>
          </div>
        </div>
      )}

      {/* Score Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Gesamtbewertung</h3>
          <div className={`px-4 py-2 rounded-full text-lg font-bold flex items-center gap-2 ${getScoreColor(contentAnalysis.overallScore?.score || 0)}`}>
            {contentAnalysis.overallScore?.score || 0}/100
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className={`bg-gradient-to-r ${getScoreGradient(contentAnalysis.overallScore?.score || 0)} h-3 rounded-full transition-all duration-500`}
            style={{ width: `${contentAnalysis.overallScore?.score || 0}%` }}
          ></div>
        </div>

        <p className="text-sm text-gray-600">{contentAnalysis.overallScore?.summary}</p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
          <span>{analysis.wordCount} Wörter</span>
          <span>{analysis.headingsCount} Überschriften</span>
        </div>
      </div>

      {/* Core Message & Clarity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Target className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Kernaussage & Klarheit</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {getBooleanIcon(contentAnalysis.coreMessage?.clear)}
            <span className="text-sm text-gray-700">Klare Kommunikation</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {getBooleanIcon(contentAnalysis.coreMessage?.understandableIn5Seconds)}
            <span className="text-sm text-gray-700">In 5 Sek. verständlich</span>
          </div>
        </div>

        {contentAnalysis.coreMessage?.identifiedMessage && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Identifizierte Kernaussage</p>
            <p className="text-sm text-blue-900">{contentAnalysis.coreMessage.identifiedMessage}</p>
          </div>
        )}

        <p className="text-sm text-gray-600">{contentAnalysis.coreMessage?.feedback}</p>
      </div>

      {/* Target Audience */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-green-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Zielgruppen-Fit</h3>
        </div>

        <div className="mb-4 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
          <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Identifizierte Zielgruppe</p>
          <p className="text-sm text-green-900 font-medium">{contentAnalysis.targetAudience?.identified || 'Nicht ermittelt'}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sprache</p>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getFitColor(contentAnalysis.targetAudience?.languageFit)}`}>
              {contentAnalysis.targetAudience?.languageFit || 'unbekannt'}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Ton</p>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getFitColor(contentAnalysis.targetAudience?.toneFit)}`}>
              {contentAnalysis.targetAudience?.toneFit || 'unbekannt'}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-600">{contentAnalysis.targetAudience?.feedback}</p>
      </div>

      {/* Structure & Readability */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Layout className="h-5 w-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Struktur & Lesbarkeit</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {getBooleanIcon(contentAnalysis.structure?.headingsCorrect)}
            <span className="text-sm text-gray-700">Überschriften korrekt</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {getBooleanIcon(contentAnalysis.structure?.paragraphsOrganized)}
            <span className="text-sm text-gray-700">Absätze gegliedert</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {getBooleanIcon(contentAnalysis.structure?.hasRedThread)}
            <span className="text-sm text-gray-700">Roter Faden</span>
          </div>
        </div>

        <p className="text-sm text-gray-600">{contentAnalysis.structure?.feedback}</p>
      </div>

      {/* Content Quality */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <CheckCircle2 className="h-5 w-5 text-orange-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Inhaltliche Qualität</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {contentAnalysis.contentQuality?.repetitions ? (
              <X className="h-4 w-4 text-red-600" />
            ) : (
              <Check className="h-4 w-4 text-green-600" />
            )}
            <span className="text-sm text-gray-700">Keine Wiederholungen</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {contentAnalysis.contentQuality?.gaps ? (
              <X className="h-4 w-4 text-red-600" />
            ) : (
              <Check className="h-4 w-4 text-green-600" />
            )}
            <span className="text-sm text-gray-700">Keine Lücken</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {getBooleanIcon(contentAnalysis.contentQuality?.accurate)}
            <span className="text-sm text-gray-700">Fachlich korrekt</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {contentAnalysis.contentQuality?.fillerSentences ? (
              <X className="h-4 w-4 text-red-600" />
            ) : (
              <Check className="h-4 w-4 text-green-600" />
            )}
            <span className="text-sm text-gray-700">Keine Füllsätze</span>
          </div>
        </div>

        <p className="text-sm text-gray-600">{contentAnalysis.contentQuality?.feedback}</p>
      </div>

      {/* Call to Action */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <MousePointer className="h-5 w-5 text-pink-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Handlungsorientierung (CTA)</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {getBooleanIcon(contentAnalysis.callToAction?.hasCtAs)}
            <span className="text-sm text-gray-700">CTAs vorhanden</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {getBooleanIcon(contentAnalysis.callToAction?.logicallyPlaced)}
            <span className="text-sm text-gray-700">Logisch platziert</span>
          </div>
        </div>

        {contentAnalysis.callToAction?.identifiedCtAs && contentAnalysis.callToAction.identifiedCtAs.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Gefundene CTAs</p>
            <div className="flex flex-wrap gap-2">
              {contentAnalysis.callToAction.identifiedCtAs.map((cta, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs font-medium"
                >
                  {cta}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-gray-600">{contentAnalysis.callToAction?.feedback}</p>
      </div>

      {/* Recommendations */}
      {contentAnalysis.recommendations && contentAnalysis.recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Lightbulb className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Optimierungsvorschläge</h3>
          </div>
          <div className="space-y-3">
            {contentAnalysis.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-100">
                <span className="flex-shrink-0 w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                      {rec.priority === 'high' ? 'Hoch' : rec.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Optimization Button */}
      {analysis.keyTextSections && Object.values(analysis.keyTextSections).some(v => v) && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Texte optimieren</h3>
              <p className="text-sm text-gray-600">
                Lassen Sie AI optimierte Versionen Ihrer wichtigsten Textabschnitte erstellen.
              </p>
            </div>
            <button
              onClick={fetchOptimization}
              disabled={loadingOptimization}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loadingOptimization ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Texte optimieren
            </button>
          </div>
        </div>
      )}

      {/* Optimization Modal */}
      {showOptimizationModal && optimization && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowOptimizationModal(false)}
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
                  <h3 className="text-xl font-semibold text-gray-900">Optimierte Textvorschläge</h3>
                </div>
                <button
                  onClick={() => setShowOptimizationModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {optimization.fallback && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700">
                      AI-Service nicht verfügbar. Bitte später erneut versuchen.
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {optimization.optimizations && optimization.optimizations.map((opt, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection(`opt-${index}`)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium text-gray-900 capitalize">{opt.section}</span>
                      {expandedSections[`opt-${index}`] ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </button>

                    {expandedSections[`opt-${index}`] && (
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wider">Original</label>
                            <div className="mt-1 p-3 bg-gray-50 rounded border text-sm text-gray-700">
                              {opt.original}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wider">Optimiert</label>
                            <div className="mt-1 p-3 bg-green-50 rounded border text-sm text-green-900 font-medium">
                              {opt.optimized}
                            </div>
                          </div>
                        </div>

                        {opt.changes && opt.changes.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Änderungen</p>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                              {opt.changes.map((change, i) => (
                                <li key={i}>{change}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <p className="text-xs text-gray-500">{opt.reasoning}</p>
                          <button
                            onClick={() => copyToClipboard(opt.optimized, `opt-${index}`)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            {copiedField === `opt-${index}` ? (
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
                  </div>
                ))}

                {optimization.generalTips && optimization.generalTips.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Allgemeine Tipps</h4>
                    <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                      {optimization.generalTips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowOptimizationModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message for Optimization */}
      {optimizationError && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <X className="h-4 w-4" />
            <span className="text-sm">{optimizationError}</span>
            <button
              onClick={() => setOptimizationError(null)}
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
