'use client';

import { X, Sparkles, Plus, ArrowUp, Check } from 'lucide-react';
import { releases } from '@/data/releaseNotes';

const FeatureIcon = ({ type }) => {
  switch (type) {
    case 'new':
      return (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
          <Plus className="h-3 w-3 text-green-600" />
        </span>
      );
    case 'improved':
      return (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100">
          <ArrowUp className="h-3 w-3 text-blue-600" />
        </span>
      );
    case 'fixed':
      return (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100">
          <Check className="h-3 w-3 text-orange-600" />
        </span>
      );
    default:
      return null;
  }
};

export default function WhatsNewModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">What&apos;s New</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {releases.map((release, index) => (
              <div key={release.version} className={index !== 0 ? 'pt-6 border-t border-gray-100' : ''}>
                {/* Version Header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
                    v{release.version}
                  </span>
                  <span className="text-sm text-gray-500">{release.date}</span>
                </div>

                {/* Features List */}
                <ul className="space-y-3">
                  {release.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <FeatureIcon type={feature.type} />
                      <span className="text-gray-700 text-sm leading-relaxed">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-100 flex items-center justify-center">
                  <Plus className="h-2 w-2 text-green-600" />
                </span>
                Neu
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-100 flex items-center justify-center">
                  <ArrowUp className="h-2 w-2 text-blue-600" />
                </span>
                Verbessert
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-100 flex items-center justify-center">
                  <Check className="h-2 w-2 text-orange-600" />
                </span>
                Behoben
              </span>
            </div>
            <span>Design Review Tool</span>
          </div>
        </div>
      </div>
    </div>
  );
}
