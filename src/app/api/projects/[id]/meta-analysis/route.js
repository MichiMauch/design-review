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

    if (!project.domain) {
      return NextResponse.json(
        { error: 'No domain configured for this project' },
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

    // Helper function to get meta content
    const getMeta = (selector) => {
      const element = document.querySelector(selector);
      return element ? element.getAttribute('content') || element.getAttribute('href') || element.textContent : null;
    };

    // Helper function to check if URL exists
    const checkUrl = async (url) => {
      if (!url) return false;
      try {
        // Make URL absolute if it's relative
        const absoluteUrl = new URL(url, projectUrl).href;
        const response = await fetch(absoluteUrl, { method: 'HEAD', timeout: 5000 });
        return response.ok;
      } catch {
        return false;
      }
    };

    // Extract meta tags
    const analysis = {
      projectName: project.name,
      projectUrl: projectUrl,
      analyzedUrl: projectUrl,  // The actual URL that was analyzed

      // Basic meta tags
      basic: {
        title: getMeta('title') || getMeta('meta[name="title"]'),
        description: getMeta('meta[name="description"]'),
        keywords: getMeta('meta[name="keywords"]'),
        author: getMeta('meta[name="author"]'),
        robots: getMeta('meta[name="robots"]'),
        viewport: getMeta('meta[name="viewport"]'),
        charset: document.querySelector('meta[charset]')?.getAttribute('charset') ||
                document.querySelector('meta[http-equiv="Content-Type"]')?.getAttribute('content')
      },

      // Open Graph tags
      openGraph: {
        title: getMeta('meta[property="og:title"]'),
        description: getMeta('meta[property="og:description"]'),
        type: getMeta('meta[property="og:type"]'),
        url: getMeta('meta[property="og:url"]'),
        image: getMeta('meta[property="og:image"]'),
        siteName: getMeta('meta[property="og:site_name"]'),
        locale: getMeta('meta[property="og:locale"]')
      },

      // Twitter Card tags
      twitter: {
        card: getMeta('meta[name="twitter:card"]'),
        site: getMeta('meta[name="twitter:site"]'),
        creator: getMeta('meta[name="twitter:creator"]'),
        title: getMeta('meta[name="twitter:title"]'),
        description: getMeta('meta[name="twitter:description"]'),
        image: getMeta('meta[name="twitter:image"]')
      },

      // SEO and other important tags
      seo: {
        canonical: getMeta('link[rel="canonical"]'),
        alternate: getMeta('link[rel="alternate"]'),
        prev: getMeta('link[rel="prev"]'),
        next: getMeta('link[rel="next"]'),
        hreflang: Array.from(document.querySelectorAll('link[hreflang]')).map(el => ({
          hreflang: el.getAttribute('hreflang'),
          href: el.getAttribute('href')
        }))
      }
    };

    // Extract and check icons
    const iconChecks = [
      // Standard favicon
      { name: 'Favicon (ICO)', selector: 'link[rel="icon"][href$=".ico"]', type: 'favicon' },
      { name: 'Favicon (PNG)', selector: 'link[rel="icon"][href$=".png"]', type: 'favicon' },
      { name: 'Favicon (SVG)', selector: 'link[rel="icon"][href$=".svg"]', type: 'favicon' },
      { name: 'Shortcut Icon', selector: 'link[rel="shortcut icon"]', type: 'favicon' },

      // Apple Touch Icons
      { name: 'Apple Touch Icon', selector: 'link[rel="apple-touch-icon"]', type: 'apple' },
      { name: 'Apple Touch Icon (57x57)', selector: 'link[rel="apple-touch-icon"][sizes="57x57"]', type: 'apple' },
      { name: 'Apple Touch Icon (60x60)', selector: 'link[rel="apple-touch-icon"][sizes="60x60"]', type: 'apple' },
      { name: 'Apple Touch Icon (72x72)', selector: 'link[rel="apple-touch-icon"][sizes="72x72"]', type: 'apple' },
      { name: 'Apple Touch Icon (76x76)', selector: 'link[rel="apple-touch-icon"][sizes="76x76"]', type: 'apple' },
      { name: 'Apple Touch Icon (114x114)', selector: 'link[rel="apple-touch-icon"][sizes="114x114"]', type: 'apple' },
      { name: 'Apple Touch Icon (120x120)', selector: 'link[rel="apple-touch-icon"][sizes="120x120"]', type: 'apple' },
      { name: 'Apple Touch Icon (144x144)', selector: 'link[rel="apple-touch-icon"][sizes="144x144"]', type: 'apple' },
      { name: 'Apple Touch Icon (152x152)', selector: 'link[rel="apple-touch-icon"][sizes="152x152"]', type: 'apple' },
      { name: 'Apple Touch Icon (180x180)', selector: 'link[rel="apple-touch-icon"][sizes="180x180"]', type: 'apple' },

      // Android/Chrome icons
      { name: 'Android Icon (192x192)', selector: 'link[rel="icon"][sizes="192x192"]', type: 'android' },
      { name: 'Android Icon (512x512)', selector: 'link[rel="icon"][sizes="512x512"]', type: 'android' },

      // Microsoft tiles
      { name: 'MS Tile (70x70)', selector: 'meta[name="msapplication-square70x70logo"]', type: 'microsoft', isContent: true },
      { name: 'MS Tile (150x150)', selector: 'meta[name="msapplication-square150x150logo"]', type: 'microsoft', isContent: true },
      { name: 'MS Tile (310x150)', selector: 'meta[name="msapplication-wide310x150logo"]', type: 'microsoft', isContent: true },
      { name: 'MS Tile (310x310)', selector: 'meta[name="msapplication-square310x310logo"]', type: 'microsoft', isContent: true }
    ];

    // Check each icon
    const iconResults = await Promise.all(
      iconChecks.map(async (iconCheck) => {
        const element = document.querySelector(iconCheck.selector);
        if (!element) {
          return { ...iconCheck, found: false, url: null, exists: false };
        }

        const url = iconCheck.isContent ?
          element.getAttribute('content') :
          element.getAttribute('href');

        if (!url) {
          return { ...iconCheck, found: true, url: null, exists: false };
        }

        const exists = await checkUrl(url);
        const absoluteUrl = url.startsWith('http') ? url : new URL(url, projectUrl).href;

        return {
          ...iconCheck,
          found: true,
          url: absoluteUrl,
          exists,
          sizes: element.getAttribute('sizes') || null
        };
      })
    );

    // Group icons by type
    analysis.icons = {
      favicon: iconResults.filter(icon => icon.type === 'favicon'),
      apple: iconResults.filter(icon => icon.type === 'apple'),
      android: iconResults.filter(icon => icon.type === 'android'),
      microsoft: iconResults.filter(icon => icon.type === 'microsoft')
    };

    // Check social media images
    const socialImages = [];

    if (analysis.openGraph.image) {
      const ogImageExists = await checkUrl(analysis.openGraph.image);
      socialImages.push({
        type: 'openGraph',
        url: analysis.openGraph.image,
        exists: ogImageExists,
        absoluteUrl: analysis.openGraph.image.startsWith('http') ?
          analysis.openGraph.image :
          new URL(analysis.openGraph.image, projectUrl).href
      });
    }

    if (analysis.twitter.image) {
      const twitterImageExists = await checkUrl(analysis.twitter.image);
      socialImages.push({
        type: 'twitter',
        url: analysis.twitter.image,
        exists: twitterImageExists,
        absoluteUrl: analysis.twitter.image.startsWith('http') ?
          analysis.twitter.image :
          new URL(analysis.twitter.image, projectUrl).href
      });
    }

    // Add social images to analysis
    analysis.socialImages = socialImages;

    // Add summary statistics
    analysis.summary = {
      totalIconsFound: iconResults.filter(icon => icon.found).length,
      totalIconsExist: iconResults.filter(icon => icon.exists).length,
      hasFavicon: iconResults.some(icon => icon.type === 'favicon' && icon.exists),
      hasAppleIcons: iconResults.some(icon => icon.type === 'apple' && icon.exists),
      hasAndroidIcons: iconResults.some(icon => icon.type === 'android' && icon.exists),
      hasMicrosoftIcons: iconResults.some(icon => icon.type === 'microsoft' && icon.exists),
      hasOpenGraph: !!(analysis.openGraph.title || analysis.openGraph.description || analysis.openGraph.image),
      hasTwitterCard: !!(analysis.twitter.card || analysis.twitter.title || analysis.twitter.description)
    };

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Meta analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}