'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function DemoPreviewPage() {
  const [currentUrl, setCurrentUrl] = useState('http://localhost:3000/demo');
  const [iframeLoading, setIframeLoading] = useState(true);
  const [debouncedUrl, setDebouncedUrl] = useState('http://localhost:3000/demo');
  const iframeRef = useRef(null);

  // Demo URLs für verschiedene Projekte
  const demoUrls = [
    { name: 'Demo Seite', url: 'http://localhost:3000/demo' },
    { name: 'Homepage', url: 'http://localhost:3000' },
    { name: 'Google', url: 'https://google.com' },
    { name: 'GitHub', url: 'https://github.com' }
  ];

  // Debounce URL changes to avoid reloading on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUrl(currentUrl);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [currentUrl]);

  // Inject widget when debounced URL changes
  useEffect(() => {
    if (iframeRef.current) {
      setIframeLoading(true);
      
      // Update iframe src to trigger reload
      iframeRef.current.src = debouncedUrl;
      
      // Wait for iframe to load new URL, then inject widget
      const iframe = iframeRef.current;
      const handleUrlChange = () => {
        setTimeout(() => {
          try {
            if (iframe.contentWindow && iframe.contentDocument) {
              // Remove any existing widgets first
              const existingScripts = iframe.contentDocument.querySelectorAll('script[src*="widget.js"]');
              existingScripts.forEach(script => script.remove());
              
              // Add feedback widget script
              const script = iframe.contentDocument.createElement('script');
              script.src = '/widget.js?t=' + Date.now();
              script.setAttribute('data-project-id', 'demo-preview');
              script.defer = true;
              script.onload = () => {
                console.log('Feedback widget loaded for URL:', debouncedUrl);
                setIframeLoading(false);
              };
              iframe.contentDocument.head.appendChild(script);
            }
          } catch (error) {
            console.log('Cannot inject feedback widget (CORS):', error);
            setIframeLoading(false);
          }
        }, 1000);
      };
      
      // Listen for iframe load events
      iframe.addEventListener('load', handleUrlChange);
      
      return () => {
        iframe.removeEventListener('load', handleUrlChange);
      };
    }
  }, [debouncedUrl]);

  const handleIframeLoad = () => {
    // Widget injection is handled by useEffect hook
    // This ensures it works for initial load and URL changes
  };

  const reloadIframe = () => {
    setIframeLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const openInNewTab = () => {
    window.open(currentUrl, '_blank');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Link>
            
            <h1 className="text-xl font-semibold text-gray-900">Demo Preview</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={reloadIframe}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              title="Seite neu laden"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            
            <button
              onClick={openInNewTab}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              title="In neuem Tab öffnen"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* URL Controls */}
        <div className="mt-4 flex gap-2">
          <input
            type="url"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="URL eingeben (lädt automatisch nach 0.5s)..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                // URL wird automatisch durch useEffect geladen
                e.target.blur();
              }
            }}
          />
          {currentUrl !== debouncedUrl && (
            <div className="flex items-center px-3 py-2 text-xs text-gray-500">
              Lädt...
            </div>
          )}
        </div>
        
        {/* Demo URL Buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          {demoUrls.map((demo, index) => (
            <button
              key={index}
              onClick={() => setCurrentUrl(demo.url)}
              className={`px-3 py-1 text-xs rounded-full border ${
                currentUrl === demo.url
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {demo.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Loading Indicator */}
        {iframeLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Website wird geladen...</p>
            </div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src={debouncedUrl}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Website Preview"
        />
      </div>
    </div>
  );
}
