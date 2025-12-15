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

            {/* Browser Window Frame */}
            <div className="max-w-[600px] rounded-lg shadow-lg overflow-hidden border border-gray-300">
                {/* Browser Chrome */}
                <div className="bg-gray-100 px-4 py-2 flex items-center gap-3 border-b border-gray-300">
                    {/* Traffic lights */}
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    {/* URL bar */}
                    <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500 flex items-center gap-2">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                        </svg>
                        <span>google.com/search</span>
                    </div>
                </div>

                {/* Browser Content */}
                <div className="bg-white p-4">
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

// Mini preview for examples
const ExamplePreview = ({ title, description, isGood }) => {
    const borderColor = isGood ? 'border-green-400' : 'border-red-400';
    const bgColor = isGood ? 'bg-green-50' : 'bg-red-50';
    const labelBg = isGood ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    const label = isGood ? 'Optimal' : 'Zu lang';

    // Apply same truncation rules as Google
    const truncatedTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
    const truncatedDesc = description.length > 160 ? description.substring(0, 157) + '...' : description;

    return (
        <div className={`rounded-lg border-2 ${borderColor} ${bgColor} p-3`}>
            <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${labelBg}`}>
                    {label}
                </span>
                <span className="text-xs text-gray-500">
                    Titel: {title.length} / Description: {description.length} Zeichen
                </span>
            </div>
            <div className="bg-white rounded p-2">
                <div className="text-xs text-gray-500 mb-1">www.beispiel.ch</div>
                <div className="text-sm font-medium" style={{ color: '#1a0dab' }}>
                    {truncatedTitle}
                </div>
                <div className="text-xs mt-1" style={{ color: '#4d5156' }}>
                    {truncatedDesc}
                </div>
            </div>
        </div>
    );
};

const SocialPreview = ({ ogData, twitterData, projectUrl, basicData, favicon }) => {
  // Use basic meta data as fallback if no OG data
  const title = ogData?.title || basicData?.title || 'Titel nicht gefunden';
  const description = ogData?.description || basicData?.description || 'Beschreibung nicht gefunden.';
  const siteName = ogData?.site_name || ogData?.siteName || '';

  // Example texts
  const goodTitle = 'Beispiel Website - Optimale Titellänge hier';  // 46 chars
  const goodDesc = 'Dies ist eine optimale Meta-Beschreibung mit der richtigen Länge. Sie enthält alle wichtigen Informationen und wird vollständig in Google angezeigt.';  // 156 chars

  const badTitle = 'Dies ist ein viel zu langer Titel der definitiv von Google abgeschnitten wird weil er mehr als sechzig Zeichen enthält';  // 116 chars
  const badDesc = 'Diese Meta-Beschreibung ist viel zu lang und wird von Google abgeschnitten werden. Der Text geht einfach immer weiter und weiter, obwohl niemand so viel lesen möchte. Google zeigt nur die ersten 160 Zeichen an, alles andere wird ignoriert und durch drei Punkte ersetzt.';  // 270 chars

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Suchmaschinen Vorschau</h3>

      {/* Example Previews */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Beispiele: Optimale vs. zu lange Texte</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExamplePreview title={goodTitle} description={goodDesc} isGood={true} />
          <ExamplePreview title={badTitle} description={badDesc} isGood={false} />
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Google empfiehlt: Titel 50-60 Zeichen, Description 150-160 Zeichen
        </p>
      </div>

      {/* Actual Previews */}
      <h4 className="text-sm font-medium text-gray-700 mb-3">Ihre aktuelle Vorschau</h4>
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
