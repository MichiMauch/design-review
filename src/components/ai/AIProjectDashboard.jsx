import { useState, useEffect } from 'react';
import { Brain, Zap, TrendingUp, AlertTriangle, Loader, RefreshCw } from 'lucide-react';
import { AIStatistics } from './AIBadges';

export default function AIProjectDashboard({ projectId, tasks = [], onTasksUpdate }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // Check if OpenAI is configured
  const [aiConfigured, setAiConfigured] = useState(false);

  useEffect(() => {
    checkAIConfiguration();
    loadStatistics();
  }, [projectId]);

  const checkAIConfiguration = async () => {
    try {
      const response = await fetch('/api/ai/analyze-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 0, text: 'test' }) // Test call
      });

      if (response.status === 500) {
        const data = await response.json();
        if (data.error?.includes('OpenAI API key')) {
          setAiConfigured(false);
          return;
        }
      }
      setAiConfigured(true);
    } catch (error) {
      setAiConfigured(false);
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

  if (!aiConfigured) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-yellow-600" />
          <h3 className="font-semibold text-yellow-800">AI-Funktionen nicht verfügbar</h3>
        </div>
        <p className="text-sm text-yellow-700 mb-2">
          Um AI-basierte Feedback-Analyse zu nutzen, muss der OpenAI API Key konfiguriert werden.
        </p>
        <p className="text-xs text-yellow-600">
          Setzen Sie die Environment Variable <code>OPENAI_API_KEY</code> in Ihrer .env.local Datei.
        </p>
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

          <div className="flex items-center gap-2">
            <button
              onClick={loadStatistics}
              disabled={analyzing}
              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
              title="Statistiken aktualisieren"
            >
              <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={analyzeAllTasks}
              disabled={analyzing || tasks.length === 0 || getUnanalyzedCount() === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
            >
              {analyzing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Analysiere...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Alle analysieren ({getUnanalyzedCount()})
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-3">
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