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
      // Ensure custom URL is a full URL
      projectUrl = customUrl.startsWith('http') ? customUrl : `https://${customUrl}`;
    } else {
      // Use project domain
      projectUrl = project.domain.startsWith('http') ? project.domain : `https://${project.domain}`;
    }

    // Fetch the project's HTML
    let html;
    try {
      const response = await fetch(projectUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

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

    // Initialize analysis object
    const analysis = {
      projectName: project.name,
      projectUrl: projectUrl,
      analyzedUrl: projectUrl,
      analytics: {
        googleAnalytics4: [],
        googleTagManager: [],
        matomo: [],
        facebookPixel: [],
        hotjar: [],
        other: []
      }
    };

    // Helper function to search for patterns in HTML
    const searchPattern = (pattern, name, type, source = 'HTML Source') => {
      const matches = html.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Extract tracking ID from match
          const idMatch = match.match(/G-[A-Z0-9]+|GTM-[A-Z0-9]+|UA-[0-9]+-[0-9]+|[0-9]+/);
          const trackingId = idMatch ? idMatch[0] : 'Gefunden';

          analysis.analytics[type].push({
            name,
            trackingId,
            foundIn: source
          });
        });
      }
    };

    // Helper function to add tool if not already found
    const addTool = (type, name, trackingId, foundIn) => {
      const exists = analysis.analytics[type].some(tool =>
        tool.name === name && tool.trackingId === trackingId
      );

      if (!exists) {
        analysis.analytics[type].push({
          name,
          trackingId,
          foundIn
        });
      }
    };

    // Google Analytics 4 (gtag.js)
    searchPattern(
      /gtag\s*\(\s*['"]config['"]\s*,\s*['"]G-[A-Z0-9]+['"]/gi,
      'Google Analytics 4 (gtag)',
      'googleAnalytics4'
    );

    // Google Analytics 4 (gtm)
    searchPattern(
      /window\.dataLayer[\s\S]*?G-[A-Z0-9]+/gi,
      'Google Analytics 4 (GTM)',
      'googleAnalytics4'
    );

    // Google Tag Manager
    searchPattern(
      /GTM-[A-Z0-9]+/gi,
      'Google Tag Manager',
      'googleTagManager'
    );

    // Matomo/Piwik
    if (html.includes('_paq') || html.includes('matomo') || html.includes('piwik')) {
      const matomoMatch = html.match(/var\s+_paq[\s\S]*?trackPageView/gi) ||
                         html.match(/matomo\.js/gi) ||
                         html.match(/piwik\.js/gi);
      if (matomoMatch) {
        analysis.analytics.matomo.push({
          name: 'Matomo/Piwik',
          trackingId: 'Gefunden',
          foundIn: 'HTML Source'
        });
      }
    }

    // Facebook Pixel
    searchPattern(
      /fbq\s*\(\s*['"]init['"]\s*,\s*['"][0-9]+['"]/gi,
      'Facebook Pixel',
      'facebookPixel'
    );

    // Hotjar
    if (html.includes('hotjar') || html.includes('hj.js')) {
      const hotjarMatch = html.match(/h\._hjSettings\s*=\s*\{\s*hjid\s*:\s*([0-9]+)/gi);
      const hjId = hotjarMatch ? hotjarMatch[0].match(/[0-9]+/)[0] : 'Gefunden';
      analysis.analytics.hotjar.push({
        name: 'Hotjar',
        trackingId: hjId,
        foundIn: 'HTML Source'
      });
    }

    // Other common analytics tools
    const otherTools = [
      { pattern: /amplitude/gi, name: 'Amplitude' },
      { pattern: /mixpanel/gi, name: 'Mixpanel' },
      { pattern: /segment\.com/gi, name: 'Segment' },
      { pattern: /fullstory/gi, name: 'FullStory' },
      { pattern: /logrocket/gi, name: 'LogRocket' },
      { pattern: /mouseflow/gi, name: 'Mouseflow' },
      { pattern: /crazyegg/gi, name: 'Crazy Egg' },
      { pattern: /kissmetrics/gi, name: 'KISSmetrics' }
    ];

    otherTools.forEach(tool => {
      if (tool.pattern.test(html)) {
        analysis.analytics.other.push({
          name: tool.name,
          trackingId: 'Gefunden',
          foundIn: 'HTML Source'
        });
      }
    });

    // Check script tags for additional tracking codes
    const scriptTags = document.querySelectorAll('script[src]');
    scriptTags.forEach(script => {
      const src = script.getAttribute('src');

      // Google Analytics
      if (src.includes('googletagmanager.com/gtag/js') || src.includes('google-analytics.com/analytics.js')) {
        const gaMatch = src.match(/id=G-[A-Z0-9]+|id=UA-[0-9]+-[0-9]+/);
        if (gaMatch) {
          const trackingId = gaMatch[0].replace('id=', '');
          if (trackingId.startsWith('G-')) {
            addTool('googleAnalytics4', 'Google Analytics 4 (Script Tag)', trackingId, 'Script Src');
          }
        }
      }

      // Google Tag Manager
      if (src.includes('googletagmanager.com/gtm.js')) {
        const gtmMatch = src.match(/id=GTM-[A-Z0-9]+/);
        if (gtmMatch) {
          const trackingId = gtmMatch[0].replace('id=', '');
          addTool('googleTagManager', 'Google Tag Manager (Script Tag)', trackingId, 'Script Src');
        }
      }
    });

    // Enhanced GTM-based detection via dataLayer analysis
    const dataLayerPattern = /window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\s*\]/gi;
    if (dataLayerPattern.test(html)) {
      // Check for GA4 config in dataLayer pushes
      const ga4ConfigPattern = /dataLayer\.push\s*\(\s*\{\s*[^}]*event\s*:\s*['"]gtag\.config['"][^}]*['"]G-[A-Z0-9]+['"][^}]*\}/gi;
      const ga4Matches = html.match(ga4ConfigPattern);
      if (ga4Matches) {
        ga4Matches.forEach(match => {
          const idMatch = match.match(/G-[A-Z0-9]+/);
          if (idMatch) {
            addTool('googleAnalytics4', 'Google Analytics 4 (GTM DataLayer)', idMatch[0], 'GTM DataLayer');
          }
        });
      }

      // Check for Facebook Pixel in dataLayer
      const fbPixelPattern = /dataLayer\.push\s*\(\s*\{[^}]*fbq[^}]*\}/gi;
      if (fbPixelPattern.test(html)) {
        addTool('facebookPixel', 'Facebook Pixel (GTM DataLayer)', 'Via GTM', 'GTM DataLayer');
      }

      // Check for generic GTM events that might indicate other tools
      const gtmEventPattern = /dataLayer\.push\s*\(\s*\{[^}]*event\s*:\s*['"]([^'"]+)['"][^}]*\}/gi;
      let match;
      while ((match = gtmEventPattern.exec(html)) !== null) {
        const eventName = match[1];
        if (eventName.includes('hotjar') || eventName.includes('hj_')) {
          addTool('hotjar', 'Hotjar (GTM Event)', 'Via GTM', 'GTM DataLayer');
        }
        if (eventName.includes('matomo') || eventName.includes('piwik')) {
          addTool('matomo', 'Matomo (GTM Event)', 'Via GTM', 'GTM DataLayer');
        }
      }
    }

    // Check for dynamically loaded scripts via GTM
    const gtmScriptPattern = /(?:googletagmanager\.com\/gtm\.js|gtm\.start)/gi;
    if (gtmScriptPattern.test(html)) {
      // Look for common patterns that indicate GTM is loading other tools
      const commonGtmPatterns = [
        { pattern: /gtag\s*\(\s*['"]config['"],\s*['"]G-[A-Z0-9]+['"]/gi, type: 'googleAnalytics4', name: 'Google Analytics 4 (GTM)', field: 'G-[A-Z0-9]+' },
        { pattern: /fbq\s*\(\s*['"]init['"]/gi, type: 'facebookPixel', name: 'Facebook Pixel (GTM)', field: null },
        { pattern: /hj\s*\(\s*['"]identify['"]/gi, type: 'hotjar', name: 'Hotjar (GTM)', field: null },
        { pattern: /_paq\.push/gi, type: 'matomo', name: 'Matomo (GTM)', field: null }
      ];

      commonGtmPatterns.forEach(gtmPattern => {
        if (gtmPattern.pattern.test(html)) {
          let trackingId = 'Via GTM';
          if (gtmPattern.field) {
            const idMatch = html.match(new RegExp(gtmPattern.field, 'gi'));
            if (idMatch) {
              trackingId = idMatch[0];
            }
          }
          addTool(gtmPattern.type, gtmPattern.name, trackingId, 'GTM Implementation');
        }
      });
    }

    // Enhanced detection for tools loaded after page load
    const commonGlobalObjects = [
      { pattern: /window\.gtag\s*=/gi, type: 'googleAnalytics4', name: 'Google Analytics 4 (Global Object)', id: 'Detected' },
      { pattern: /window\.fbq\s*=/gi, type: 'facebookPixel', name: 'Facebook Pixel (Global Object)', id: 'Detected' },
      { pattern: /window\.hj\s*=/gi, type: 'hotjar', name: 'Hotjar (Global Object)', id: 'Detected' },
      { pattern: /window\._paq\s*=/gi, type: 'matomo', name: 'Matomo (Global Object)', id: 'Detected' }
    ];

    commonGlobalObjects.forEach(obj => {
      if (obj.pattern.test(html)) {
        addTool(obj.type, obj.name, obj.id, 'Global Object');
      }
    });

    // Remove duplicates but keep best source information
    Object.keys(analysis.analytics).forEach(key => {
      const toolMap = new Map();

      analysis.analytics[key].forEach(item => {
        const identifier = `${item.name}-${item.trackingId}`;

        if (!toolMap.has(identifier)) {
          toolMap.set(identifier, item);
        } else {
          // Keep the entry with the most specific source information
          const existing = toolMap.get(identifier);
          const sourceRanking = {
            'GTM DataLayer': 1,
            'GTM Implementation': 2,
            'Script Src': 3,
            'HTML Source': 4,
            'Global Object': 5
          };

          const existingRank = sourceRanking[existing.foundIn] || 99;
          const newRank = sourceRanking[item.foundIn] || 99;

          if (newRank < existingRank) {
            toolMap.set(identifier, item);
          }
        }
      });

      analysis.analytics[key] = Array.from(toolMap.values());
    });

    // Add summary statistics
    const totalTools = Object.values(analysis.analytics).reduce((sum, tools) => sum + tools.length, 0);
    
    analysis.summary = {
      totalToolsFound: totalTools,
      hasGoogleAnalytics: analysis.analytics.googleAnalytics4.length > 0,
      hasGoogleTagManager: analysis.analytics.googleTagManager.length > 0,
      hasMatomo: analysis.analytics.matomo.length > 0,
      hasFacebookPixel: analysis.analytics.facebookPixel.length > 0,
      hasHotjar: analysis.analytics.hotjar.length > 0,
      hasOtherTools: analysis.analytics.other.length > 0
    };

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Analytics analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}