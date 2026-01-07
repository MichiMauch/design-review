import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

export async function GET(request) {
  try {
    // Get URL from query parameters
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Ensure URL is properly formatted
    const projectUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;

    // Fetch the page HTML
    let html;
    try {
      const response = await fetch(projectUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Media-Analyzer/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'de,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      html = await response.text();
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: `Unable to fetch URL: ${fetchError.message}` },
        { status: 400 }
      );
    }

    // Parse HTML with JSDOM
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Initialize analysis object
    const analysis = {
      url: projectUrl,
      timestamp: new Date().toISOString(),
      score: 0,
      summary: '',
      images: {
        total: 0,
        formats: {},
        sizes: [],
        withAlt: 0,
        missingAlt: 0,
        imagesWithoutAlt: [],
        lazy: 0,
        responsive: 0,
        webp: 0,
        avif: 0,
        issues: []
      },
      videos: {
        total: 0,
        formats: {},
        withPoster: 0,
        autoplay: 0,
        muted: 0,
        lazy: 0,
        issues: []
      },
      fonts: {
        total: 0,
        formats: {},
        preloaded: 0,
        displaySwap: 0,
        external: 0,
        issues: []
      },
      icons: {
        total: 0,
        svg: 0,
        iconFont: 0,
        sprites: 0,
        issues: []
      },
      resourceHints: {
        preload: 0,
        prefetch: 0,
        preconnect: 0,
        dnsPrefetch: 0,
        issues: []
      },
      recommendations: []
    };

    // Helper function to extract image format from URL
    const getImageFormat = (url) => {
      if (!url) return null;

      // Handle Next.js Image Optimization URLs (/_next/image?url=...)
      if (url.includes('/_next/image')) {
        try {
          const urlObj = new URL(url, projectUrl);
          const originalUrl = urlObj.searchParams.get('url');
          if (originalUrl) {
            // Decode and extract extension from original URL
            const decodedUrl = decodeURIComponent(originalUrl);
            const match = decodedUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
            if (match) return match[1].toLowerCase();
          }
        } catch {
          // Fall through to default extraction
        }
      }

      // Handle URLs with query parameters
      try {
        const urlObj = new URL(url, projectUrl);
        const pathname = urlObj.pathname;
        const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
        if (match) return match[1].toLowerCase();
      } catch {
        // Fall through to simple extraction
      }

      // Simple extraction for relative URLs
      const cleanUrl = url.split('?')[0].split('#')[0];
      const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
      return match ? match[1].toLowerCase() : null;
    };

    // Analyze Images
    const images = document.querySelectorAll('img');
    analysis.images.total = images.length;

    // Also check for <picture> elements with WebP/AVIF sources
    const pictureElements = document.querySelectorAll('picture');
    pictureElements.forEach(picture => {
      const sources = picture.querySelectorAll('source');
      sources.forEach(source => {
        const type = source.getAttribute('type');
        if (type === 'image/webp') analysis.images.webp++;
        if (type === 'image/avif') analysis.images.avif++;
      });
    });

    images.forEach(img => {
      const src = img.getAttribute('src');
      const alt = img.getAttribute('alt');
      const loading = img.getAttribute('loading');
      const srcset = img.getAttribute('srcset');

      // Format analysis using improved extraction
      if (src) {
        const extension = getImageFormat(src);
        if (extension) {
          analysis.images.formats[extension] = (analysis.images.formats[extension] || 0) + 1;

          if (extension === 'webp') analysis.images.webp++;
          if (extension === 'avif') analysis.images.avif++;
        }
      }

      // Alt text analysis
      if (alt && alt.trim()) {
        analysis.images.withAlt++;
      } else {
        analysis.images.missingAlt++;
        // Collect images without alt text
        if (src) {
          // Make URL absolute if relative
          const absoluteSrc = src.startsWith('http') ? src :
                             src.startsWith('/') ? new URL(src, projectUrl).href :
                             new URL(src, projectUrl).href;
          analysis.images.imagesWithoutAlt.push({
            src: absoluteSrc,
            alt: alt || null
          });
        }
      }

      // Lazy loading
      if (loading === 'lazy') {
        analysis.images.lazy++;
      }

      // Responsive images
      if (srcset) {
        analysis.images.responsive++;
      }

      // Size estimation (basic heuristic)
      if (src && !src.startsWith('data:')) {
        analysis.images.sizes.push({
          src: src.substring(0, 100),
          estimated: 'unknown'
        });
      }
    });

    // Analyze Videos
    const videos = document.querySelectorAll('video');
    analysis.videos.total = videos.length;

    videos.forEach(video => {
      const poster = video.getAttribute('poster');
      const autoplay = video.hasAttribute('autoplay');
      const muted = video.hasAttribute('muted');
      const loading = video.getAttribute('loading');

      if (poster) analysis.videos.withPoster++;
      if (autoplay) analysis.videos.autoplay++;
      if (muted) analysis.videos.muted++;
      if (loading === 'lazy') analysis.videos.lazy++;

      // Analyze video sources
      const sources = video.querySelectorAll('source');
      sources.forEach(source => {
        const src = source.getAttribute('src');
        if (src) {
          const extension = src.split('.').pop()?.toLowerCase().split('?')[0];
          if (extension) {
            analysis.videos.formats[extension] = (analysis.videos.formats[extension] || 0) + 1;
          }
        }
      });
    });

    // Analyze Fonts
    const fontLinks = document.querySelectorAll('link[href*="font"]');
    const fontFaces = document.querySelectorAll('style');
    const preloadedFonts = document.querySelectorAll('link[rel="preload"][as="font"]');

    analysis.fonts.total = fontLinks.length;
    analysis.fonts.preloaded = preloadedFonts.length;

    fontLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        if (href.includes('googleapis.com') || href.includes('typekit.net')) {
          analysis.fonts.external++;
        }

        // Check for display=swap in Google Fonts URLs
        if (href.includes('display=swap')) {
          analysis.fonts.displaySwap++;
        }

        const extension = href.split('.').pop()?.toLowerCase().split('?')[0];
        if (extension) {
          analysis.fonts.formats[extension] = (analysis.fonts.formats[extension] || 0) + 1;
        }
      }
    });

    // Check for font-display: swap in inline styles
    fontFaces.forEach(style => {
      const content = style.textContent || '';
      const matches = content.match(/font-display\s*:\s*swap/gi);
      if (matches) {
        analysis.fonts.displaySwap += matches.length;
      }
    });

    // Check external CSS files for font-display: swap
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    for (const stylesheet of stylesheets) {
      const href = stylesheet.getAttribute('href');
      if (href) {
        try {
          const cssUrl = new URL(href, projectUrl).href;
          const response = await fetch(cssUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Media-Analyzer/1.0)',
            },
            timeout: 5000
          });
          if (response.ok) {
            const cssContent = await response.text();
            const matches = cssContent.match(/font-display\s*:\s*swap/gi);
            if (matches) {
              analysis.fonts.displaySwap += matches.length;
            }
          }
        } catch {
          // Skip if CSS can't be fetched
        }
      }
    }

    // Analyze Icons
    const svgIcons = document.querySelectorAll('svg');
    const iconFonts = document.querySelectorAll('[class*="fa-"], [class*="icon-"], [class*="material-icons"]');
    const useElements = document.querySelectorAll('use[href], use[xlink\\:href]');

    analysis.icons.svg = svgIcons.length;
    analysis.icons.iconFont = iconFonts.length;
    analysis.icons.sprites = useElements.length;
    analysis.icons.total = analysis.icons.svg + analysis.icons.iconFont + analysis.icons.sprites;

    // Analyze Resource Hints
    const preloadLinks = document.querySelectorAll('link[rel="preload"]');
    const prefetchLinks = document.querySelectorAll('link[rel="prefetch"]');
    const preconnectLinks = document.querySelectorAll('link[rel="preconnect"]');
    const dnsPrefetchLinks = document.querySelectorAll('link[rel="dns-prefetch"]');

    analysis.resourceHints.preload = preloadLinks.length;
    analysis.resourceHints.prefetch = prefetchLinks.length;
    analysis.resourceHints.preconnect = preconnectLinks.length;
    analysis.resourceHints.dnsPrefetch = dnsPrefetchLinks.length;

    // Generate Recommendations
    if (analysis.images.missingAlt > 0) {
      analysis.recommendations.push({
        title: 'Fehlende Alt-Texte',
        description: `${analysis.images.missingAlt} Bilder ohne Alt-Text gefunden`,
        priority: 'high',
        category: 'accessibility'
      });
    }

    if (analysis.images.webp === 0 && analysis.images.total > 0) {
      analysis.recommendations.push({
        title: 'Moderne Bildformate nutzen',
        description: 'WebP oder AVIF für bessere Komprimierung verwenden',
        priority: 'medium',
        category: 'performance'
      });
    }

    if (analysis.images.lazy < analysis.images.total * 0.5 && analysis.images.total > 3) {
      analysis.recommendations.push({
        title: 'Lazy Loading implementieren',
        description: 'Lazy Loading für bessere Performance aktivieren',
        priority: 'medium',
        category: 'performance'
      });
    }

    if (analysis.videos.autoplay > 0 && analysis.videos.muted === 0) {
      analysis.recommendations.push({
        title: 'Autoplay-Videos stumm schalten',
        description: 'Autoplay-Videos sollten stumm geschaltet sein',
        priority: 'high',
        category: 'ux'
      });
    }

    if (analysis.fonts.displaySwap === 0 && analysis.fonts.total > 0) {
      analysis.recommendations.push({
        title: 'Font-Display optimieren',
        description: 'font-display: swap für bessere Performance verwenden',
        priority: 'medium',
        category: 'performance'
      });
    }

    if (analysis.fonts.preloaded === 0 && analysis.fonts.total > 0) {
      analysis.recommendations.push({
        title: 'Kritische Fonts preloaden',
        description: 'Wichtige Fonts mit rel="preload" vorladen',
        priority: 'low',
        category: 'performance'
      });
    }

    // Calculate Media Score with detailed breakdown
    let score = 0;
    let maxScore = 0;
    const scoreDetails = {
      images: { total: 0, max: 40, items: [] },
      videos: { total: 0, max: 20, items: [] },
      fonts: { total: 0, max: 20, items: [] },
      resourceHints: { total: 0, max: 20, items: [] }
    };

    // Images (40 points)
    maxScore += 40;
    if (analysis.images.total > 0) {
      // Alt text coverage (15 points)
      const altCoverage = analysis.images.withAlt / analysis.images.total;
      const altScore = Math.round(altCoverage * 15);
      score += altScore;
      scoreDetails.images.items.push({ label: 'Alt-Texte', score: altScore, max: 15 });

      // Modern formats (10 points)
      const modernFormats = (analysis.images.webp + analysis.images.avif) / analysis.images.total;
      const modernScore = Math.round(modernFormats * 10);
      score += modernScore;
      scoreDetails.images.items.push({ label: 'Moderne Formate (WebP/AVIF)', score: modernScore, max: 10 });

      // Lazy loading (10 points)
      // Note: First image should NOT have lazy loading (above the fold)
      const expectedLazy = Math.max(0, analysis.images.total - 1);
      const lazyLoading = expectedLazy > 0
        ? Math.min(1, analysis.images.lazy / expectedLazy)
        : 1;
      const lazyScore = Math.round(lazyLoading * 10);
      score += lazyScore;
      scoreDetails.images.items.push({
        label: 'Lazy Loading',
        score: lazyScore,
        max: 10,
        note: expectedLazy > 0 ? `${analysis.images.lazy}/${expectedLazy} (erstes Bild ausgenommen)` : 'Nur 1 Bild'
      });

      // Responsive images (5 points)
      const responsiveImages = analysis.images.responsive / analysis.images.total;
      const responsiveScore = Math.round(responsiveImages * 5);
      score += responsiveScore;
      scoreDetails.images.items.push({ label: 'Responsive (srcset)', score: responsiveScore, max: 5 });

      scoreDetails.images.total = altScore + modernScore + lazyScore + responsiveScore;
    } else {
      score += 40;
      scoreDetails.images.total = 40;
      scoreDetails.images.items.push({ label: 'Keine Bilder', score: 40, max: 40, note: 'Kein Abzug' });
    }

    // Videos (20 points)
    maxScore += 20;
    if (analysis.videos.total > 0) {
      // Poster images (5 points)
      const posterCoverage = analysis.videos.withPoster / analysis.videos.total;
      const posterScore = Math.round(posterCoverage * 5);
      score += posterScore;
      scoreDetails.videos.items.push({ label: 'Poster-Bilder', score: posterScore, max: 5 });

      // Proper autoplay (10 points)
      const properAutoplay = analysis.videos.autoplay === 0 ||
                            (analysis.videos.autoplay === analysis.videos.muted);
      const autoplayScore = properAutoplay ? 10 : 0;
      score += autoplayScore;
      scoreDetails.videos.items.push({ label: 'Autoplay korrekt', score: autoplayScore, max: 10 });

      // Modern formats (5 points)
      const hasModernFormats = Object.keys(analysis.videos.formats).includes('mp4') ||
                              Object.keys(analysis.videos.formats).includes('webm');
      const videoFormatScore = hasModernFormats ? 5 : 0;
      score += videoFormatScore;
      scoreDetails.videos.items.push({ label: 'Moderne Formate', score: videoFormatScore, max: 5 });

      scoreDetails.videos.total = posterScore + autoplayScore + videoFormatScore;
    } else {
      score += 20;
      scoreDetails.videos.total = 20;
      scoreDetails.videos.items.push({ label: 'Keine Videos', score: 20, max: 20, note: 'Kein Abzug' });
    }

    // Fonts (20 points)
    maxScore += 20;
    if (analysis.fonts.total > 0 || analysis.fonts.displaySwap > 0 || analysis.fonts.preloaded > 0) {
      // Font display optimization (10 points)
      const fontDisplayScore = analysis.fonts.displaySwap > 0 ? 10 : 0;
      score += fontDisplayScore;
      scoreDetails.fonts.items.push({ label: 'font-display: swap', score: fontDisplayScore, max: 10 });

      // Preloading (5 points)
      const preloadScore = analysis.fonts.preloaded > 0 ? 5 : 0;
      score += preloadScore;
      scoreDetails.fonts.items.push({ label: 'Preloading', score: preloadScore, max: 5 });

      // Modern formats (5 points)
      const hasWoff2 = Object.keys(analysis.fonts.formats).includes('woff2');
      const fontFormatScore = hasWoff2 ? 5 : 0;
      score += fontFormatScore;
      scoreDetails.fonts.items.push({ label: 'WOFF2 Format', score: fontFormatScore, max: 5 });

      scoreDetails.fonts.total = fontDisplayScore + preloadScore + fontFormatScore;
    } else {
      score += 20;
      scoreDetails.fonts.total = 20;
      scoreDetails.fonts.items.push({ label: 'Keine externen Fonts', score: 20, max: 20, note: 'Kein Abzug' });
    }

    // Resource hints (20 points)
    maxScore += 20;
    const hasResourceHints = analysis.resourceHints.preload > 0 ||
                            analysis.resourceHints.prefetch > 0 ||
                            analysis.resourceHints.preconnect > 0 ||
                            analysis.resourceHints.dnsPrefetch > 0;
    const resourceScore = hasResourceHints ? 20 : 5;
    score += resourceScore;
    scoreDetails.resourceHints.total = resourceScore;
    scoreDetails.resourceHints.items.push({
      label: 'Resource Hints vorhanden',
      score: resourceScore,
      max: 20,
      note: hasResourceHints ? 'preload, prefetch, preconnect oder dns-prefetch' : 'Keine gefunden (5 Basispunkte)'
    });

    analysis.scoreDetails = scoreDetails;
    analysis.score = Math.round((score / maxScore) * 100);

    // Generate summary
    if (analysis.score >= 90) {
      analysis.summary = 'Ausgezeichnete Media-Optimierung! Alle wichtigen Aspekte sind gut umgesetzt.';
    } else if (analysis.score >= 70) {
      analysis.summary = 'Gute Media-Basis vorhanden. Einige Verbesserungen möglich.';
    } else if (analysis.score >= 50) {
      analysis.summary = 'Grundlegende Media-Elemente vorhanden. Deutliche Verbesserungen empfohlen.';
    } else {
      analysis.summary = 'Media-Optimierung dringend erforderlich. Viele wichtige Aspekte fehlen.';
    }

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Media analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error during media analysis' },
      { status: 500 }
    );
  }
}