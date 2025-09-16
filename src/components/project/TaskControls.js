'use client';

import { RefreshCw, List, Columns, Brain, Heart } from 'lucide-react';

export default function TaskControls({
  isRefreshing,
  onRefresh,
  viewMode,
  onViewModeChange,
  statusFilter,
  onStatusFilterChange,
  projectStatuses = []
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div></div>
      <div className="flex items-center gap-4">
        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
          title="Tasks aktualisieren"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Lädt...' : 'Aktualisieren'}
        </button>

        {/* View Mode Toggle */}
        <div className="flex items-center border border-gray-200 rounded-lg">
          <button
            onClick={() => onViewModeChange('list')}
            className={`flex items-center gap-1 px-2 py-1 text-sm transition-colors rounded-l-lg ${
              viewMode === 'list'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <List className="h-4 w-4" />
            Liste
          </button>
          <button
            onClick={() => onViewModeChange('board')}
            className={`flex items-center gap-1 px-2 py-1 text-sm transition-colors border-l border-gray-200 ${
              viewMode === 'board'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Columns className="h-4 w-4" />
            Board
          </button>
          <button
            onClick={() => onViewModeChange('ai-board')}
            className={`flex items-center gap-1 px-2 py-1 text-sm transition-colors border-l border-gray-200 ${
              viewMode === 'ai-board'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            title="AI-kategorisiertes Board"
          >
            <Brain className="h-4 w-4" />
            AI
          </button>
          <button
            onClick={() => onViewModeChange('sentiment-board')}
            className={`flex items-center gap-1 px-2 py-1 text-sm transition-colors border-l border-gray-200 rounded-r-lg ${
              viewMode === 'sentiment-board'
                ? 'bg-pink-100 text-pink-700'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            title="Sentiment-basiertes Board"
          >
            <Heart className="h-4 w-4" />
            Sentiment
          </button>
        </div>

        {/* Status Filter - nur in Liste-Ansicht */}
        {viewMode === 'list' && (
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Alle Status</option>
            {projectStatuses.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}