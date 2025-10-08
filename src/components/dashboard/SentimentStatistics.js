'use client';

import React from 'react';
import { Heart, Meh, Frown } from 'lucide-react';

export default function SentimentStatistics({ tasks = [] }) {
  // Calculate sentiment distribution
  const sentimentCounts = {
    positive: tasks.filter(t => t.ai_sentiment === 'positive').length,
    neutral: tasks.filter(t => t.ai_sentiment === 'neutral').length,
    negative: tasks.filter(t => t.ai_sentiment === 'negative').length,
    unanalyzed: tasks.filter(t => !t.ai_sentiment).length
  };

  const analyzedTotal = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative;

  // Calculate percentages
  const getPercentage = (count) => {
    if (analyzedTotal === 0) return 0;
    return Math.round((count / analyzedTotal) * 100);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
        Sentiment Analyse
      </h3>

      <div className="space-y-3">
        {/* Positive */}
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Positiv</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-green-600">
              {sentimentCounts.positive}
            </span>
            {analyzedTotal > 0 && (
              <span className="text-xs text-green-600">
                ({getPercentage(sentimentCounts.positive)}%)
              </span>
            )}
          </div>
        </div>

        {/* Neutral */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Meh className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Neutral</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-600">
              {sentimentCounts.neutral}
            </span>
            {analyzedTotal > 0 && (
              <span className="text-xs text-gray-600">
                ({getPercentage(sentimentCounts.neutral)}%)
              </span>
            )}
          </div>
        </div>

        {/* Negative */}
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Frown className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-gray-700">Negativ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-red-600">
              {sentimentCounts.negative}
            </span>
            {analyzedTotal > 0 && (
              <span className="text-xs text-red-600">
                ({getPercentage(sentimentCounts.negative)}%)
              </span>
            )}
          </div>
        </div>

        {/* Unanalyzed (if any) */}
        {sentimentCounts.unanalyzed > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Nicht analysiert</span>
              <span>{sentimentCounts.unanalyzed}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}