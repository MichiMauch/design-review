import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { getDb, initDatabase } from '../../../../../../lib/db.js';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get URL from query parameters (optional - for analyzing different URLs)
    const { searchParams } = new URL(request.url);
    const customUrl = searchParams.get('url');

    // Get project from database
    await initDatabase();
    const db = getDb();

    const project = await db.execute({
      sql: 'SELECT * FROM projects WHERE id = ?',
      args: [projectId]
    });

    if (!project.rows || project.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = project.rows[0];
    const projectUrl = customUrl || projectData.domain;

    if (!projectUrl) {
      return NextResponse.json(
        { error: 'No URL available for analysis' },
        { status: 400 }
      );
    }

    // Ensure URL has protocol
    const targetUrl = projectUrl.startsWith('http') ? projectUrl : `https://${projectUrl}`;

    // Fetch the page HTML
    let html;
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DesignReview/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      html = await response.text();
    } catch (fetchError) {
      return NextResponse.json(
        { error: `Unable to fetch URL: ${fetchError.message}` },
        { status: 400 }
      );
    }

    // Parse HTML
    const dom = new JSDOM(html, { url: targetUrl });
    const document = dom.window.document;

    // Helper function to check if a URL/file exists
    async function checkImageExists(url) {
      if (!url) return false;

      try {
        const absoluteUrl = new URL(url, targetUrl).href;
        const response = await fetch(absoluteUrl, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DesignReview/1.0)',
          },
        });
        return response.ok;
      } catch {
        return false;
      }
    }

    // Helper function to fetch and parse Web App Manifest
    async function parseWebManifest() {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (!manifestLink) return null;

      const manifestUrl = manifestLink.getAttribute('href');
      if (!manifestUrl) return null;

      try {
        const absoluteUrl = new URL(manifestUrl, targetUrl).href;
        const response = await fetch(absoluteUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DesignReview/1.0)',
          },
        });
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    }

    // Helper function to fetch and parse browserconfig.xml
    async function parseBrowserConfig() {
      // First check for meta tag pointing to browserconfig
      const configMeta = document.querySelector('meta[name="msapplication-config"]');
      const configUrl = configMeta?.getAttribute('content') || '/browserconfig.xml';

      try {
        const absoluteUrl = new URL(configUrl, targetUrl).href;
        const response = await fetch(absoluteUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DesignReview/1.0)',
          },
        });
        if (!response.ok) return null;
        const xmlText = await response.text();

        // Parse XML to extract tile images
        const tiles = {};
        const tileMatches = xmlText.matchAll(/<(square\d+x\d+logo|wide\d+x\d+logo|TileImage)[^>]*src="([^"]+)"/gi);
        for (const match of tileMatches) {
          const type = match[1].toLowerCase();
          const src = match[2];
          if (type.includes('70x70')) tiles['70x70'] = src;
          if (type.includes('150x150')) tiles['150x150'] = src;
          if (type.includes('310x150')) tiles['310x150'] = src;
          if (type.includes('310x310')) tiles['310x310'] = src;
          if (type === 'tileimage') tiles['144x144'] = src;
        }
        return tiles;
      } catch {
        return null;
      }
    }

    // Fetch manifest and browserconfig in parallel
    const [webManifest, browserConfig] = await Promise.all([
      parseWebManifest(),
      parseBrowserConfig()
    ]);

    // Icon definitions to check
    const iconChecks = {
      favicon: [
        { name: 'favicon.ico', selector: 'link[rel="icon"][href*=".ico"], link[rel="shortcut icon"]', type: 'ICO', sizes: '16x16, 32x32' },
        { name: 'favicon.png', selector: 'link[rel="icon"][type="image/png"]', type: 'PNG', sizes: 'various' },
        { name: 'favicon.svg', selector: 'link[rel="icon"][type="image/svg+xml"]', type: 'SVG', sizes: 'scalable' },
      ],
      apple: [
        { name: 'apple-touch-icon-57x57.png', selector: 'link[rel*="apple-touch-icon"][sizes="57x57"]', type: 'Apple', sizes: '57x57' },
        { name: 'apple-touch-icon-60x60.png', selector: 'link[rel*="apple-touch-icon"][sizes="60x60"]', type: 'Apple', sizes: '60x60' },
        { name: 'apple-touch-icon-72x72.png', selector: 'link[rel*="apple-touch-icon"][sizes="72x72"]', type: 'Apple', sizes: '72x72' },
        { name: 'apple-touch-icon-76x76.png', selector: 'link[rel*="apple-touch-icon"][sizes="76x76"]', type: 'Apple', sizes: '76x76' },
        { name: 'apple-touch-icon-114x114.png', selector: 'link[rel*="apple-touch-icon"][sizes="114x114"]', type: 'Apple', sizes: '114x114' },
        { name: 'apple-touch-icon-120x120.png', selector: 'link[rel*="apple-touch-icon"][sizes="120x120"]', type: 'Apple', sizes: '120x120' },
        { name: 'apple-touch-icon-144x144.png', selector: 'link[rel*="apple-touch-icon"][sizes="144x144"]', type: 'Apple', sizes: '144x144' },
        { name: 'apple-touch-icon-152x152.png', selector: 'link[rel*="apple-touch-icon"][sizes="152x152"]', type: 'Apple', sizes: '152x152' },
        { name: 'apple-touch-icon-167x167.png', selector: 'link[rel*="apple-touch-icon"][sizes="167x167"]', type: 'Apple', sizes: '167x167' },
        { name: 'apple-touch-icon-180x180.png', selector: 'link[rel*="apple-touch-icon"][sizes="180x180"], link[rel*="apple-touch-icon"]:not([sizes])', type: 'Apple', sizes: '180x180' },
      ],
      android: [
        { name: 'android-chrome-192x192.png', manifestSize: '192x192', type: 'Android', sizes: '192x192' },
        { name: 'android-chrome-512x512.png', manifestSize: '512x512', type: 'Android', sizes: '512x512' },
      ],
      microsoft: [
        { name: 'mstile-70x70.png', selector: 'meta[name="msapplication-square70x70logo"]', browserConfigSize: '70x70', type: 'Microsoft', sizes: '70x70' },
        { name: 'mstile-144x144.png', selector: 'meta[name="msapplication-TileImage"]', browserConfigSize: '144x144', type: 'Microsoft', sizes: '144x144' },
        { name: 'mstile-150x150.png', selector: 'meta[name="msapplication-square150x150logo"]', browserConfigSize: '150x150', type: 'Microsoft', sizes: '150x150' },
        { name: 'mstile-310x150.png', selector: 'meta[name="msapplication-wide310x150logo"]', browserConfigSize: '310x150', type: 'Microsoft', sizes: '310x150' },
        { name: 'mstile-310x310.png', selector: 'meta[name="msapplication-square310x310logo"]', browserConfigSize: '310x310', type: 'Microsoft', sizes: '310x310' },
      ]
    };

    // Check each icon
    const icons = {
      favicon: [],
      apple: [],
      android: [],
      microsoft: []
    };

    // Check standard icons (favicon, apple)
    for (const category of ['favicon', 'apple']) {
      for (const icon of iconChecks[category]) {
        const element = document.querySelector(icon.selector);
        const found = !!element;
        const url = found ? (element.getAttribute('href') || element.getAttribute('content')) : null;
        const exists = found && url ? await checkImageExists(url) : false;

        icons[category].push({
          name: icon.name,
          type: icon.type,
          sizes: icon.sizes,
          found,
          url: url || null,
          exists
        });
      }
    }

    // Check Android icons from Web App Manifest
    for (const icon of iconChecks.android) {
      let found = false;
      let url = null;
      let exists = false;

      // Look for icon in web manifest
      if (webManifest?.icons) {
        const manifestIcon = webManifest.icons.find(i =>
          i.sizes === icon.manifestSize ||
          i.sizes?.includes(icon.manifestSize.split('x')[0])
        );
        if (manifestIcon) {
          found = true;
          url = manifestIcon.src;
          exists = await checkImageExists(url);
        }
      }

      icons.android.push({
        name: icon.name,
        type: icon.type,
        sizes: icon.sizes,
        found,
        url,
        exists,
        source: found ? 'manifest' : null
      });
    }

    // Check Microsoft tiles from meta tags and browserconfig.xml
    for (const icon of iconChecks.microsoft) {
      let found = false;
      let url = null;
      let exists = false;
      let source = null;

      // First check meta tags in HTML
      if (icon.selector) {
        const element = document.querySelector(icon.selector);
        if (element) {
          found = true;
          url = element.getAttribute('content');
          source = 'meta';
        }
      }

      // If not found in meta, check browserconfig.xml
      if (!found && browserConfig && icon.browserConfigSize) {
        const configUrl = browserConfig[icon.browserConfigSize];
        if (configUrl) {
          found = true;
          url = configUrl;
          source = 'browserconfig';
        }
      }

      // Verify the image exists
      if (found && url) {
        exists = await checkImageExists(url);
      }

      icons.microsoft.push({
        name: icon.name,
        type: icon.type,
        sizes: icon.sizes,
        found,
        url,
        exists,
        source
      });
    }

    // Calculate summary statistics
    let totalIconsFound = 0;
    let totalIconsExist = 0;

    Object.values(icons).forEach(categoryIcons => {
      categoryIcons.forEach(icon => {
        if (icon.found) totalIconsFound++;
        if (icon.exists) totalIconsExist++;
      });
    });

    const summary = {
      totalIconsFound,
      totalIconsExist,
      hasFavicon: icons.favicon.some(i => i.exists),
      hasAppleIcons: icons.apple.some(i => i.exists),
      hasAndroidIcons: icons.android.some(i => i.exists),
      hasMicrosoftIcons: icons.microsoft.some(i => i.exists)
    };

    return NextResponse.json({
      projectName: projectData.name,
      projectUrl: projectData.domain,
      analyzedUrl: targetUrl,
      icons,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Icons analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze icons' },
      { status: 500 }
    );
  }
}
