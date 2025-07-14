'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageSquare, Settings, RotateCcw, ExternalLink, Zap } from 'lucide-react';

export default function AdminReviewPage() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('http://localhost:3000/demo');
  const [debouncedUrl, setDebouncedUrl] = useState('http://localhost:3000/demo');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [jiraSettings, setJiraSettings] = useState({});
  const [jiraProjects, setJiraProjects] = useState([]);
  const [jiraUsers, setJiraUsers] = useState([]);
  const [jiraBoards, setJiraBoards] = useState([]);
  const [jiraSprints, setJiraSprints] = useState([]);
  const [jiraColumns, setJiraColumns] = useState([]);
  const [showJiraTicketModal, setShowJiraTicketModal] = useState(false);
  const [selectedFeedbackForTicket, setSelectedFeedbackForTicket] = useState(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showAllFeedback, setShowAllFeedback] = useState(false);
  const [updateIndicator, setUpdateIndicator] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const iframeRef = useRef(null);

  // Define loadFeedback early with useCallback
  const loadFeedback = useCallback(async () => {
    try {
      const response = await fetch('/api/feedback');
      const data = await response.json();
      
      if (data.success) {
        console.log('📋 Loaded feedback items:', data.feedback.length);
        console.log('📋 Feedback URLs:', data.feedback.map(f => f.url));
        setFeedback(data.feedback);
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Define loadJiraSettings early with useCallback
  const loadJiraSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings?key=jira');
      const data = await response.json();
      
      if (data.success && data.setting) {
        setJiraSettings(data.setting.value);
      }
    } catch (error) {
      console.error('Error loading JIRA settings:', error);
    }
  }, []);

  // Auto-hide toast after 10 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Debounce URL changes to avoid reloading on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only update if URL has meaningful content
      if (currentUrl && currentUrl.trim().length > 0) {
        console.log('🔄 Debouncing URL change:', currentUrl, '-> will become:', currentUrl.trim());
        setDebouncedUrl(currentUrl.trim());
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [currentUrl]);

  // Demo URLs für verschiedene Projekte
  const demoUrls = [
    { name: 'Demo Seite', url: 'http://localhost:3000/demo' },
    { name: 'Homepage', url: 'http://localhost:3000' },
    { name: 'Externe Website', url: 'https://example.com' }
  ];  useEffect(() => {
    loadFeedback();
    loadJiraSettings();
    
    // Auto-refresh alle 5 Sekunden
    const refreshInterval = setInterval(() => {
      loadFeedback();
    }, 5000);
    
    // Event Listener für manuelle Aktualisierungen
    const handleFeedbackUpdate = (event) => {
      console.log('Feedback update received, reloading...', event.detail);
      setUpdateIndicator(true);
      loadFeedback();
      
      // Hide update indicator after 2 seconds
      setTimeout(() => setUpdateIndicator(false), 2000);
    };
    
    // Custom Event für Feedback-Updates
    window.addEventListener('feedbackUpdated', handleFeedbackUpdate);
    
    // PostMessage Handler für iframe Kommunikation
    const handlePostMessage = (event) => {
      if (event.data && event.data.type === 'feedbackUpdated') {
        console.log('Feedback update received from iframe, reloading...', event.data);
        setUpdateIndicator(true);
        loadFeedback();
        
        // Hide update indicator after 2 seconds
        setTimeout(() => setUpdateIndicator(false), 2000);
      }
    };
    
    window.addEventListener('message', handlePostMessage);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('feedbackUpdated', handleFeedbackUpdate);
      window.removeEventListener('message', handlePostMessage);
    };
  }, [loadFeedback, loadJiraSettings]);

  // Helper function to inject widgets into iframe
  const injectWidgets = useCallback((iframe, url) => {
    try {
      if (!iframe || !iframe.contentDocument) {
        console.error('❌ Cannot access iframe document');
        return;
      }

      // Remove any existing widgets first
      const existingAdminScripts = iframe.contentDocument.querySelectorAll('script[src*="admin-widget.js"]');
      existingAdminScripts.forEach(script => script.remove());
      
      const existingWidgetScripts = iframe.contentDocument.querySelectorAll('script[src*="widget.js"]');
      existingWidgetScripts.forEach(script => script.remove());
      
      console.log('🔧 Injecting widgets for URL:', url);
      
      // Add normal widget script first (for creating new feedback)
      const widgetScript = iframe.contentDocument.createElement('script');
      widgetScript.src = '/widget.js?t=' + Date.now();
      widgetScript.setAttribute('data-project-id', 'admin-review');
      widgetScript.defer = true;
      
      widgetScript.onload = () => {
        console.log('✅ Feedback widget loaded successfully for:', url);
        
        // Then add admin widget script (for displaying existing feedback)
        const adminScript = iframe.contentDocument.createElement('script');
        adminScript.src = '/admin-widget.js?admin=true&t=' + Date.now();
        adminScript.onload = () => {
          console.log('✅ Admin widget loaded successfully for:', url);
          setIframeLoading(false);
          
          // Reload feedback data
          loadFeedback();
        };
        
        adminScript.onerror = (error) => {
          console.error('❌ Failed to load admin widget:', error);
          setIframeLoading(false);
        };
        
        iframe.contentDocument.head.appendChild(adminScript);
      };
      
      widgetScript.onerror = (error) => {
        console.error('❌ Failed to load feedback widget:', error);
        setIframeLoading(false);
      };
      
      iframe.contentDocument.head.appendChild(widgetScript);
      
    } catch (error) {
      console.error('❌ Error injecting widgets:', error);
      setIframeLoading(false);
    }
  }, [loadFeedback]);
  // Inject widget when URL changes
  useEffect(() => {
    if (iframeRef.current && debouncedUrl) {
      // Skip if URL is incomplete or just a protocol
      if (!debouncedUrl || 
          debouncedUrl === 'https://' || 
          debouncedUrl === 'http://' ||
          debouncedUrl === 'https' ||
          debouncedUrl === 'http' ||
          debouncedUrl.trim().length < 8) {
        console.log('⏭️ Skipping incomplete URL:', debouncedUrl);
        return;
      }

      // Validate URL before proceeding
      let validUrl;
      try {
        // Add protocol if missing
        if (!debouncedUrl.startsWith('http://') && !debouncedUrl.startsWith('https://')) {
          validUrl = `https://${debouncedUrl}`;
        } else {
          validUrl = debouncedUrl;
        }
        
        // Validate URL format - must have at least domain
        const urlObj = new URL(validUrl);
        if (!urlObj.hostname || urlObj.hostname.length < 3) {
          console.log('⏭️ Skipping invalid hostname:', urlObj.hostname);
          return;
        }
        
        console.log('🔄 Loading new URL in iframe:', validUrl);
        setIframeLoading(true);
        
        // Force iframe reload by setting src with cache busting
        const urlWithCacheBuster = validUrl.includes('?') 
          ? `${validUrl}&_t=${Date.now()}`
          : `${validUrl}?_t=${Date.now()}`;
        
        iframeRef.current.src = urlWithCacheBuster;
        
        // Wait for iframe to load, then inject widgets
        const timer = setTimeout(() => {
          try {
            const iframe = iframeRef.current;
            if (iframe && iframe.contentWindow) {
              console.log('📋 Iframe loaded, checking accessibility...');
              
              // Test if we can actually access the iframe content (real CORS test)
              let canAccessContent = false;
              let actualIframeUrl = null;
              
              try {
                // Try to access iframe document - this will throw if CORS restricted
                const testAccess = iframe.contentDocument;
                actualIframeUrl = iframe.contentWindow.location.href;
                canAccessContent = testAccess !== null;
                console.log('✅ Can access iframe content, URL:', actualIframeUrl);
              } catch (corsError) {
                console.warn('⚠️ Cannot access iframe content due to CORS:', corsError.message);
                canAccessContent = false;
              }
              
              if (canAccessContent && actualIframeUrl) {
                // Real same-origin access confirmed - proceed with widget injection
                console.log('✅ Real same-origin access confirmed, injecting widgets...');
                
                // Double-check URL validity
                try {
                  const urlObj = new URL(actualIframeUrl);
                  if (urlObj.hostname && urlObj.hostname.length >= 3) {
                    injectWidgets(iframe, actualIframeUrl);
                  } else {
                    console.log('⏭️ Invalid hostname in iframe:', urlObj.hostname);
                    setIframeLoading(false);
                  }
                } catch (urlError) {
                  console.log('⏭️ Invalid URL format in iframe:', actualIframeUrl, urlError.message);
                  setIframeLoading(false);
                }
              } else {
                // Cross-origin or blocked - show warning
                console.warn('⚠️ Cross-origin URL or blocked content detected');
                setIframeLoading(false);
                
                // Show user-friendly message
                setToast({
                  type: 'warning',
                  message: 'Externe Website geladen. Widget-Injection durch CORS blockiert. Für externe Websites verwenden Sie das <script>-Tag direkt.'
                });
              }
            } else {
              console.warn('⚠️ Cannot access iframe content (possibly CORS restricted)');
              setIframeLoading(false);
            }
          } catch (error) {
            console.error('❌ Cannot inject widgets (CORS or other error):', error);
            setIframeLoading(false);
          }
        }, 2000); // Wait 2 seconds for iframe to fully load
        
        return () => clearTimeout(timer);
      } catch (error) {
        console.error('❌ Invalid URL format:', debouncedUrl, error);
        setToast({
          type: 'error',
          message: 'Ungültige URL Format. Bitte geben Sie eine vollständige URL ein (z.B. https://example.com)'
        });
        setIframeLoading(false);
      }
    }
  }, [debouncedUrl, loadFeedback, injectWidgets]);

  const saveJiraSettings = async (settings) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'jira',
          value: settings
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setJiraSettings(settings);
        return { success: true };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error saving JIRA settings:', error);
      return { success: false, error: error.message };
    }
  };

  const testJiraConnection = async (settings) => {
    setIsTestingConnection(true);
    
    try {
      // Nur die benötigten Settings extrahieren, um zirkuläre Referenzen zu vermeiden
      const cleanSettings = {
        serverUrl: settings.serverUrl,
        username: settings.username,
        apiToken: settings.apiToken
      };
      
      const response = await fetch('/api/jira', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'testConnection',
          ...cleanSettings
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // JIRA Projekte laden
        await loadJiraProjects(cleanSettings);
        // JIRA User laden
        await loadJiraUsers(cleanSettings);
        // JIRA Boards laden
        await loadJiraBoards(cleanSettings);
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('JIRA connection test failed:', error);
      return { success: false, error: error.message };
    } finally {
      setIsTestingConnection(false);
    }
  };

  const loadJiraProjects = async (settings) => {
    try {
      const params = new URLSearchParams({
        action: 'getProjects',
        serverUrl: settings.serverUrl,
        username: settings.username,
        apiToken: settings.apiToken
      });
      
      const response = await fetch(`/api/jira?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setJiraProjects(data.projects);
        return data.projects;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error loading JIRA projects:', error);
      return [];
    }
  };

  const loadJiraUsers = async (settings) => {
    try {
      const params = new URLSearchParams({
        action: 'getUsers',
        serverUrl: settings.serverUrl,
        username: settings.username,
        apiToken: settings.apiToken
      });
      
      const response = await fetch(`/api/jira?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setJiraUsers(data.users);
        return data.users;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error loading JIRA users:', error);
      return [];
    }
  };

  const loadJiraBoards = async (settings) => {
    try {
      const params = new URLSearchParams({
        action: 'getBoards',
        serverUrl: settings.serverUrl,
        username: settings.username,
        apiToken: settings.apiToken
      });

      if (settings.projectKey) {
        params.set('projectKey', settings.projectKey);
      }
      
      const response = await fetch(`/api/jira?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setJiraBoards(data.boards);
        return data.boards;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error loading JIRA boards:', error);
      return [];
    }
  };

  const loadJiraSprints = async (settings, boardId) => {
    if (!boardId) return [];
    
    try {
      const params = new URLSearchParams({
        action: 'getSprints',
        serverUrl: settings.serverUrl,
        username: settings.username,
        apiToken: settings.apiToken,
        boardId: boardId
      });
      
      const response = await fetch(`/api/jira?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setJiraSprints(data.sprints);
        return data.sprints;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error loading JIRA sprints:', error);
      return [];
    }
  };

  const loadJiraColumns = async (settings, boardId) => {
    if (!boardId) return [];
    
    try {
      const params = new URLSearchParams({
        action: 'getBoardColumns',
        serverUrl: settings.serverUrl,
        username: settings.username,
        apiToken: settings.apiToken,
        boardId: boardId
      });
      
      const response = await fetch(`/api/jira?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setJiraColumns(data.columns);
        return data.columns;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error loading JIRA columns:', error);
      return [];
    }
  };

  const createJiraTicket = async (feedback, customJiraConfig = null) => {
    setIsCreatingTicket(true);
    
    try {
      const configToUse = customJiraConfig || jiraSettings;
      
      const response = await fetch('/api/jira', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createTicket',
          feedback,
          jiraConfig: configToUse
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return { success: true, ticket: data.ticket };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('JIRA ticket creation failed:', error);
      return { success: false, error: error.message };
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const getCurrentUrlFeedback = () => {
    if (!currentUrl || currentUrl.trim() === '') {
      return [];
    }

    const filtered = feedback.filter(item => {
      try {
        const feedbackUrl = new URL(item.url);
        const currentUrlObj = new URL(currentUrl);
        
        console.log('🔍 Comparing:', feedbackUrl.href, 'vs', currentUrlObj.href);
        
        // Exact URL match
        if (feedbackUrl.href === currentUrlObj.href) {
          console.log('✅ Exact URL match found');
          return true;
        }
        
        // Same pathname match (for same domain)
        if (feedbackUrl.origin === currentUrlObj.origin && 
            feedbackUrl.pathname === currentUrlObj.pathname) {
          console.log('✅ Same origin + path match found');
          return true;
        }
        
        // For external feedback: match by domain and path
        if (feedbackUrl.hostname === currentUrlObj.hostname && 
            feedbackUrl.pathname === currentUrlObj.pathname) {
          console.log('✅ Same hostname + path match found');
          return true;
        }
        
        return false;
      } catch (error) {
        console.log('🔍 URL parsing failed, using string match:', error);
        // Fallback: exact string match
        return item.url === currentUrl;
      }
    });
    
    console.log('🎯 Filtered feedback for', currentUrl, ':', filtered.length, 'items');
    return filtered;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE');
  };  const handleIframeLoad = () => {
    console.log('📋 Iframe onLoad event triggered');
    
    // Check if this is a valid URL and same-origin
    setTimeout(() => {
      try {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow && iframe.contentDocument) {
          let iframeUrl;
          
          try {
            iframeUrl = iframe.contentWindow.location.href;
          } catch (corsError) {
            console.log('⚠️ Cannot access iframe URL (CORS restricted):', corsError.message);
            setIframeLoading(false);
            return;
          }
          
          // Test actual iframe content access (real CORS test)
          let canAccessContent = false;
          try {
            // This will throw if CORS restricted, regardless of origin
            const testAccess = iframe.contentDocument;
            canAccessContent = testAccess !== null;
            console.log('✅ Real iframe content access confirmed');
          } catch (corsError) {
            console.log('⚠️ Cannot access iframe content (CORS restricted):', corsError.message);
            setIframeLoading(false);
            return;
          }
          
          if (!canAccessContent) {
            console.log('⚠️ Cannot access iframe content');
            setIframeLoading(false);
            return;
          }
          
          // Skip injection for about:blank or invalid URLs
          if (iframeUrl === 'about:blank' || 
              iframeUrl.includes('about:blank#blocked') ||
              iframeUrl === 'about:srcdoc') {
            console.log('⏭️ Skipping widget injection for about:blank or similar');
            setIframeLoading(false);
            return;
          }
          
          // Validate URL format
          try {
            const urlObj = new URL(iframeUrl);
            if (!urlObj.hostname || urlObj.hostname.length < 3) {
              console.log('⏭️ Skipping invalid hostname in iframe:', urlObj.hostname);
              setIframeLoading(false);
              return;
            }
          } catch (urlError) {
            console.log('⏭️ Invalid URL format in iframe:', iframeUrl, urlError.message);
            setIframeLoading(false);
            return;
          }
          
          // Proceed with widget injection since we confirmed content access
          console.log('✅ Iframe content accessible, checking for existing widgets...');
          const existingWidget = iframe.contentDocument.querySelector('script[src*="widget.js"]');
          if (!existingWidget) {
            console.log('🔧 No widget found, injecting from onLoad...');
            injectWidgets(iframe, iframeUrl);
          } else {
            console.log('✅ Widget already present');
            setIframeLoading(false);
          }
        } else {
          console.log('⚠️ Iframe not accessible or no content window');
          setIframeLoading(false);
        }
      } catch (error) {
        console.log('Cannot check/inject widget on load:', error);
        setIframeLoading(false);
      }
    }, 500);
  };

  const reloadIframe = () => {
    setIframeLoading(true);
    if (iframeRef.current) {
      // Force reload with cache busting
      const urlWithCacheBuster = currentUrl.includes('?') 
        ? `${currentUrl}&_reload=${Date.now()}`
        : `${currentUrl}?_reload=${Date.now()}`;
      iframeRef.current.src = urlWithCacheBuster;
    }
  };

  const forceInjectWidget = () => {
    console.log('🔧 Manually forcing widget injection...');
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow && iframe.contentDocument) {
        let iframeUrl;
        
        // Try to get iframe URL
        try {
          iframeUrl = iframe.contentWindow.location.href;
        } catch (corsError) {
          console.log('CORS error accessing iframe URL:', corsError.message);
          setToast({
            type: 'error',
            message: 'Kann nicht auf Iframe-URL zugreifen (CORS-Beschränkung).'
          });
          return;
        }
        
        // Skip injection for about:blank or invalid URLs
        if (iframeUrl === 'about:blank' || 
            iframeUrl.includes('about:blank#blocked') ||
            iframeUrl === 'about:srcdoc') {
          setToast({
            type: 'warning',
            message: 'Keine gültige URL geladen. Bitte geben Sie eine vollständige URL ein.'
          });
          return;
        }
        
        // Validate URL format
        try {
          const urlObj = new URL(iframeUrl);
          if (!urlObj.hostname || urlObj.hostname.length < 3) {
            setToast({
              type: 'warning',
              message: 'Ungültige URL geladen. Bitte geben Sie eine vollständige URL ein.'
            });
            return;
          }
        } catch (urlError) {
          setToast({
            type: 'error',
            message: 'URL-Format ungültig: ' + urlError.message
          });
          return;
        }
        
        // Test real iframe content access instead of just origin comparison
        let canAccessContent = false;
        try {
          // This will throw if CORS restricted
          const testAccess = iframe.contentDocument;
          canAccessContent = testAccess !== null;
        } catch (corsError) {
          console.log('CORS error during manual injection:', corsError.message);
          setToast({
            type: 'warning',
            message: 'Widget-Injection blockiert durch CORS. Für externe Websites verwenden Sie das <script>-Tag direkt auf der Website.'
          });
          return;
        }
        
        if (!canAccessContent) {
          setToast({
            type: 'error',
            message: 'Kann nicht auf Iframe-Inhalt zugreifen.'
          });
          return;
        }
        
        // Proceed with injection since we confirmed access
        console.log('✅ Manual injection: Content access confirmed');
        injectWidgets(iframe, iframeUrl);
      } else {
        setToast({
          type: 'error',
          message: 'Kann nicht auf Iframe-Inhalt zugreifen.'
        });
      }
    } catch (error) {
      console.error('❌ Manual widget injection failed:', error);
      setToast({
        type: 'error',
        message: 'Widget-Injection fehlgeschlagen: ' + error.message
      });
    }
  };

  const openInNewTab = () => {
    window.open(currentUrl, '_blank');
  };

  const highlightFeedbackArea = (feedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setShowFeedbackModal(true);
    
    // Try to highlight the area in the iframe
    try {
      if (feedbackItem.selected_area) {
        const area = JSON.parse(feedbackItem.selected_area);
        // You could add overlay highlighting logic here
        console.log('Highlighting area:', area);
      }
    } catch (error) {
      console.log('Cannot highlight area:', error);
    }
  };

  const currentPageFeedback = getCurrentUrlFeedback();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Design Review Dashboard
              </h1>
              <p className="text-gray-600 text-sm">
                Live Website Review mit Feedback-Übersicht
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* URL Status Indicator */}
              <div className="flex items-center gap-2">
                {currentUrl && (
                  <div className="flex items-center gap-2 px-2 py-1 rounded-md text-xs">
                    {currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1') ? (
                      <div className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Widget-Injection möglich
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-orange-700 bg-orange-100 px-2 py-1 rounded">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        Externe Website (CORS-beschränkt)
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={currentUrl}
                  onChange={(e) => setCurrentUrl(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-80"
                  placeholder="https://example.com (lädt automatisch nach 500ms)..."
                  title="Geben Sie eine vollständige URL ein. Widget-Injection funktioniert nur bei gleicher Domain (localhost)."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      // URL wird automatisch durch useEffect geladen
                      e.target.blur();
                    }
                  }}
                />
                <button
                  onClick={reloadIframe}
                  className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
                  title="Neu laden"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={forceInjectWidget}
                  className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
                  title="Widget manuell injizieren"
                >
                  <Zap className="h-4 w-4" />
                </button>
                <button
                  onClick={openInNewTab}
                  className="p-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
                  title="In neuem Tab öffnen"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              
              <button
                onClick={() => setSidebarVisible(!sidebarVisible)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                title={sidebarVisible ? 'Sidebar ausblenden' : 'Sidebar einblenden'}
              >
                {sidebarVisible ? '→' : '←'}
                <span className="hidden sm:inline">
                  {sidebarVisible ? 'Sidebar ausblenden' : 'Sidebar einblenden'}
                </span>
              </button>
            </div>
          </div>
          
          {/* Quick URL Selection */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-gray-600">Quick Select:</span>
            {demoUrls.map((demo, index) => (
              <button
                key={index}
                onClick={() => setCurrentUrl(demo.url)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  currentUrl === demo.url
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {demo.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Website Preview */}
        <div className="flex-1 bg-white border-r">
          <div className="h-full relative">
            {iframeLoading && (
              <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
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
            
            {/* Feedback Overlay */}
            {currentPageFeedback.length > 0 && (
              <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                <Zap className="h-3 w-3" />
                {currentPageFeedback.length} Feedback(s) vorhanden
              </div>
            )}
            
            {/* Update Indicator */}
            {updateIndicator && (
              <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                Aktualisiert
              </div>
            )}
          </div>
        </div>

        {/* Feedback Sidebar */}
        {sidebarVisible && (
          <div className="w-96 bg-gray-50 overflow-y-auto transition-all duration-300">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Feedback für diese Seite
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAllFeedback(!showAllFeedback)}
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                  >
                    {showAllFeedback ? 'Nur diese Seite' : 'Alle Feedback'}
                  </button>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {showAllFeedback ? feedback.length : currentPageFeedback.length}
                  </span>
                </div>
              </div>

              {/* Debug: Show all feedback */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <div className="font-medium text-yellow-800">Debug Info:</div>
                  <div className="text-yellow-700">Aktuelle URL: {currentUrl}</div>
                  <div className="text-yellow-700">Alle Feedback: {feedback.length}</div>
                  <div className="text-yellow-700">Gefiltert: {currentPageFeedback.length}</div>
                  {feedback.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium text-yellow-800">Alle URLs:</div>
                      {feedback.map((f, i) => (
                        <div key={i} className="text-yellow-600 truncate">
                          {f.url} (id: {f.id})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            {(showAllFeedback ? feedback : currentPageFeedback).length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Kein Feedback für diese Seite
                </h3>
                <p className="text-xs text-gray-600">
                  Verwenden Sie das Widget auf der Website, um Feedback zu erstellen.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(showAllFeedback ? feedback : currentPageFeedback).map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white rounded-lg p-4 border-2 cursor-pointer transition-colors ${
                      selectedFeedback?.id === item.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => highlightFeedbackArea(item)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        #{item.id}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-800 mb-3 line-clamp-3">
                      {item.text}
                    </p>
                    
                    {item.selected_area && (
                      <div className="text-xs text-gray-600 mb-3">
                        <strong>Markierter Bereich:</strong>
                        <br />
                        {(() => {
                          try {
                            const area = JSON.parse(item.selected_area);
                            return `${Math.round(area.width)}×${Math.round(area.height)}px bei (${Math.round(area.x)}, ${Math.round(area.y)})`;
                          } catch {
                            return 'Bereich-Info nicht verfügbar';
                          }
                        })()}
                      </div>
                    )}
                    
                    {item.screenshot && (
                      <div className="mt-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.screenshot}
                          alt="Feedback Screenshot"
                          className="w-full h-20 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Feedback Detail Modal */}
      {showFeedbackModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Feedback Details #{selectedFeedback.id}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {formatDate(selectedFeedback.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* JIRA Ticket Button */}
                  <button
                    onClick={() => {
                      const hasJiraSettings = jiraSettings.serverUrl && jiraSettings.username && jiraSettings.apiToken;
                      
                      if (!hasJiraSettings) {
                        alert('Bitte konfigurieren Sie zuerst die JIRA-Integration in den Settings.');
                        setShowSettings(true);
                        return;
                      }
                      
                      setSelectedFeedbackForTicket(selectedFeedback);
                      setShowJiraTicketModal(true);
                    }}
                    disabled={isCreatingTicket}
                    className={`${isCreatingTicket ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white p-2 rounded-lg transition-colors`}
                    title="JIRA Ticket erstellen"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  
                  {/* Als erledigt markieren Button */}
                  <button
                    onClick={() => {
                      console.log('Marking as resolved:', selectedFeedback.id);
                      alert('Status-Update implementierung folgt.');
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                    title="Als erledigt markieren"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </button>
                  
                  {/* Close Button */}
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Feedback Content */}
                <div className="space-y-6">
                  {/* Feedback Text */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Feedback Inhalt
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {selectedFeedback.text}
                      </p>
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Technische Details
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 border space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-sm font-medium text-gray-600 w-20">URL:</span>
                        <span className="text-sm text-gray-800 break-all flex-1">
                          {selectedFeedback.url}
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <span className="text-sm font-medium text-gray-600 w-20">Projekt:</span>
                        <span className="text-sm text-gray-800">
                          {selectedFeedback.project_id}
                        </span>
                      </div>

                      {selectedFeedback.selected_area && (
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-medium text-gray-600 w-20">Bereich:</span>
                          <div className="text-sm text-gray-800">
                            {(() => {
                              try {
                                const area = JSON.parse(selectedFeedback.selected_area);
                                return (
                                  <div className="space-y-1">
                                    <div>Position: {Math.round(area.x)}, {Math.round(area.y)}</div>
                                    <div>Größe: {Math.round(area.width)} × {Math.round(area.height)} px</div>
                                    <div>Relative: {Math.round((area.x / window.innerWidth) * 100)}% von links, {Math.round((area.y / window.innerHeight) * 100)}% von oben</div>
                                  </div>
                                );
                              } catch {
                                return 'Bereich-Info nicht verfügbar';
                              }
                            })()}
                          </div>
                        </div>
                      )}
                      
                      {selectedFeedback.user_agent && (
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-medium text-gray-600 w-20">Browser:</span>
                          <span className="text-sm text-gray-800 break-all flex-1">
                            {selectedFeedback.user_agent}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Screenshot and Actions */}
                <div className="space-y-6">
                  {/* Screenshot */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Screenshot
                    </h3>
                    {selectedFeedback.screenshot ? (
                      <div className="bg-gray-50 rounded-lg p-4 border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedFeedback.screenshot}
                          alt="Feedback Screenshot"
                          className="w-full h-auto rounded border max-h-96 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div className="text-center text-gray-500 hidden">
                          Screenshot konnte nicht geladen werden
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-8 border text-center text-gray-500">
                        <div className="text-4xl mb-2">📷</div>
                        <p>Kein Screenshot verfügbar</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JIRA Ticket Creation Modal */}
      {showJiraTicketModal && selectedFeedbackForTicket && (
        <JiraTicketModal 
          isOpen={showJiraTicketModal}
          onClose={() => {
            setShowJiraTicketModal(false);
            setSelectedFeedbackForTicket(null);
          }}
          feedback={selectedFeedbackForTicket}
          jiraSettings={jiraSettings}
          jiraProjects={jiraProjects}
          jiraUsers={jiraUsers}
          jiraBoards={jiraBoards}
          jiraSprints={jiraSprints}
          jiraColumns={jiraColumns}
          onLoadSprints={loadJiraSprints}
          onLoadColumns={loadJiraColumns}
          isCreating={isCreatingTicket}
          onCreateTicket={createJiraTicket}
          setIsCreating={setIsCreatingTicket}
          setToast={setToast}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`rounded-lg shadow-lg p-4 max-w-md ${
            toast.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {toast.type === 'success' ? (
                  <div className="w-5 h-5 text-green-600">✓</div>
                ) : (
                  <div className="w-5 h-5 text-red-600">✗</div>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm font-medium ${
                  toast.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {toast.message}
                </p>
                {toast.ticketKey && (
                  <p className="text-xs text-green-600 mt-1">
                    Ticket: {toast.ticketKey}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  {toast.ticketUrl && (
                    <button
                      onClick={() => {
                        window.open(toast.ticketUrl, '_blank');
                        setToast(null);
                      }}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                    >
                      Zum Ticket
                    </button>
                  )}
                  <button
                    onClick={() => setToast(null)}
                    className={`text-xs px-3 py-1 rounded transition-colors ${
                      toast.type === 'success' 
                        ? 'bg-green-200 text-green-800 hover:bg-green-300' 
                        : 'bg-red-200 text-red-800 hover:bg-red-300'
                    }`}
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <JiraSettingsModal 
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          currentSettings={jiraSettings}
          onSave={saveJiraSettings}
          onTestConnection={testJiraConnection}
          jiraProjects={jiraProjects}
          jiraBoards={jiraBoards}
          jiraSprints={jiraSprints}
          jiraColumns={jiraColumns}
          onLoadSprints={loadJiraSprints}
          onLoadColumns={loadJiraColumns}
          isTestingConnection={isTestingConnection}
        />
      )}
    </div>
  );
}

// JIRA Settings Modal Komponente
function JiraSettingsModal({ 
  isOpen, 
  onClose, 
  currentSettings, 
  onSave, 
  onTestConnection, 
  jiraProjects, 
  jiraBoards = [],
  jiraSprints = [],
  jiraColumns = [],
  onLoadSprints,
  onLoadColumns,
  isTestingConnection 
}) {
  const [settings, setSettings] = useState({
    serverUrl: '',
    username: '',
    apiToken: '',
    ...currentSettings
  });
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleTestConnection = async () => {
    if (!settings.serverUrl || !settings.username || !settings.apiToken) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    const result = await onTestConnection(settings);
    setConnectionStatus(result);
    
    if (result.success) {
      alert(`Verbindung erfolgreich!\n\nBenutzer: ${result.user.displayName}\nE-Mail: ${result.user.emailAddress}`);
    } else {
      alert(`Verbindung fehlgeschlagen:\n\n${result.error}`);
    }
  };

  const handleSave = async () => {
    if (!settings.serverUrl || !settings.username || !settings.apiToken) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    setIsSaving(true);
    
    const result = await onSave(settings);
    
    if (result.success) {
      alert('JIRA Settings erfolgreich gespeichert!');
      onClose();
    } else {
      alert(`Fehler beim Speichern:\n\n${result.error}`);
    }
    
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            JIRA Integration Settings
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Server URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JIRA Server URL *
            </label>
            <input
              type="url"
              value={settings.serverUrl}
              onChange={(e) => setSettings({...settings, serverUrl: e.target.value})}
              placeholder="https://your-company.atlassian.net"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ihre JIRA Cloud oder Server URL
            </p>
          </div>
          
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-Mail / Benutzername *
            </label>
            <input
              type="email"
              value={settings.username}
              onChange={(e) => setSettings({...settings, username: e.target.value})}
              placeholder="ihr-benutzer@firma.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* API Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Token *
            </label>
            <input
              type="password"
              value={settings.apiToken}
              onChange={(e) => setSettings({...settings, apiToken: e.target.value})}
              placeholder="Ihr JIRA API Token"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              API Token aus den JIRA Account-Einstellungen
            </p>
          </div>
          
          {/* Test Connection Button */}
          <div className="pt-2">
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className={`w-full px-4 py-2 rounded-md transition-colors ${
                isTestingConnection 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              {isTestingConnection ? 'Teste Verbindung...' : 'Verbindung testen'}
            </button>
            
            {connectionStatus && (
              <div className={`mt-2 p-2 rounded text-sm ${
                connectionStatus.success 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {connectionStatus.success 
                  ? `✓ Verbindung erfolgreich - ${connectionStatus.user?.displayName}` 
                  : `✗ ${connectionStatus.error}`
                }
              </div>
            )}
          </div>
          
          {/* Project Selection */}
          {jiraProjects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Standard-Projekt
              </label>
              <select 
                value={settings.projectKey}
                onChange={(e) => setSettings({...settings, projectKey: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Projekt auswählen...</option>
                {jiraProjects.map(project => (
                  <option key={project.key} value={project.key}>
                    {project.name} ({project.key})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Standard Issue Type
            </label>
            <select 
              value={settings.issueType}
              onChange={(e) => setSettings({...settings, issueType: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Task">Task</option>
              <option value="Bug">Bug</option>
              <option value="Story">Story</option>
              <option value="Improvement">Improvement</option>
            </select>
          </div>

          {/* Board Selection */}
          {jiraBoards.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Board auswählen (für Sprints)
              </label>
              <select 
                value={settings.selectedBoardId}
                onChange={(e) => {
                  const boardId = e.target.value;
                  setSettings({...settings, selectedBoardId: boardId, selectedSprint: '', selectedColumn: ''});
                  if (boardId) {
                    onLoadSprints(boardId);
                    onLoadColumns(boardId);
                  }
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Board auswählen...</option>
                {jiraBoards.map(board => (
                  <option key={board.id} value={board.id}>
                    {board.name} ({board.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sprint Selection */}
          {jiraSprints.length > 0 && settings.selectedBoardId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sprint auswählen
              </label>
              <select 
                value={settings.selectedSprint}
                onChange={(e) => setSettings({...settings, selectedSprint: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Kein Sprint</option>
                {jiraSprints.map(sprint => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name} ({sprint.state})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Tickets werden automatisch dem ausgewählten Sprint zugewiesen
              </p>
            </div>
          )}

          {/* Column Selection */}
          {jiraColumns.length > 0 && settings.selectedBoardId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Standard-Spalte
              </label>
              <select 
                value={settings.selectedColumn}
                onChange={(e) => setSettings({...settings, selectedColumn: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Standard-Status verwenden</option>
                {jiraColumns.map(column => (
                  <optgroup key={column.name} label={column.name}>
                    {column.statuses?.map(status => (
                      <option key={status.id} value={status.id}>
                        {status.name} ({status.category})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Status in dem neue Tickets erstellt werden
              </p>
            </div>
          )}

          {/* Default Labels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Standard-Labels
            </label>
            <textarea
              rows={2}
              value={settings.defaultLabels || ''}
              onChange={(e) => setSettings({...settings, defaultLabels: e.target.value})}
              placeholder="website-feedback, design-review, bug, enhancement"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Komma-getrennte Labels die automatisch zu jedem Ticket hinzugefügt werden
            </p>
          </div>

          {/* Default Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fälligkeitsdatum (Schnellauswahl)
            </label>
            <select
              value={settings.defaultDueDateDays || '7'}
              onChange={(e) => setSettings({...settings, defaultDueDateDays: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Kein Fälligkeitsdatum</option>
              <option value="1">1 Tag</option>
              <option value="3">3 Tage</option>
              <option value="7">1 Woche</option>
              <option value="14">2 Wochen</option>
              <option value="30">1 Monat</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {settings.defaultDueDateDays
                ? `Automatisch: ${settings.defaultDueDateDays} Tage ab Ticket-Erstellung`
                : 'Kein Fälligkeitsdatum gesetzt'
              }
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-2 rounded-md transition-colors ${
              isSaving 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isSaving ? 'Speichere...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

// JIRA Ticket Creation Modal Komponente
function JiraTicketModal({ 
  isOpen, 
  onClose, 
  feedback,
  jiraSettings,
  jiraProjects,
  jiraUsers = [],
  jiraBoards = [],
  isCreating,
  onCreateTicket,
  setIsCreating,
  setToast
}) {
  const [ticketData, setTicketData] = useState({
    projectKey: '',
    issueType: 'Task',
    assignee: '',
    dueDate: '',
    selectedBoardId: '',
    selectedSprint: '',
    selectedColumn: ''
  });

  const [localProjects, setLocalProjects] = useState(jiraProjects || []);
  const [localUsers, setLocalUsers] = useState(jiraUsers || []);
  const [localBoards, setLocalBoards] = useState(jiraBoards || []);
  const [localSprints, setLocalSprints] = useState([]); // Immer leer starten, wird dynamisch geladen
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Editierbarer Feedback-Text
  const [editableFeedbackText, setEditableFeedbackText] = useState(feedback?.text || '');

  // Update editableFeedbackText when feedback changes
  useEffect(() => {
    setEditableFeedbackText(feedback?.text || '');
  }, [feedback?.text]);

  // Project search states
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Filtered projects based on search term
  const filteredProjects = useMemo(() => {
    if (!projectSearchTerm) return localProjects;
    return localProjects.filter(project => 
      project.name.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
      project.key.toLowerCase().includes(projectSearchTerm.toLowerCase())
    );
  }, [localProjects, projectSearchTerm]);

  // Function to select a project
  const selectProject = (project) => {
    setTicketData(prev => ({
      ...prev, 
      projectKey: project.key, 
      selectedBoardId: '', 
      selectedSprint: '', 
      assignee: ''
    }));
    setSelectedProject(project);
    setProjectSearchTerm(project.name);
    setShowProjectDropdown(false);
    if (project.key) {
      loadProjectSpecificData(project.key);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Callback functions for data loading
  const loadProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        action: 'getProjects',
        serverUrl: jiraSettings.serverUrl,
        username: jiraSettings.username,
        apiToken: jiraSettings.apiToken
      });
      
      const response = await fetch(`/api/jira?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLocalProjects(data.projects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, [jiraSettings.serverUrl, jiraSettings.username, jiraSettings.apiToken]);

  const loadUsers = useCallback(async (projectKey = null) => {
    try {
      const params = new URLSearchParams({
        action: 'getUsers',
        serverUrl: jiraSettings.serverUrl,
        username: jiraSettings.username,
        apiToken: jiraSettings.apiToken
      });
      
      if (projectKey) {
        params.set('projectKey', projectKey);
      }
      
      const response = await fetch(`/api/jira?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLocalUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, [jiraSettings.serverUrl, jiraSettings.username, jiraSettings.apiToken]);

  const loadBoards = useCallback(async (projectKey = null) => {
    try {
      const params = new URLSearchParams({
        action: 'getBoards',
        serverUrl: jiraSettings.serverUrl,
        username: jiraSettings.username,
        apiToken: jiraSettings.apiToken
      });
      
      if (projectKey) {
        params.set('projectKey', projectKey);
      }
      
      const response = await fetch(`/api/jira?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLocalBoards(data.boards);
      }
    } catch (error) {
      console.error('Error loading boards:', error);
    }
  }, [jiraSettings.serverUrl, jiraSettings.username, jiraSettings.apiToken]);

  const loadSprintsForBoard = useCallback(async (boardId) => {
    if (!boardId) {
      setLocalSprints([]);
      return;
    }
    
    try {
      const params = new URLSearchParams({
        action: 'getSprints',
        serverUrl: jiraSettings.serverUrl,
        username: jiraSettings.username,
        apiToken: jiraSettings.apiToken,
        boardId: boardId
      });
      
      const response = await fetch(`/api/jira?${params}`);
      const data = await response.json();
      
      console.log('Sprint API Response:', data); // Debug logging
      
      if (data.success) {
        console.log('Setting sprints:', data.sprints); // Debug logging
        setLocalSprints(data.sprints);
      } else {
        console.error('Sprint API Error:', data.error);
        setLocalSprints([]);
      }
    } catch (error) {
      console.error('Error loading sprints:', error);
      setLocalSprints([]);
    }
  }, [jiraSettings.serverUrl, jiraSettings.username, jiraSettings.apiToken]);

  // Funktion zum Laden von projektspezifischen Daten
  const loadProjectSpecificData = useCallback(async (projectKey) => {
    if (!projectKey) return;
    
    setIsLoadingData(true);
    try {
      // Lade User für das spezifische Projekt
      await loadUsers(projectKey);
      
      // Lade Boards für das spezifische Projekt
      await loadBoards(projectKey);
      
      // Reset Sprint-Auswahl, da sich die Boards geändert haben könnten
      setLocalSprints([]);
      setTicketData(prev => ({
        ...prev,
        selectedBoardId: '',
        selectedSprint: '',
        assignee: ''
      }));
    } catch (error) {
      console.error('Error loading project-specific data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [loadUsers, loadBoards]);

  // Load initial data when modal opens
  useEffect(() => {
    const loadInitialData = async () => {
      if (!jiraSettings.serverUrl || !jiraSettings.username || !jiraSettings.apiToken) {
        return;
      }

      setIsLoadingData(true);
      try {
        // Load Projects
        if (localProjects.length === 0) {
          await loadProjects();
        }
        
        // Load general Users (fallback)
        if (localUsers.length === 0) {
          await loadUsers();
        }
        
        // Load general Boards (fallback)
        if (localBoards.length === 0) {
          await loadBoards();
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (isOpen && jiraSettings.serverUrl) {
      loadInitialData();
    }
  }, [isOpen, jiraSettings.serverUrl, jiraSettings.username, jiraSettings.apiToken, loadProjects, loadUsers, loadBoards, localProjects.length, localUsers.length, localBoards.length]);

  // Auto-load sprints when board is selected
  useEffect(() => {
    if (ticketData.selectedBoardId) {
      loadSprintsForBoard(ticketData.selectedBoardId);
    }
  }, [ticketData.selectedBoardId, loadSprintsForBoard]);

  if (!isOpen) return null;

  const handleCreateTicket = async () => {
    setIsCreating(true);
    
    try {
      const jiraConfig = {
        ...jiraSettings,
        ...ticketData,
        defaultAssignee: ticketData.assignee,
        defaultLabels: jiraSettings?.defaultLabels,
        defaultDueDate: ticketData.dueDate
      };
      
      // Feedback mit editiertem Text erstellen
      const feedbackWithEditedText = {
        ...feedback,
        text: editableFeedbackText
      };
      
      const result = await onCreateTicket(feedbackWithEditedText, jiraConfig);
      
      if (result.success) {
        setToast({
          type: 'success',
          message: `JIRA Ticket erfolgreich erstellt!`,
          ticketKey: result.ticket.key,
          ticketUrl: result.ticket.url
        });
        
        onClose();
      } else {
        setToast({
          type: 'error',
          message: `Fehler beim Erstellen des JIRA Tickets: ${result.error}`
        });
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: `Fehler beim Erstellen des JIRA Tickets: ${error.message}`
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              JIRA Ticket erstellen
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          {/* Feedback Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Feedback Inhalt:</h3>
            <textarea
              value={editableFeedbackText}
              onChange={(e) => setEditableFeedbackText(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical min-h-[80px]"
              placeholder="Feedback-Text eingeben..."
            />
            <div className="mt-2 text-xs text-gray-500">
              URL: {feedback.url} | Erstellt: {new Date(feedback.created_at).toLocaleString('de-DE')}
            </div>
          </div>

          <div className="space-y-4">
            {isLoadingData && (
              <div className="text-center py-4">
                <div className="text-sm text-gray-600">Lade JIRA-Daten...</div>
              </div>
            )}

            {/* Project Selection with Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projekt *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={projectSearchTerm}
                  onChange={(e) => setProjectSearchTerm(e.target.value)}
                  onFocus={() => setShowProjectDropdown(true)}
                  placeholder="Projekt suchen..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {showProjectDropdown && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                    {filteredProjects.length === 0 ? (
                      <div className="px-3 py-2 text-gray-500 text-sm">Keine Projekte gefunden</div>
                    ) : (
                      filteredProjects.map(project => (
                        <div
                          key={project.key}
                          onClick={() => selectProject(project)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium">{project.name}</div>
                          <div className="text-gray-500 text-xs">{project.key}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {ticketData.projectKey && (
                <div className="mt-1 text-xs text-green-600">
                  Ausgewählt: {selectedProject?.name} ({ticketData.projectKey})
                </div>
              )}
            </div>

            {/* Issue Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Type
              </label>
              <select 
                value={ticketData.issueType}
                onChange={(e) => setTicketData({...ticketData, issueType: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Task">Task</option>
                <option value="Bug">Bug</option>
                <option value="Story">Story</option>
                <option value="Improvement">Improvement</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zuweisen an
              </label>
              <select
                value={ticketData.assignee}
                onChange={(e) => setTicketData({...ticketData, assignee: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Nicht zuweisen</option>
                {localUsers.map(user => (
                  <option key={user.accountId} value={user.accountId}>
                    {user.displayName} ({user.emailAddress})
                  </option>
                ))}
              </select>
            </div>

            {/* Board Selection */}
            {localBoards.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Board (für Sprint-Zuweisung)
                </label>
                <select 
                  value={ticketData.selectedBoardId}
                  onChange={(e) => {
                    const boardId = e.target.value;
                    setTicketData({...ticketData, selectedBoardId: boardId, selectedSprint: ''});
                    if (!boardId) {
                      setLocalSprints([]);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Kein Board</option>
                  {localBoards
                    .filter(board => !ticketData.projectKey || board.projectKey === ticketData.projectKey)
                    .map(board => (
                    <option key={board.id} value={board.id}>
                      {board.name} ({board.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sprint Selection */}
            {localSprints.length > 0 && ticketData.selectedBoardId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sprint
                </label>
                <select 
                  value={ticketData.selectedSprint}
                  onChange={(e) => setTicketData({...ticketData, selectedSprint: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Kein Sprint</option>
                  {localSprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name} ({sprint.state})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Labels (from settings) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Labels (aus Standardeinstellungen)
              </label>
              <div className="bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700">
                {jiraSettings?.defaultLabels || 'Keine Labels definiert'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Labels werden aus den Standardeinstellungen übernommen
              </p>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fälligkeitsdatum
              </label>
              <input
                type="date"
                value={ticketData.dueDate}
                onChange={(e) => setTicketData({...ticketData, dueDate: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isCreating}
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreateTicket}
              disabled={isCreating || !ticketData.projectKey}
              className={`px-4 py-2 text-white rounded-md transition-colors ${
                isCreating || !ticketData.projectKey
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isCreating ? 'Erstelle Ticket...' : 'Ticket erstellen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
