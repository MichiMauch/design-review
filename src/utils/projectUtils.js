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
    // ISO format with timezone (e.g., "2025-08-29T12:53:20+02:00")
    date = new Date(dateString);
  } else {
    // SQLite datetime format (e.g., "2025-08-29 10:43:38") - treat as local time
    // JavaScript interprets "YYYY-MM-DD HH:mm:ss" as UTC, but we need local time
    // Solution: Add timezone offset to compensate
    const tempDate = new Date(dateString.replace(' ', 'T'));
    const timezoneOffset = tempDate.getTimezoneOffset() * 60000; // in milliseconds
    date = new Date(tempDate.getTime() - timezoneOffset);
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
    // For older dates, show in local timezone
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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