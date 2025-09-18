'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Globe, Monitor, Cpu, Clock, Download, Search, Zap } from 'lucide-react';

export default function MetadataModal({ isOpen, metadata, onClose }) {
  const [copiedMetadata, setCopiedMetadata] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen || !metadata) return null;

  const copyMetadataToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
      setCopiedMetadata(true);
      setTimeout(() => setCopiedMetadata(false), 2000);
    } catch (err) {
      console.error('Failed to copy metadata:', err);
    }
  };

  const downloadAsJSON = () => {
    const dataStr = JSON.stringify(metadata, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `metadata-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const downloadAsText = () => {
    let textContent = 'BROWSER & SYSTEM METADATA\n';
    textContent += '=' .repeat(50) + '\n\n';

    if (metadata.browser) {
      textContent += 'BROWSER INFORMATION:\n';
      textContent += '-'.repeat(25) + '\n';
      Object.entries(metadata.browser).forEach(([key, value]) => {
        textContent += `${key.replace(/_/g, ' ').toUpperCase()}: ${value}\n`;
      });
      textContent += '\n';
    }

    if (metadata.display) {
      textContent += 'DISPLAY INFORMATION:\n';
      textContent += '-'.repeat(25) + '\n';
      Object.entries(metadata.display).forEach(([key, value]) => {
        textContent += `${key.replace(/_/g, ' ').toUpperCase()}: ${value}\n`;
      });
      textContent += '\n';
    }

    if (metadata.system) {
      textContent += 'SYSTEM INFORMATION:\n';
      textContent += '-'.repeat(25) + '\n';
      Object.entries(metadata.system).forEach(([key, value]) => {
        textContent += `${key.replace(/_/g, ' ').toUpperCase()}: ${value}\n`;
      });
      textContent += '\n';
    }

    if (metadata.context) {
      textContent += 'CONTEXT INFORMATION:\n';
      textContent += '-'.repeat(25) + '\n';
      Object.entries(metadata.context).forEach(([key, value]) => {
        textContent += `${key.replace(/_/g, ' ').toUpperCase()}: ${value}\n`;
      });
      textContent += '\n';
    }

    if (metadata.performance) {
      textContent += 'PERFORMANCE METRICS:\n';
      textContent += '-'.repeat(25) + '\n';
      Object.entries(metadata.performance).forEach(([key, value]) => {
        textContent += `${key.replace(/_/g, ' ').toUpperCase()}: ${value}\n`;
      });
    }

    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(textContent);
    const exportFileDefaultName = `metadata-${Date.now()}.txt`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const filterMetadata = (obj, term) => {
    if (!term) return obj;
    const filtered = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object') {
        const subFiltered = {};
        Object.entries(value).forEach(([subKey, subValue]) => {
          if (subKey.toLowerCase().includes(term.toLowerCase()) ||
              String(subValue).toLowerCase().includes(term.toLowerCase())) {
            subFiltered[subKey] = subValue;
          }
        });
        if (Object.keys(subFiltered).length > 0) {
          filtered[key] = subFiltered;
        }
      } else if (key.toLowerCase().includes(term.toLowerCase()) ||
                 String(value).toLowerCase().includes(term.toLowerCase())) {
        filtered[key] = value;
      }
    });
    return filtered;
  };

  const filteredMetadata = filterMetadata(metadata, searchTerm);

  const MetadataCard = ({ title, icon: Icon, data, bgColor = 'bg-white' }) => (
    <div className={`${bgColor} rounded-lg p-4 border border-gray-200 shadow-sm`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5 text-blue-600" />
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      </div>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex justify-between items-start">
            <span className="text-xs font-medium text-gray-600 capitalize">
              {key.replace(/_/g, ' ')}:
            </span>
            <span className="text-xs text-gray-900 text-right max-w-[60%] break-words">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[85vh] backdrop-blur-sm flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Monitor className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">Browser & System Metadata</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyMetadataToClipboard}
              className="p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
              title="JSON kopieren"
            >
              <Copy className="h-5 w-5" />
            </button>
            <button
              onClick={downloadAsJSON}
              className="p-2 text-gray-500 hover:text-green-600 transition-colors rounded-lg hover:bg-green-50"
              title="Als JSON herunterladen"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Bar - Fixed */}
        <div className="p-4 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Metadaten durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Success Message - Fixed */}
        {copiedMetadata && (
          <div className="mx-6 mt-4 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex-shrink-0">
            <div className="text-sm text-green-600 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Metadaten erfolgreich kopiert!
            </div>
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {Object.keys(filteredMetadata).length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Keine Metadaten gefunden für "{searchTerm}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Browser Information */}
              {filteredMetadata.browser && Object.keys(filteredMetadata.browser).length > 0 && (
                <MetadataCard
                  title="Browser Information"
                  icon={Globe}
                  data={filteredMetadata.browser}
                  bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
                />
              )}

              {/* Display Information */}
              {filteredMetadata.display && Object.keys(filteredMetadata.display).length > 0 && (
                <MetadataCard
                  title="Display Information"
                  icon={Monitor}
                  data={filteredMetadata.display}
                  bgColor="bg-gradient-to-br from-green-50 to-green-100"
                />
              )}

              {/* System Information */}
              {filteredMetadata.system && Object.keys(filteredMetadata.system).length > 0 && (
                <MetadataCard
                  title="System Information"
                  icon={Cpu}
                  data={filteredMetadata.system}
                  bgColor="bg-gradient-to-br from-purple-50 to-purple-100"
                />
              )}

              {/* Context Information */}
              {filteredMetadata.context && Object.keys(filteredMetadata.context).length > 0 && (
                <MetadataCard
                  title="Context Information"
                  icon={Clock}
                  data={filteredMetadata.context}
                  bgColor="bg-gradient-to-br from-orange-50 to-orange-100"
                />
              )}

              {/* Performance Information */}
              {filteredMetadata.performance && Object.keys(filteredMetadata.performance).length > 0 && (
                <MetadataCard
                  title="Performance Metrics"
                  icon={Zap}
                  data={filteredMetadata.performance}
                  bgColor="bg-gradient-to-br from-red-50 to-red-100"
                />
              )}
            </div>
          )}
        </div>

        {/* Modal Footer - Fixed */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="text-xs text-gray-500">
            {Object.keys(metadata).length} Kategorien • {
              Object.values(metadata).reduce((acc, cat) =>
                acc + (typeof cat === 'object' ? Object.keys(cat).length : 1), 0
              )
            } Felder insgesamt
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadAsText}
              className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Als Text herunterladen
            </button>
            <button
              onClick={downloadAsJSON}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Als JSON herunterladen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}