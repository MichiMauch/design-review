'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

export default function UrlSelector({ 
  projectId, 
  projectDomain,
  onUrlChange,
  initialUrl = 'project',
  className = ''
}) {
  const [taskUrls, setTaskUrls] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState(initialUrl);
  const [customUrl, setCustomUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTaskUrls();
  }, [projectId]);

  const loadTaskUrls = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/unique-urls`);
      if (response.ok) {
        const data = await response.json();
        setTaskUrls(data.taskUrls || []);
      }
    } catch (error) {
      console.error('Error loading task URLs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `https://${url}`;
  };

  const handleUrlChange = (value) => {
    setSelectedUrl(value);

    if (value === 'project') {
      onUrlChange(getFullUrl(projectDomain));
    } else if (value === 'custom') {
      // Don't set URL yet, wait for user to input and click analyze
      onUrlChange(null);
    } else {
      // It's a task URL
      onUrlChange(value);
    }
  };

  const handleAnalyzeCustomUrl = () => {
    if (customUrl.trim()) {
      const urlToAnalyze = getFullUrl(customUrl);
      onUrlChange(urlToAnalyze);
    }
  };

  const currentUrl = selectedUrl === 'project' ? getFullUrl(projectDomain) :
                     selectedUrl === 'custom' ? (customUrl.trim() ? getFullUrl(customUrl) : null) :
                     selectedUrl;

  return (
    <div className={`bg-white shadow rounded-lg p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL auswählen
          </label>
          <select
            value={selectedUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="project">Projekt-Domain: {projectDomain || 'Nicht konfiguriert'}</option>
            {taskUrls.length > 0 && (
              <optgroup label="URLs aus Tasks">
                {taskUrls.map((url, index) => (
                  <option key={index} value={url}>
                    {url.length > 80 ? `${url.substring(0, 77)}...` : url}
                  </option>
                ))}
              </optgroup>
            )}
            <option value="custom">Beliebige URL eingeben...</option>
          </select>
        </div>

        {selectedUrl === 'custom' && (
          <div className="flex-1 w-full flex gap-2">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeCustomUrl()}
              placeholder="https://example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleAnalyzeCustomUrl}
              disabled={!customUrl.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Analysieren
            </button>
          </div>
        )}
      </div>

      {currentUrl && (
        <div className="mt-3 text-sm text-gray-600">
          <span className="font-medium">Aktuelle Analyse:</span>{' '}
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {currentUrl}
          </a>
        </div>
      )}
    </div>
  );
}