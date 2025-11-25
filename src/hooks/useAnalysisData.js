import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCachedAnalysis,
  setCachedAnalysis,
  needsRefresh,
  clearAllCachedAnalyses
} from '@/lib/analysisCache';

/**
 * Custom hook to load and cache analysis data with background refresh
 */
export function useAnalysisData(projectId, projectUrl) {
  const [analyses, setAnalyses] = useState({
    seo: { data: null, isLoading: true, error: null, lastUpdated: null },
    performance: { data: null, isLoading: true, error: null, lastUpdated: null },
    media: { data: null, isLoading: true, error: null, lastUpdated: null },
    icons: { data: null, isLoading: true, error: null, lastUpdated: null },
    metatags: { data: null, isLoading: true, error: null, lastUpdated: null }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  /**
   * Fetch analysis data from API
   */
  const fetchAnalysis = useCallback(async (type, silent = false) => {
    if (!projectUrl) return null;

    try {
      const endpoints = {
        seo: `/api/analysis/seo?url=${encodeURIComponent(projectUrl)}`,
        performance: `/api/projects/${projectId}/performance?url=${encodeURIComponent(projectUrl)}`,
        media: `/api/analysis/media?url=${encodeURIComponent(projectUrl)}`,
        icons: `/api/projects/${projectId}/icons-analysis?url=${encodeURIComponent(projectUrl)}`,
        metatags: `/api/projects/${projectId}/meta-tags-analysis?url=${encodeURIComponent(projectUrl)}`
      };

      const response = await fetch(endpoints[type]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching ${type} analysis:`, error);
      throw error;
    }
  }, [projectId, projectUrl]);

  /**
   * Load analysis data (with cache)
   */
  const loadAnalysis = useCallback(async (type, forceRefresh = false) => {
    if (!projectUrl || !isMountedRef.current) return;

    // Check cache first
    if (!forceRefresh) {
      const cached = getCachedAnalysis(type, projectId, projectUrl);
      if (cached) {
        setAnalyses(prev => ({
          ...prev,
          [type]: {
            data: cached.data,
            isLoading: false,
            error: null,
            lastUpdated: cached.timestamp
          }
        }));

        // If cached data is stale, refresh in background
        if (cached.isStale) {
          setTimeout(() => loadAnalysis(type, true), 100);
        }

        return;
      }
    }

    // Set loading state (only if not silent refresh)
    if (!forceRefresh) {
      setAnalyses(prev => ({
        ...prev,
        [type]: { ...prev[type], isLoading: true, error: null }
      }));
    }

    try {
      const data = await fetchAnalysis(type);

      if (!isMountedRef.current) return;

      // Cache the data
      setCachedAnalysis(type, projectId, data, projectUrl);

      // Update state
      setAnalyses(prev => ({
        ...prev,
        [type]: {
          data,
          isLoading: false,
          error: null,
          lastUpdated: Date.now()
        }
      }));
    } catch (error) {
      if (!isMountedRef.current) return;

      setAnalyses(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          isLoading: false,
          error: error.message || 'Fehler beim Laden der Analyse'
        }
      }));
    }
  }, [projectId, projectUrl, fetchAnalysis]);

  /**
   * Load all analyses
   */
  const loadAllAnalyses = useCallback(async (forceRefresh = false) => {
    if (!projectUrl) return;

    setIsRefreshing(forceRefresh);

    const types = ['seo', 'performance', 'media', 'icons', 'metatags'];

    // Load all analyses in parallel
    await Promise.all(types.map(type => loadAnalysis(type, forceRefresh)));

    setIsRefreshing(false);
  }, [projectUrl, loadAnalysis]);

  /**
   * Manual refresh all analyses
   */
  const refreshAll = useCallback(() => {
    clearAllCachedAnalyses(projectId);
    loadAllAnalyses(true);
  }, [projectId, loadAllAnalyses]);

  /**
   * Initial load and background refresh setup
   */
  useEffect(() => {
    if (!projectUrl) return;

    // Initial load
    loadAllAnalyses(false);

    // Set up periodic background refresh (every 5 minutes)
    refreshTimeoutRef.current = setInterval(() => {
      // Only refresh if any analysis needs refresh
      const types = ['seo', 'performance', 'media', 'icons', 'metatags'];
      const needsUpdate = types.some(type =>
        needsRefresh(type, projectId, projectUrl)
      );

      if (needsUpdate) {
        loadAllAnalyses(true);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, [projectId, projectUrl, loadAllAnalyses]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    analyses,
    isRefreshing,
    refreshAll,
    loadAnalysis
  };
}
