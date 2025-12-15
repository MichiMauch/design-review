import React from 'react';

// Single search result component for desktop
const SearchResult = ({ title, description, url, siteName, favicon }) => {
    const truncatedTitle = title && title.length > 60 ? title.substring(0, 57) + '...' : title;
    const truncatedDesc = description && description.length > 160 ? description.substring(0, 157) + '...' : description;

    let fullUrl = url || '';
    if (!fullUrl.startsWith('http')) {
        fullUrl = 'https://' + fullUrl;
    }
    const truncatedUrl = fullUrl.length > 56 ? fullUrl.substring(0, 53) + '...' : fullUrl;

    let domain = '';
    let displaySiteName = siteName || '';
    try {
        const urlObj = new URL(fullUrl);
        domain = urlObj.hostname;
        if (!displaySiteName) {
            displaySiteName = domain.replace(/^www\./, '').split('.')[0];
            displaySiteName = displaySiteName.charAt(0).toUpperCase() + displaySiteName.slice(1);
        }
    } catch {
        domain = fullUrl.replace(/^(?:https?:\/\/)?/i, '').split('/')[0];
        if (!displaySiteName) {
            displaySiteName = domain.split('.')[0];
        }
    }

    return (
        <div className="py-4">
            <div className="flex items-center gap-3 mb-1">
                {favicon ? (
                    <img
                        src={favicon}
                        alt=""
                        className="w-7 h-7 rounded-full bg-gray-100 object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                        {displaySiteName.charAt(0)}
                    </div>
                )}
                <div className="flex flex-col">
                    <span className="text-sm text-[#202124] leading-tight">{displaySiteName}</span>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-[#4d5156]">{truncatedUrl}</span>
                        <span className="text-[#70757a] text-lg leading-none ml-1">⋮</span>
                    </div>
                </div>
            </div>
            <h3 className="text-xl leading-tight cursor-pointer hover:underline" style={{ color: '#1a0dab' }}>
                {truncatedTitle || 'Kein Titel gefunden'}
            </h3>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: '#4d5156', lineHeight: '1.58' }}>
                {truncatedDesc || 'Keine Beschreibung verfügbar.'}
            </p>
        </div>
    );
};

// Single search result component for mobile
const MobileSearchResult = ({ title, description, url }) => {
    const truncatedTitle = title && title.length > 55 ? title.substring(0, 52) + '...' : title;
    const truncatedDesc = description && description.length > 120 ? description.substring(0, 117) + '...' : description;

    let domain = '';
    let pathname = '';
    try {
        const urlObj = new URL(url?.startsWith('http') ? url : `https://${url}`);
        domain = urlObj.hostname;
        pathname = urlObj.pathname;
    } catch {
        domain = url?.replace(/^(?:https?:\/\/)?/i, '').split('/')[0] || '';
    }

    const pathParts = pathname.split('/').filter(Boolean);
    let breadcrumb = domain;
    if (pathParts.length > 2) {
        breadcrumb += ' › ... › ' + pathParts[pathParts.length - 1];
    } else if (pathParts.length > 0) {
        breadcrumb += ' › ' + pathParts.join(' › ');
    }

    return (
        <div className="py-3">
            <div className="text-sm text-[#202124] mb-1">{breadcrumb}</div>
            <h3 className="text-base leading-snug" style={{ color: '#1a0dab' }}>
                {truncatedTitle || 'Kein Titel gefunden'}
            </h3>
            <p className="text-sm mt-1" style={{ color: '#4d5156', lineHeight: '1.5' }}>
                {truncatedDesc || 'Keine Beschreibung verfügbar.'}
            </p>
        </div>
    );
};

const GooglePreview = ({ title, description, url, siteName, favicon, goodExample, badExample }) => {
    return (
        <div className="flex flex-col gap-2" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-sm font-medium text-gray-600">Google Desktop Vorschau</span>
            </div>

            <div className="max-w-[590px] rounded-lg shadow-lg overflow-hidden border border-gray-300">
                {/* Browser Chrome */}
                <div className="bg-gray-100 px-4 py-2 flex items-center gap-3 border-b border-gray-300">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500 flex items-center gap-2">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>google.com/search</span>
                    </div>
                </div>

                {/* Search Results */}
                <div className="bg-white p-4 divide-y divide-gray-100">
                    {/* Current Page - First */}
                    <SearchResult
                        title={title}
                        description={description}
                        url={url}
                        siteName={siteName}
                        favicon={favicon}
                    />

                    {/* Good Example */}
                    <SearchResult
                        title={goodExample.title}
                        description={goodExample.description}
                        url={goodExample.url}
                        siteName={goodExample.siteName}
                    />

                    {/* Bad Example */}
                    <SearchResult
                        title={badExample.title}
                        description={badExample.description}
                        url={badExample.url}
                        siteName={badExample.siteName}
                    />
                </div>
            </div>
        </div>
    );
};

const GoogleMobilePreview = ({ title, description, url, goodExample, badExample }) => {
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

            <div className="relative mx-auto" style={{ width: '320px' }}>
                <div className="bg-gray-800 rounded-[2.5rem] p-2 shadow-xl">
                    <div className="bg-white rounded-[2rem] overflow-hidden">
                        {/* Status bar */}
                        <div className="bg-gray-100 px-6 py-2 flex justify-between items-center text-xs text-gray-600">
                            <span>9:41</span>
                            <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M2 17h20v2H2v-2zm1.15-4.05L4 11.47l.85 1.48 1.3-.75-.85-1.48H7v-1.5H5.3l.85-1.47L4.85 7 4 8.47 3.15 7l-1.3.75.85 1.47H1v1.5h1.7l-.85 1.48 1.3.75zm6.7-.75l1.3.75.85-1.48.85 1.48 1.3-.75-.85-1.48H15v-1.5h-1.7l.85-1.47-1.3-.75-.85 1.47-.85-1.47-1.3.75.85 1.47H9v1.5h1.7l-.85 1.48zm7.85 0l1.3.75.85-1.48.85 1.48 1.3-.75-.85-1.48H22v-1.5h-1.7l.85-1.47-1.3-.75-.85 1.47-.85-1.47-1.3.75.85 1.47H16v1.5h1.7l-.85 1.48z"/>
                                </svg>
                            </div>
                        </div>

                        {/* Search Results */}
                        <div className="px-4 py-2 divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                            {/* Current Page - First */}
                            <MobileSearchResult
                                title={title}
                                description={description}
                                url={url}
                            />

                            {/* Good Example */}
                            <MobileSearchResult
                                title={goodExample.title}
                                description={goodExample.description}
                                url={goodExample.url}
                            />

                            {/* Bad Example */}
                            <MobileSearchResult
                                title={badExample.title}
                                description={badExample.description}
                                url={badExample.url}
                            />
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gray-600 rounded-full"></div>
            </div>
        </div>
    );
};

const SocialPreview = ({ ogData, twitterData, projectUrl, basicData, favicon }) => {
    const title = ogData?.title || basicData?.title || 'Titel nicht gefunden';
    const description = ogData?.description || basicData?.description || 'Beschreibung nicht gefunden.';
    const siteName = ogData?.site_name || ogData?.siteName || '';

    // Example data
    const goodExample = {
        title: 'Veranstaltungen im Kanton Zug - Kultur & Events',
        description: 'Entdecken Sie aktuelle Events, Konzerte und Highlights im Kanton Zug. Der Veranstaltungskalender bietet Ihnen alle kulturellen Termine auf einen Blick.',
        url: 'https://www.zug-tourismus.ch/veranstaltungen',
        siteName: 'Zug Tourismus'
    };

    const badExample = {
        title: 'Dies ist ein viel zu langer Seitentitel der definitiv von Google in den Suchergebnissen abgeschnitten wird weil er viel mehr als sechzig Zeichen enthält',
        description: 'Diese Meta-Beschreibung ist viel zu lang und wird von Google abgeschnitten werden. Der Text geht einfach immer weiter und weiter, obwohl niemand so viel lesen möchte. Google zeigt nur die ersten 160 Zeichen an, alles andere wird ignoriert und durch drei Punkte ersetzt. Das ist nicht gut für SEO.',
        url: 'https://www.beispiel-mit-langem-domain-namen.ch/sehr/langer/pfad/zur/seite',
        siteName: 'Beispiel Website'
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Suchmaschinen Vorschau</h3>
            <p className="text-xs text-gray-500 mb-4">
                So erscheint Ihre Seite in Google-Suchergebnissen im Vergleich zu optimalen und zu langen Texten.
            </p>

            <div className="flex flex-row flex-wrap gap-8">
                <GooglePreview
                    title={title}
                    description={description}
                    url={projectUrl}
                    siteName={siteName}
                    favicon={favicon}
                    goodExample={goodExample}
                    badExample={badExample}
                />

                <GoogleMobilePreview
                    title={title}
                    description={description}
                    url={projectUrl}
                    goodExample={goodExample}
                    badExample={badExample}
                />
            </div>
        </div>
    );
};

export default SocialPreview;
