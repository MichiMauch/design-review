import { NextResponse } from 'next/server';
import { getDb, initDatabase } from '../../../../../../lib/db.js';
import { JSDOM } from 'jsdom';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    // Get custom URL from query parameters
    const { searchParams } = new URL(request.url);
    const customUrl = searchParams.get('url');

    await initDatabase();
    const db = getDb();

    // Get the project to access its domain
    const result = await db.execute({
      sql: 'SELECT domain, name FROM projects WHERE id = ?',
      args: [projectId]
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = result.rows[0];

    if (!project.domain && !customUrl) {
      return NextResponse.json(
        { error: 'No domain configured for this project and no custom URL provided' },
        { status: 400 }
      );
    }

    // Use custom URL if provided, otherwise use project domain
    let projectUrl;
    if (customUrl) {
      projectUrl = customUrl.startsWith('http') ? customUrl : `https://${customUrl}`;
    } else {
      projectUrl = project.domain.startsWith('http') ? project.domain : `https://${project.domain}`;
    }

    // Initialize analysis object
    const analysis = {
      projectName: project.name,
      projectUrl: projectUrl,
      analyzedUrl: projectUrl,
      performance: {
        lighthouse: null,
        coreWebVitals: {
          lcp: null,
          fid: null,
          cls: null
        },
        pageSpeed: {
          mobile: null,
          desktop: null
        },
        resources: {
          totalRequests: 0,
          totalSize: 0,
          images: [],
          scripts: [],
          stylesheets: []
        }
      }
    };

    // Fetch the project's HTML
    let html;
    let responseTime;
    try {
      const startTime = Date.now();
      const response = await fetch(projectUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000
      });
      responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      html = await response.text();
    } catch (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch project URL', details: fetchError.message },
        { status: 502 }
      );
    }

    // Parse HTML with JSDOM
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Analyze resources
    const images = document.querySelectorAll('img');
    const scripts = document.querySelectorAll('script[src]');
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');

    // Helper function to get absolute URL
    const getAbsoluteUrl = (url, baseUrl) => {
      if (!url) return null;
      try {
        return new URL(url, baseUrl).href;
      } catch {
        return null;
      }
    };

    // Helper function to fetch resource size with timeout
    const fetchResourceSize = async (url, timeout = 5000) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        clearTimeout(timeoutId);

        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength, 10) : null;
      } catch {
        return null;
      }
    };

    // Collect all resource URLs
    const resourceUrls = [];

    const imageResources = Array.from(images).map(img => {
      const src = getAbsoluteUrl(img.getAttribute('src'), projectUrl);
      return {
        type: 'image',
        url: src,
        element: {
          src: img.getAttribute('src'),
          alt: img.getAttribute('alt'),
          loading: img.getAttribute('loading'),
          hasAlt: !!img.getAttribute('alt')
        }
      };
    }).filter(res => res.url);

    const scriptResources = Array.from(scripts).map(script => {
      const src = getAbsoluteUrl(script.getAttribute('src'), projectUrl);
      return {
        type: 'script',
        url: src,
        element: {
          src: script.getAttribute('src'),
          async: script.hasAttribute('async'),
          defer: script.hasAttribute('defer')
        }
      };
    }).filter(res => res.url);

    const stylesheetResources = Array.from(stylesheets).map(link => {
      const href = getAbsoluteUrl(link.getAttribute('href'), projectUrl);
      return {
        type: 'stylesheet',
        url: href,
        element: {
          href: link.getAttribute('href'),
          media: link.getAttribute('media')
        }
      };
    }).filter(res => res.url);

    resourceUrls.push(...imageResources, ...scriptResources, ...stylesheetResources);

    // Fetch resource sizes in parallel (limited to first 20 resources to avoid timeouts)
    const maxResources = 20;
    const resourceSizes = await Promise.allSettled(
      resourceUrls.slice(0, maxResources).map(async (resource) => {
        const size = await fetchResourceSize(resource.url);
        return {
          ...resource,
          size: size
        };
      })
    );

    // Process results
    const successfulSizes = resourceSizes
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(resource => resource.size !== null);

    // Calculate total sizes by type
    const sizesByType = {
      images: successfulSizes.filter(r => r.type === 'image').reduce((sum, r) => sum + r.size, 0),
      scripts: successfulSizes.filter(r => r.type === 'script').reduce((sum, r) => sum + r.size, 0),
      stylesheets: successfulSizes.filter(r => r.type === 'stylesheet').reduce((sum, r) => sum + r.size, 0)
    };

    const totalResourceSize = sizesByType.images + sizesByType.scripts + sizesByType.stylesheets;
    const htmlSizeBytes = html.length;
    const totalPageSize = totalResourceSize + htmlSizeBytes;

    // Estimate mobile page size (simplified calculation)
    // Mobile typically loads smaller images and may defer some resources
    const estimatedMobileImageSize = sizesByType.images * 0.6; // Assume 40% smaller images for mobile
    const estimatedMobileScriptSize = sizesByType.scripts * 0.8; // Some scripts may be deferred
    const estimatedMobileStyleSize = sizesByType.stylesheets * 0.9; // Most CSS still loads

    const estimatedMobileTotalSize = estimatedMobileImageSize + estimatedMobileScriptSize + estimatedMobileStyleSize + htmlSizeBytes;

    analysis.performance.resources = {
      totalRequests: images.length + scripts.length + stylesheets.length,
      images: imageResources.map(res => res.element),
      scripts: scriptResources.map(res => res.element),
      stylesheets: stylesheetResources.map(res => res.element),
      sizes: {
        html: htmlSizeBytes,
        images: sizesByType.images,
        scripts: sizesByType.scripts,
        stylesheets: sizesByType.stylesheets,
        total: totalPageSize,
        totalMB: (totalPageSize / (1024 * 1024)).toFixed(2),
        measuredResources: successfulSizes.length,
        totalResources: resourceUrls.length,
        mobile: {
          total: estimatedMobileTotalSize,
          totalMB: (estimatedMobileTotalSize / (1024 * 1024)).toFixed(2),
          images: estimatedMobileImageSize,
          scripts: estimatedMobileScriptSize,
          stylesheets: estimatedMobileStyleSize
        }
      }
    };

    // Check if Service Worker file exists
    const checkServiceWorkerExists = async () => {
      // First check if mentioned in HTML
      if (html.includes('serviceWorker') || html.includes('sw.js') || html.includes('service-worker')) {
        return true;
      }

      // Check common service worker file paths
      const swPaths = ['/sw.js', '/service-worker.js', '/serviceworker.js'];
      for (const swPath of swPaths) {
        try {
          const swUrl = new URL(swPath, projectUrl).href;
          const response = await fetch(swUrl, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; DesignReview/1.0)',
            },
          });
          if (response.ok) {
            return true;
          }
        } catch {
          // Continue to next path
        }
      }
      return false;
    };

    const hasServiceWorker = await checkServiceWorkerExists();

    // Basic performance metrics from HTML analysis
    const performanceMetrics = {
      responseTime,
      hasServiceWorker,
      hasLazyLoading: Array.from(images).some(img => img.getAttribute('loading') === 'lazy'),
      hasAsyncScripts: Array.from(scripts).some(script => script.hasAttribute('async')),
      hasDeferredScripts: Array.from(scripts).some(script => script.hasAttribute('defer')),
      htmlSize: html.length,
      metaViewport: !!document.querySelector('meta[name="viewport"]'),
      hasPreloadLinks: !!document.querySelector('link[rel="preload"]'),
      hasPrefetchLinks: !!document.querySelector('link[rel="prefetch"]')
    };

    // Analyze Web Vitals hints from HTML
    const webVitalsHints = {
      potentialLCP: {
        largeImages: Array.from(images).filter(img => {
          const src = img.getAttribute('src');
          return src && !img.getAttribute('loading')
        }).length,
        aboveFoldImages: Array.from(images).slice(0, 5).length
      },
      potentialCLS: {
        imagesWithoutDimensions: Array.from(images).filter(img => 
          !img.getAttribute('width') && !img.getAttribute('height')
        ).length,
        dynamicContent: html.includes('ads') || html.includes('advertisement')
      },
      potentialFID: {
        blockingScripts: Array.from(scripts).filter(script => 
          !script.hasAttribute('async') && !script.hasAttribute('defer')
        ).length,
        largeJavaScriptBundles: Array.from(scripts).length > 10
      }
    };

    // Page size evaluation
    const pageSizeEvaluation = {
      totalMB: parseFloat(analysis.performance.resources.sizes.totalMB),
      rating: 'excellent',
      message: '',
      benchmark: ''
    };

    if (pageSizeEvaluation.totalMB > 5) {
      pageSizeEvaluation.rating = 'poor';
      pageSizeEvaluation.message = 'Sehr große Seite - deutliche Optimierung nötig';
      pageSizeEvaluation.benchmark = '> 5 MB';
    } else if (pageSizeEvaluation.totalMB > 3) {
      pageSizeEvaluation.rating = 'needs-improvement';
      pageSizeEvaluation.message = 'Große Seite - Optimierung empfohlen';
      pageSizeEvaluation.benchmark = '3-5 MB';
    } else if (pageSizeEvaluation.totalMB > 1) {
      pageSizeEvaluation.rating = 'good';
      pageSizeEvaluation.message = 'Akzeptable Seitengröße';
      pageSizeEvaluation.benchmark = '1-3 MB';
    } else {
      pageSizeEvaluation.rating = 'excellent';
      pageSizeEvaluation.message = 'Optimale Seitengröße';
      pageSizeEvaluation.benchmark = '< 1 MB';
    }

    // Add page size to metrics
    performanceMetrics.pageSize = pageSizeEvaluation;

    // Performance recommendations
    const recommendations = [];

    // Page size recommendations
    if (pageSizeEvaluation.totalMB > 3) {
      recommendations.push({
        type: 'page-size',
        priority: 'high',
        message: 'Seitengröße reduzieren',
        description: `Aktuelle Seitengröße: ${pageSizeEvaluation.totalMB} MB. Ziel: < 3 MB für bessere Performance.`
      });
    }

    // Image size recommendations
    const imagesSizeMB = (analysis.performance.resources.sizes.images / (1024 * 1024)).toFixed(2);
    if (analysis.performance.resources.sizes.images > 1024 * 1024 * 2) { // > 2MB images
      recommendations.push({
        type: 'image-optimization',
        priority: 'high',
        message: 'Bilder optimieren',
        description: `Bilder: ${imagesSizeMB} MB. Komprimierung und moderne Formate (WebP) verwenden.`
      });
    }

    if (!performanceMetrics.hasLazyLoading && analysis.performance.resources.images.length > 3) {
      recommendations.push({
        type: 'image-optimization',
        priority: 'high',
        message: 'Implementieren Sie Lazy Loading für Bilder',
        description: `${analysis.performance.resources.images.length} Bilder gefunden. Lazy Loading kann die Ladezeit verbessern.`
      });
    }

    if (webVitalsHints.potentialCLS.imagesWithoutDimensions > 0) {
      recommendations.push({
        type: 'layout-shift',
        priority: 'high',
        message: 'Bilder benötigen explizite Dimensionen',
        description: `${webVitalsHints.potentialCLS.imagesWithoutDimensions} Bilder ohne width/height Attribute gefunden.`
      });
    }

    if (webVitalsHints.potentialFID.blockingScripts > 3) {
      recommendations.push({
        type: 'javascript-optimization',
        priority: 'medium',
        message: 'JavaScript Scripts blockieren das Rendering',
        description: `${webVitalsHints.potentialFID.blockingScripts} blockierende Scripts gefunden. Verwenden Sie async/defer.`
      });
    }

    if (!performanceMetrics.metaViewport) {
      recommendations.push({
        type: 'mobile-optimization',
        priority: 'high',
        message: 'Viewport Meta-Tag fehlt',
        description: 'Fügen Sie ein Viewport Meta-Tag für mobile Optimierung hinzu.'
      });
    }

    if (performanceMetrics.responseTime > 2000) {
      recommendations.push({
        type: 'server-optimization',
        priority: 'high',
        message: 'Langsame Server-Antwortzeit',
        description: `Server-Antwortzeit: ${performanceMetrics.responseTime}ms. Ziel: < 500ms.`
      });
    }

    if (!performanceMetrics.hasServiceWorker) {
      recommendations.push({
        type: 'caching',
        priority: 'low',
        message: 'Service Worker für Caching implementieren',
        description: 'Service Worker kann die Performance durch Caching verbessern.'
      });
    }

    // Performance score calculation (simplified)
    let performanceScore = 100;
    recommendations.forEach(rec => {
      if (rec.priority === 'high') performanceScore -= 15;
      else if (rec.priority === 'medium') performanceScore -= 10;
      else performanceScore -= 5;
    });
    performanceScore = Math.max(0, performanceScore);

    // Add to analysis
    analysis.performance.metrics = performanceMetrics;
    analysis.performance.webVitalsHints = webVitalsHints;
    analysis.performance.recommendations = recommendations;
    analysis.performance.score = performanceScore;

    // Summary statistics
    analysis.summary = {
      performanceScore,
      responseTime: performanceMetrics.responseTime,
      totalRecommendations: recommendations.length,
      highPriorityIssues: recommendations.filter(r => r.priority === 'high').length,
      mediumPriorityIssues: recommendations.filter(r => r.priority === 'medium').length,
      lowPriorityIssues: recommendations.filter(r => r.priority === 'low').length,
      hasLazyLoading: performanceMetrics.hasLazyLoading,
      hasServiceWorker: performanceMetrics.hasServiceWorker,
      isMobileOptimized: performanceMetrics.metaViewport
    };

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Performance analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}