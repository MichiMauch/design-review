'use client';

import { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { isValidUrl, normalizeUrl } from '@/lib/utils';

interface URLInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

export default function URLInput({ onSubmit, isLoading = false }: URLInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Bitte geben Sie eine URL ein');
      return;
    }

    const normalizedUrl = normalizeUrl(url.trim());
    
    if (!isValidUrl(normalizedUrl)) {
      setError('Bitte geben Sie eine gültige URL ein');
      return;
    }

    onSubmit(normalizedUrl);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Globe className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            disabled={isLoading}
          />
        </div>
        
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Preview wird geladen...
            </>
          ) : (
            'Load Preview'
          )}
        </button>
      </form>
    </div>
  );
}