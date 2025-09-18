import { TASK_STATUSES } from '../constants/taskStatuses';

/**
 * Format a date string to a human-readable relative time
 * @param {string} dateString - Date string from database
 * @returns {string} Formatted time string
 */
export const formatTime = (dateString) => {
  if (!dateString) return 'Unbekannt';

  // Handle different date formats from database
  let date;
  if (dateString.includes('T')) {
    // ISO format with timezone or Z (UTC)
    date = new Date(dateString);
  } else {
    // SQLite format without timezone: interpret as UTC to unify storage
    // Convert to ISO by adding 'T' and 'Z'
    const iso = dateString.replace(' ', 'T') + 'Z';
    date = new Date(iso);
  }

  // Verify date is valid
  if (isNaN(date.getTime())) {
    return 'Ungültige Zeit';
  }

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Debug logging removed for cleaner console

  if (diffMs < 60000) { // Less than 1 minute
    return 'Gerade eben';
  } else if (diffMins < 60) {
    return `vor ${diffMins} Min`;
  } else if (diffHours < 24) {
    return `vor ${diffHours} Std`;
  } else if (diffDays < 7) {
    return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
  } else {
    // For older dates, show in Europe/Zurich regardless of browser TZ
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Zurich'
    });
  }
};

/**
 * Get status information object by status value
 * @param {string} statusValue - Status value (e.g., 'open', 'done')
 * @returns {object} Status info object with value, label, and color
 */
export const getStatusInfo = (statusValue) => {
  return TASK_STATUSES.find(status => status.value === statusValue) || TASK_STATUSES[0];
};

/**
 * Create a readable, single-line URL representation that preserves
 * the hostname and the last path segment, collapsing the middle.
 * Example: example.com/…/checkout?…
 */
export const formatUrlDisplay = (urlString, maxLength = 60) => {
  try {
    const u = new URL(urlString);
    const host = u.host;
    const segments = (u.pathname || '/').split('/').filter(Boolean);
    const last = segments.length ? segments[segments.length - 1] : '';

    // Base display: host + /…/ + last segment
    let display = host;
    if (last) {
      display += (segments.length > 1 ? '/…/' : '/') + last;
    }

    // Indicate query/hash presence without long noise
    if (u.search) display += '?…';
    if (u.hash) display += '#…';

    if (display.length <= maxLength) return display;

    // If still too long, ellipsize the middle conservatively
    const keep = Math.max(10, Math.floor((maxLength - 1) / 2));
    return display.slice(0, keep) + '…' + display.slice(-keep);
  } catch {
    // Fallback for invalid URLs
    if (!urlString) return '';
    return urlString.length > maxLength
      ? urlString.slice(0, Math.max(0, maxLength - 1)) + '…'
      : urlString;
  }
};
