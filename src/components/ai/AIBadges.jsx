import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Bug, Lightbulb, Palette, Zap, Users, FileText } from 'lucide-react';

// Sentiment badge component
export function SentimentBadge({ sentiment, confidence }) {
  if (!sentiment) return null;

  const config = {
    positive: {
      icon: TrendingUp,
      color: 'bg-green-100 text-green-700 border-green-200',
      label: 'Positiv'
    },
    negative: {
      icon: TrendingDown,
      color: 'bg-red-100 text-red-700 border-red-200',
      label: 'Negativ'
    },
    neutral: {
      icon: Minus,
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      label: 'Neutral'
    }
  };

  const { icon: Icon, color, label } = config[sentiment] || config.neutral;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${color}`}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
      {confidence && (
        <span className="opacity-75">({confidence}%)</span>
      )}
    </div>
  );
}

// Category badge component
export function CategoryBadge({ category }) {
  if (!category) return null;

  const config = {
    'bug': {
      icon: Bug,
      color: 'bg-red-100 text-red-700 border-red-200',
      label: 'Bug'
    },
    'feature': {
      icon: Lightbulb,
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      label: 'Feature'
    },
    'ui-ux': {
      icon: Palette,
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      label: 'UI/UX'
    },
    'performance': {
      icon: Zap,
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      label: 'Performance'
    },
    'content': {
      icon: FileText,
      color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      label: 'Content'
    },
    'accessibility': {
      icon: Users,
      color: 'bg-green-100 text-green-700 border-green-200',
      label: 'Accessibility'
    },
    'other': {
      icon: FileText,
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      label: 'Sonstiges'
    }
  };

  const { icon: Icon, color, label } = config[category] || config.other;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${color}`}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
}

// Priority badge component
export function PriorityBadge({ priority }) {
  if (!priority) return null;

  const config = {
    high: {
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-700 border-red-200',
      label: 'Hoch',
      pulse: true
    },
    medium: {
      icon: AlertTriangle,
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      label: 'Mittel',
      pulse: false
    },
    low: {
      icon: AlertTriangle,
      color: 'bg-green-100 text-green-700 border-green-200',
      label: 'Niedrig',
      pulse: false
    }
  };

  const { icon: Icon, color, label, pulse } = config[priority] || config.medium;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${color} ${pulse ? 'animate-pulse' : ''}`}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
}

// AI analysis indicator
export function AIAnalysisIndicator({ analyzed, loading = false }) {
  if (loading) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-200">
        <Brain className="w-3 h-3 animate-spin" />
        <span>Analysiere...</span>
      </div>
    );
  }

  if (!analyzed) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-50 text-gray-500 border border-gray-200">
        <Brain className="w-3 h-3" />
        <span>Nicht analysiert</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-50 text-green-600 border border-green-200">
      <Brain className="w-3 h-3" />
      <span>AI analysiert</span>
    </div>
  );
}

// Combined AI badges component
export function AIBadgeSet({
  sentiment,
  confidence,
  category,
  priority,
  analyzed = false,
  loading = false,
  compact = false,
  className = ''
}) {
  if (!analyzed && !loading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <AIAnalysisIndicator analyzed={false} loading={loading} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <AIAnalysisIndicator analyzed={false} loading={true} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {compact ? (
        <>
          <AIAnalysisIndicator analyzed={true} />
          {priority && <PriorityBadge priority={priority} />}
        </>
      ) : (
        <>
          <SentimentBadge sentiment={sentiment} confidence={confidence} />
          <CategoryBadge category={category} />
          <PriorityBadge priority={priority} />
        </>
      )}
    </div>
  );
}

// AI Summary component
export function AISummary({ summary, keywords = [], className = '' }) {
  if (!summary && (!keywords || keywords.length === 0)) return null;

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <Brain className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-blue-900 mb-1">AI Zusammenfassung</h4>
          {summary && (
            <p className="text-sm text-blue-800 mb-2">{summary}</p>
          )}
          {keywords && keywords.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-blue-700 font-medium">Schlüsselwörter:</span>
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// AI Statistics display
export function AIStatistics({ statistics, className = '' }) {
  if (!statistics) return null;

  const { sentiment, categories, priority, total, analyzed, averageConfidence } = statistics;

  const analysisRate = total > 0 ? Math.round((analyzed / total) * 100) : 0;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">AI Insights</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{analysisRate}%</div>
          <div className="text-xs text-gray-600">Analysiert</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{averageConfidence}%</div>
          <div className="text-xs text-gray-600">Konfidenz</div>
        </div>
      </div>

      {sentiment && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Sentiment</h4>
          <div className="flex gap-2">
            {sentiment.positive > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{sentiment.positive} Positiv</span>
              </div>
            )}
            {sentiment.negative > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>{sentiment.negative} Negativ</span>
              </div>
            )}
            {sentiment.neutral > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span>{sentiment.neutral} Neutral</span>
              </div>
            )}
          </div>
        </div>
      )}

      {priority && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Priorität</h4>
          <div className="flex gap-2">
            {priority.high > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>{priority.high} Hoch</span>
              </div>
            )}
            {priority.medium > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>{priority.medium} Mittel</span>
              </div>
            )}
            {priority.low > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{priority.low} Niedrig</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}