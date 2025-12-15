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

const WhatsAppPreview = ({ title, description, image, url, favicon }) => {
    let domain = '';
    try {
        const urlObj = new URL(url?.startsWith('http') ? url : `https://${url}`);
        domain = urlObj.hostname.replace(/^www\./, '');
    } catch {
        domain = url?.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0] || '';
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="text-sm font-medium text-gray-600">WhatsApp Vorschau</span>
            </div>

            <div className="w-[230px] rounded-lg overflow-hidden bg-[#dcf8c6] shadow-sm">
                {/* Image with green border */}
                <div className="p-1">
                    {image ? (
                        <div className="w-full aspect-[1.5/1] bg-gray-200 overflow-hidden rounded border border-[#b8e0a0]">
                            <img
                                src={image}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>
                    ) : (
                        <div className="w-full aspect-[1.5/1] bg-gray-200 flex items-center justify-center text-gray-400 text-sm rounded border border-[#b8e0a0]">
                            Kein Bild
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-3">
                    <div className="text-[15px] font-semibold text-[#000000] leading-tight">
                        {title || 'Kein Titel gefunden'}
                    </div>
                    {description && (
                        <div className="text-[14px] text-[#667781] mt-1 leading-snug line-clamp-2">
                            {description}
                        </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5 text-[13px] text-[#000000]">
                            <svg className="w-3.5 h-3.5 text-[#667781]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <span>{domain}</span>
                        </div>
                        {favicon && (
                            <img
                                src={favicon}
                                alt=""
                                className="w-5 h-5 rounded object-contain"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const LinkedInPreview = ({ title, image, url }) => {
    let domain = '';
    try {
        const urlObj = new URL(url?.startsWith('http') ? url : `https://${url}`);
        domain = urlObj.hostname.replace(/^www\./, '');
    } catch {
        domain = url?.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0] || '';
    }

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0A66C2">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="text-sm font-medium text-gray-600">LinkedIn Vorschau</span>
            </div>

            <div className="w-full rounded-lg overflow-hidden border border-gray-300 bg-white h-[98px]">
                <div className="flex h-full">
                    {/* Image with padding */}
                    <div className="p-3 flex-shrink-0">
                        {image ? (
                            <div className="w-[127px] h-[70px] bg-gray-200 overflow-hidden rounded">
                                <img
                                    src={image}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="w-[127px] h-[70px] bg-gray-200 flex items-center justify-center text-gray-400 text-xs rounded">
                                Kein Bild
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 py-3 pr-3 flex flex-col justify-center">
                        <div className="text-[14px] font-semibold text-[#000000e6] leading-tight">
                            {title || 'Kein Titel gefunden'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {domain || 'Domain nicht gefunden'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FacebookPreview = ({ title, image, url }) => {
    let domain = '';
    try {
        const urlObj = new URL(url?.startsWith('http') ? url : `https://${url}`);
        domain = urlObj.hostname.replace(/^www\./, '').toUpperCase();
    } catch {
        domain = url?.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0]?.toUpperCase() || '';
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-sm font-medium text-gray-600">Facebook Vorschau</span>
            </div>

            <div className="max-w-[500px] rounded-lg overflow-hidden border border-gray-300 bg-[#f0f2f5]">
                {/* Image */}
                {image ? (
                    <div className="w-full aspect-[1.91/1] bg-gray-200 overflow-hidden">
                        <img
                            src={image}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">Kein Bild verfügbar</div>';
                            }}
                        />
                    </div>
                ) : (
                    <div className="w-full aspect-[1.91/1] bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                        Kein og:image gefunden
                    </div>
                )}

                {/* Content */}
                <div className="bg-[#e4e6eb] px-3 py-2">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                        {domain || 'Domain nicht gefunden'}
                    </div>
                    <div className="text-[15px] font-medium text-[#1c1e21] leading-tight mt-0.5">
                        {title || 'Kein Titel gefunden'}
                    </div>
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
    const ogImage = ogData?.image || null;

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

                <FacebookPreview
                    title={title}
                    image={ogImage}
                    url={projectUrl}
                />

                <WhatsAppPreview
                    title={title}
                    description={description}
                    image={ogImage}
                    url={projectUrl}
                    favicon={favicon}
                />

                <LinkedInPreview
                    title={title}
                    image={ogImage}
                    url={projectUrl}
                />
            </div>
        </div>
    );
};

export default SocialPreview;
