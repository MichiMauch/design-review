import React, { useState, useEffect } from 'react';
import { Brain, Zap, TrendingUp, AlertTriangle, Loader, RefreshCw } from 'lucide-react';
import { AIStatistics } from './AIBadges';

export default function AIProjectDashboard({ projectId, tasks = [], onTasksUpdate }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // OpenAI Status
  const [aiStatus, setAiStatus] = useState({
    configured: false,
    available: false,
    loading: true,
    details: null,
    lastChecked: null
  });

  useEffect(() => {
    checkAIConfiguration();
    loadStatistics();
  }, [projectId]);

  const checkAIConfiguration = async () => {
    setAiStatus(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch('/api/ai/status');
      const data = await response.json();

      setAiStatus({
        configured: data.configured,
        available: data.available,
        loading: false,
        details: data.details,
        lastChecked: new Date().toISOString(),
        message: data.message,
        status: data.status
      });
    } catch (error) {
      console.error('Failed to check AI configuration:', error);
      setAiStatus({
        configured: false,
        available: false,
        loading: false,
        details: null,
        lastChecked: new Date().toISOString(),
        message: 'Failed to check AI status',
        status: 'error'
      });
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch(`/api/ai/analyze-feedback?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Failed to load AI statistics:', error);
    }
  };

  const analyzeAllTasks = async () => {
    if (!projectId || tasks.length === 0) return;

    setAnalyzing(true);
    setError(null);

    try {
      // Get all task IDs that need analysis
      const unanalyzedTasks = tasks
        .filter(task => !task.ai_analyzed_at || new Date(task.ai_analyzed_at) < new Date(Date.now() - 60 * 60 * 1000))
        .map(task => task.id);

      if (unanalyzedTasks.length === 0) {
        setError('Alle Tasks wurden bereits analysiert');
        return;
      }

      const response = await fetch('/api/ai/analyze-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batch: true,
          taskIds: unanalyzedTasks
        })
      });

      const data = await response.json();

      if (data.success) {
        setLastAnalysis(new Date());
        await loadStatistics();

        // Notify parent component to refresh tasks
        if (onTasksUpdate) {
          onTasksUpdate();
        }
      } else {
        setError(data.error || 'Analyse fehlgeschlagen');
      }
    } catch (error) {
      console.error('AI Analysis Error:', error);
      setError('Verbindungsfehler bei der Analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeTask = async (taskId, text) => {
    if (!taskId || !text) return;

    try {
      const response = await fetch('/api/ai/analyze-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          text
        })
      });

      const data = await response.json();

      if (data.success) {
        await loadStatistics();

        // Notify parent component to refresh tasks
        if (onTasksUpdate) {
          onTasksUpdate();
        }
        return data.analysis;
      } else {
        throw new Error(data.error || 'Analyse fehlgeschlagen');
      }
    } catch (error) {
      console.error('Single AI Analysis Error:', error);
      throw error;
    }
  };

  const getUnanalyzedCount = () => {
    return tasks.filter(task => !task.ai_analyzed_at).length;
  };

  const getAnalysisRate = () => {
    if (tasks.length === 0) return 0;
    const analyzed = tasks.filter(task => task.ai_analyzed_at).length;
    return Math.round((analyzed / tasks.length) * 100);
  };

  // Show loading state while checking AI status
  if (aiStatus.loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Loader className="w-5 h-5 text-gray-600 animate-spin" />
          <h3 className="font-semibold text-gray-800">AI-Status wird geprüft...</h3>
        </div>
      </div>
    );
  }

  // Show AI status and configuration issues
  if (!aiStatus.available) {
    const statusColor = aiStatus.configured ? 'red' : 'yellow';
    const statusIcon = aiStatus.configured ? AlertTriangle : Brain;

    return (
      <div className={`bg-${statusColor}-50 border border-${statusColor}-200 rounded-lg p-4`}>
        <div className="flex items-center gap-2 mb-2">
          {React.createElement(statusIcon, { className: `w-5 h-5 text-${statusColor}-600` })}
          <h3 className={`font-semibold text-${statusColor}-800`}>
            {aiStatus.configured ? 'AI-Service nicht verfügbar' : 'AI-Funktionen nicht konfiguriert'}
          </h3>
          <button
            onClick={checkAIConfiguration}
            className={`ml-auto p-1 text-${statusColor}-600 hover:text-${statusColor}-800`}
            title="Status erneut prüfen"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className={`text-sm text-${statusColor}-700 mb-2`}>
          {aiStatus.message}
        </p>
        {aiStatus.details && (
          <div className={`text-xs text-${statusColor}-600 space-y-1`}>
            {!aiStatus.configured ? (
              <p>Setzen Sie die Environment Variable <code>OPENAI_API_KEY</code> in Ihrer .env.local Datei.</p>
            ) : (
              <div>
                <p><strong>Details:</strong></p>
                <ul className="ml-4 list-disc">
                  <li>API Key: {aiStatus.details.hasApiKey ? '✓ vorhanden' : '✗ fehlt'}</li>
                  {aiStatus.details.errorType && <li>Fehlertyp: {aiStatus.details.errorType}</li>}
                  {aiStatus.details.responseTime && <li>Antwortzeit: {aiStatus.details.responseTime}ms</li>}
                  {aiStatus.details.errorMessage && <li>Fehler: {aiStatus.details.errorMessage}</li>}
                </ul>
                <p className="mt-2">Letzte Prüfung: {new Date(aiStatus.lastChecked).toLocaleTimeString()}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Action Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">AI Feedback-Analyse</h3>
          </div>

          <button
            onClick={loadStatistics}
            disabled={analyzing}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
            title="Statistiken aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
            <div className="text-xs text-blue-700">Gesamt Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{getAnalysisRate()}%</div>
            <div className="text-xs text-green-700">Analysiert</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{getUnanalyzedCount()}</div>
            <div className="text-xs text-orange-700">Ausstehend</div>
          </div>
        </div>

        {/* Analyze All Button */}
        {getUnanalyzedCount() > 0 && (
          <button
            onClick={analyzeAllTasks}
            disabled={analyzing || tasks.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium text-sm"
          >
            {analyzing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Analysiere...</span>
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {getUnanalyzedCount()}
                </span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Alle analysieren</span>
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                  {getUnanalyzedCount()}
                </span>
              </>
            )}
          </button>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {lastAnalysis && (
          <div className="text-xs text-blue-600">
            Letzte Analyse: {lastAnalysis.toLocaleString('de-DE')}
          </div>
        )}
      </div>

      {/* AI Statistics */}
      {statistics && (
        <AIStatistics
          statistics={statistics}
          className="bg-white"
        />
      )}
    </div>
  );
}

// Hook for using AI analysis in components
export function useAIAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);

  const analyzeTask = async (taskId, text) => {
    setAnalyzing(true);
    try {
      const response = await fetch('/api/ai/analyze-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskId, text })
      });

      const data = await response.json();

      if (data.success) {
        return data.analysis;
      } else {
        throw new Error(data.error || 'Analyse fehlgeschlagen');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return { analyzeTask, analyzing };
}