import React from 'react';

const GooglePreview = ({ title, description, url, siteName, favicon }) => {
    // Truncate title at ~60 chars, description at ~160 chars
    const truncatedTitle = title && title.length > 60 ? title.substring(0, 57) + '...' : title;
    const truncatedDesc = description && description.length > 160 ? description.substring(0, 157) + '...' : description;

    // Extract domain parts
    let fullUrl = url || '';
    if (!fullUrl.startsWith('http')) {
        fullUrl = 'https://' + fullUrl;
    }

    let domain = '';
    let displaySiteName = siteName || '';
    try {
        const urlObj = new URL(fullUrl);
        domain = urlObj.hostname;
        // If no site name provided, create one from domain
        if (!displaySiteName) {
            displaySiteName = domain
                .replace(/^www\./, '')
                .split('.')[0]
                .charAt(0).toUpperCase() + domain.replace(/^www\./, '').split('.')[0].slice(1);
        }
    } catch {
        domain = fullUrl.replace(/^(?:https?:\/\/)?/i, '').split('/')[0];
        if (!displaySiteName) {
            displaySiteName = domain.split('.')[0];
        }
    }

    return (
        <div className="flex flex-col gap-2" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-sm font-medium text-gray-600">Google Vorschau</span>
            </div>

            {/* Google Search Result Card */}
            <div className="max-w-[600px]">
                {/* Site info row: Favicon + Site Name */}
                <div className="flex items-center gap-3 mb-1">
                    {/* Favicon - only show if available */}
                    {favicon && (
                        <img
                            src={favicon}
                            alt=""
                            className="w-7 h-7 rounded-full bg-gray-100 object-contain"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    )}

                    {/* Site name and URL */}
                    <div className="flex flex-col">
                        <span className="text-sm text-[#202124] leading-tight">{displaySiteName}</span>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-[#4d5156]">{fullUrl}</span>
                            <span className="text-[#70757a] text-lg leading-none ml-1">⋮</span>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h3
                    className="text-xl leading-tight cursor-pointer hover:underline"
                    style={{ color: '#1a0dab', fontFamily: 'Arial, sans-serif' }}
                >
                    {truncatedTitle || 'Kein Titel gefunden'}
                </h3>

                {/* Description */}
                <p
                    className="text-sm mt-1 leading-relaxed"
                    style={{ color: '#4d5156', lineHeight: '1.58' }}
                >
                    {truncatedDesc || 'Keine Beschreibung verfügbar.'}
                </p>
            </div>
        </div>
    );
};

const GoogleMobilePreview = ({ title, description, url }) => {
    // Mobile truncation: title ~55 chars, description ~120 chars
    const truncatedTitle = title && title.length > 55 ? title.substring(0, 52) + '...' : title;
    const truncatedDesc = description && description.length > 120 ? description.substring(0, 117) + '...' : description;

    // Extract domain for breadcrumb display
    let domain = '';
    let pathname = '';
    try {
        const urlObj = new URL(url?.startsWith('http') ? url : `https://${url}`);
        domain = urlObj.hostname;
        pathname = urlObj.pathname;
    } catch {
        domain = url?.replace(/^(?:https?:\/\/)?/i, '').split('/')[0] || '';
    }

    // Create breadcrumb path: "www.domain.ch › ... › Page"
    const pathParts = pathname.split('/').filter(Boolean);
    let breadcrumb = domain;
    if (pathParts.length > 0) {
        if (pathParts.length > 2) {
            breadcrumb += ' › ... › ' + pathParts[pathParts.length - 1];
        } else if (pathParts.length > 0) {
            breadcrumb += ' › ' + pathParts.join(' › ');
        }
    }

    return (
        <div className="flex flex-col gap-2" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-sm font-medium text-gray-600">Google Mobile Vorschau</span>
            </div>

            {/* Mobile Phone Frame */}
            <div className="relative mx-auto" style={{ width: '320px' }}>
                {/* Phone bezel */}
                <div className="bg-gray-800 rounded-[2.5rem] p-2 shadow-xl">
                    {/* Screen */}
                    <div className="bg-white rounded-[2rem] overflow-hidden">
                        {/* Status bar */}
                        <div className="bg-gray-100 px-6 py-2 flex justify-between items-center text-xs text-gray-600">
                            <span>9:41</span>
                            <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z"/>
                                </svg>
                            </div>
                        </div>

                        {/* Content area */}
                        <div className="px-4 py-4 min-h-[200px]">
                            {/* Breadcrumb URL */}
                            <div className="text-sm text-[#202124] mb-1">
                                {breadcrumb}
                            </div>

                            {/* Title */}
                            <h3
                                className="text-lg leading-snug cursor-pointer"
                                style={{ color: '#1a0dab', fontFamily: 'Arial, sans-serif' }}
                            >
                                {truncatedTitle || 'Kein Titel gefunden'}
                            </h3>

                            {/* Description */}
                            <p
                                className="text-sm mt-2 leading-relaxed"
                                style={{ color: '#4d5156', lineHeight: '1.5' }}
                            >
                                {truncatedDesc || 'Keine Beschreibung verfügbar.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gray-600 rounded-full"></div>
            </div>
        </div>
    );
};

const SocialPreview = ({ ogData, twitterData, projectUrl, basicData, favicon }) => {
  // Use basic meta data as fallback if no OG data
  const title = ogData?.title || basicData?.title || 'Titel nicht gefunden';
  const description = ogData?.description || basicData?.description || 'Beschreibung nicht gefunden.';
  const siteName = ogData?.site_name || ogData?.siteName || '';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Suchmaschinen Vorschau</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Desktop Preview */}
        <GooglePreview
          title={title}
          description={description}
          url={projectUrl}
          siteName={siteName}
          favicon={favicon}
        />

        {/* Mobile Preview */}
        <GoogleMobilePreview
          title={title}
          description={description}
          url={projectUrl}
        />
      </div>
    </div>
  );
};

export default SocialPreview;
