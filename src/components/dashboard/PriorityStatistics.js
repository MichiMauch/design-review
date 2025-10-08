'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export default function PriorityStatistics({ tasks = [] }) {
  // Calculate priority distribution
  const priorityCounts = {
    high: tasks.filter(t => t.ai_priority === 'high').length,
    medium: tasks.filter(t => t.ai_priority === 'medium').length,
    low: tasks.filter(t => t.ai_priority === 'low').length,
    unanalyzed: tasks.filter(t => !t.ai_priority).length
  };

  const analyzedTotal = priorityCounts.high + priorityCounts.medium + priorityCounts.low;

  // Calculate percentages
  const getPercentage = (count) => {
    if (analyzedTotal === 0) return 0;
    return Math.round((count / analyzedTotal) * 100);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
        Priorität Analyse
      </h3>

      <div className="space-y-3">
        {/* High Priority */}
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-gray-700">Hoch</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-red-600">
              {priorityCounts.high}
            </span>
            {analyzedTotal > 0 && (
              <span className="text-xs text-red-600">
                ({getPercentage(priorityCounts.high)}%)
              </span>
            )}
          </div>
        </div>

        {/* Medium Priority */}
        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-gray-700">Mittel</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-yellow-600">
              {priorityCounts.medium}
            </span>
            {analyzedTotal > 0 && (
              <span className="text-xs text-yellow-600">
                ({getPercentage(priorityCounts.medium)}%)
              </span>
            )}
          </div>
        </div>

        {/* Low Priority */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Niedrig</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-blue-600">
              {priorityCounts.low}
            </span>
            {analyzedTotal > 0 && (
              <span className="text-xs text-blue-600">
                ({getPercentage(priorityCounts.low)}%)
              </span>
            )}
          </div>
        </div>

        {/* Unanalyzed (if any) */}
        {priorityCounts.unanalyzed > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Nicht analysiert</span>
              <span>{priorityCounts.unanalyzed}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}