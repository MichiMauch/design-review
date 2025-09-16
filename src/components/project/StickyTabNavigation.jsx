'use client';

import { List, Columns, Brain, Heart, LayoutDashboard } from 'lucide-react';

export default function StickyTabNavigation({
  viewMode,
  onViewModeChange,
  statusFilter,
  onStatusFilterChange,
  projectStatuses = []
}) {
  const tabs = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      activeClass: 'bg-blue-100 text-blue-700 border-blue-200',
      hoverClass: 'hover:bg-blue-50'
    },
    {
      key: 'list',
      label: 'Liste',
      icon: List,
      activeClass: 'bg-green-100 text-green-700 border-green-200',
      hoverClass: 'hover:bg-green-50'
    },
    {
      key: 'board',
      label: 'Board',
      icon: Columns,
      activeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      hoverClass: 'hover:bg-indigo-50'
    },
    {
      key: 'ai-board',
      label: 'AI',
      icon: Brain,
      activeClass: 'bg-purple-100 text-purple-700 border-purple-200',
      hoverClass: 'hover:bg-purple-50'
    },
    {
      key: 'sentiment-board',
      label: 'Sentiment',
      icon: Heart,
      activeClass: 'bg-pink-100 text-pink-700 border-pink-200',
      hoverClass: 'hover:bg-pink-50'
    }
  ];

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="w-full px-4">
        <div className="flex items-center justify-between py-4">
          {/* Tab Navigation */}
          <div className="flex items-center space-x-1 bg-gray-50 rounded-lg p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = viewMode === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => onViewModeChange(tab.key)}
                  className={`
                    flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 border
                    ${isActive
                      ? `${tab.activeClass} shadow-sm border-solid`
                      : `text-gray-600 border-transparent ${tab.hoverClass} hover:text-gray-800`
                    }
                  `}
                  title={tab.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Status Filter - nur in Liste-Ansicht */}
          {viewMode === 'list' && projectStatuses.length > 0 && (
            <div className="flex items-center">
              <label className="text-sm text-gray-700 mr-2 hidden sm:inline">Filter:</label>
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">Alle Status</option>
                {projectStatuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}