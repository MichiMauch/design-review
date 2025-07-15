// Utility functions for screenshot handling

/**
 * Constructs a full R2 URL from a filename
 */
export function getScreenshotUrlFromFilename(filename) {
  if (!filename) return null;
  
  // If it's already a full URL, return as-is
  if (filename.startsWith('http')) {
    return filename;
  }
  
  // If it's a data URL, return as-is (base64)
  if (filename.startsWith('data:')) {
    return filename;
  }
  
  // Construct R2 URL from filename
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'cac1d67ee1dc4cb6814dff593983d703';
  return `https://pub-${accountId}.r2.dev/screenshots/${filename}`;
}

/**
 * Extracts filename from R2 URL
 */
export function getFilenameFromR2Url(url) {
  if (!url || !url.includes('screenshots/')) return url;
  
  const parts = url.split('screenshots/');
  return parts[1] || url;
}

/**
 * Determines the type of screenshot data
 */
export function getScreenshotType(screenshot) {
  if (!screenshot) return 'none';
  if (screenshot.startsWith('data:')) return 'base64';
  if (screenshot.startsWith('http')) return 'url';
  if (screenshot.includes('.png') || screenshot.includes('.jpg') || screenshot.includes('.jpeg')) return 'filename';
  return 'unknown';
}
