// Analysis Cache Management
// Implements stale-while-revalidate pattern with localStorage caching

const CACHE_PREFIX = 'analysis_cache_';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get cache key for a specific analysis type and project
 */
function getCacheKey(analysisType, projectId, url = null) {
  const key = url ? `${analysisType}_${projectId}_${url}` : `${analysisType}_${projectId}`;
  return `${CACHE_PREFIX}${key}`;
}

/**
 * Get cached data for an analysis
 * @returns {Object|null} Cached data with metadata or null if not found/expired
 */
export function getCachedAnalysis(analysisType, projectId, url = null) {
  if (typeof window === 'undefined') return null;

  try {
    const cacheKey = getCacheKey(analysisType, projectId, url);
    const cachedItem = localStorage.getItem(cacheKey);

    if (!cachedItem) return null;

    const { data, timestamp, staleAt } = JSON.parse(cachedItem);
    const now = Date.now();

    // Check if data exists
    if (!data) return null;

    return {
      data,
      timestamp,
      isStale: now > staleAt,
      isFresh: now <= staleAt
    };
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Set cached data for an analysis
 */
export function setCachedAnalysis(analysisType, projectId, data, url = null) {
  if (typeof window === 'undefined') return;

  try {
    const cacheKey = getCacheKey(analysisType, projectId, url);
    const timestamp = Date.now();
    const staleAt = timestamp + CACHE_TTL;

    const cacheItem = {
      data,
      timestamp,
      staleAt
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('Error writing to cache:', error);
    // If localStorage is full or unavailable, fail silently
  }
}

/**
 * Clear cached data for a specific analysis
 */
export function clearCachedAnalysis(analysisType, projectId, url = null) {
  if (typeof window === 'undefined') return;

  try {
    const cacheKey = getCacheKey(analysisType, projectId, url);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clear all cached analyses for a project
 */
export function clearAllCachedAnalyses(projectId) {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove = [];

    // Find all keys for this project
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX) && key.includes(`_${projectId}_`)) {
        keysToRemove.push(key);
      }
    }

    // Remove all found keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing all caches:', error);
  }
}

/**
 * Check if cached data needs refresh (stale)
 */
export function needsRefresh(analysisType, projectId, url = null) {
  const cached = getCachedAnalysis(analysisType, projectId, url);

  if (!cached) return true; // No cache = needs refresh
  return cached.isStale; // Stale = needs refresh
}

/**
 * Get timestamp of last analysis update
 */
export function getLastUpdateTimestamp(analysisType, projectId, url = null) {
  const cached = getCachedAnalysis(analysisType, projectId, url);
  return cached ? cached.timestamp : null;
}

/**
 * Clean up old/expired cache entries
 */
export function cleanupExpiredCache() {
  if (typeof window === 'undefined') return;

  try {
    const now = Date.now();
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          // Remove if older than 7 days
          if (now - item.timestamp > 7 * 24 * 60 * 60 * 1000) {
            keysToRemove.push(key);
          }
        } catch {
          // Invalid JSON, remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error cleaning up cache:', error);
  }
}

// Run cleanup on module load (only in browser)
if (typeof window !== 'undefined') {
  cleanupExpiredCache();
}
