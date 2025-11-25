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

    // Helper function to check if an image URL exists
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

    // Helper function to get meta tag content
    function getMeta(selector) {
      const element = document.querySelector(selector);
      return element ? element.getAttribute('content') || element.textContent : null;
    }

    // Analyze Basic Meta Tags
    const basic = {
      title: document.querySelector('title')?.textContent || null,
      description: getMeta('meta[name="description"]'),
      keywords: getMeta('meta[name="keywords"]'),
      author: getMeta('meta[name="author"]'),
      robots: getMeta('meta[name="robots"]'),
      viewport: getMeta('meta[name="viewport"]'),
      charset: document.querySelector('meta[charset]')?.getAttribute('charset') ||
               document.querySelector('meta[http-equiv="Content-Type"]')?.getAttribute('content')?.match(/charset=([^;]+)/)?.[1] ||
               null
    };

    // Analyze Open Graph Tags
    const openGraph = {
      title: getMeta('meta[property="og:title"]'),
      description: getMeta('meta[property="og:description"]'),
      type: getMeta('meta[property="og:type"]'),
      url: getMeta('meta[property="og:url"]'),
      image: getMeta('meta[property="og:image"]'),
      siteName: getMeta('meta[property="og:site_name"]'),
      locale: getMeta('meta[property="og:locale"]')
    };

    // Analyze Twitter Card Tags
    const twitter = {
      card: getMeta('meta[name="twitter:card"]'),
      site: getMeta('meta[name="twitter:site"]'),
      creator: getMeta('meta[name="twitter:creator"]'),
      title: getMeta('meta[name="twitter:title"]'),
      description: getMeta('meta[name="twitter:description"]'),
      image: getMeta('meta[name="twitter:image"]')
    };

    // Analyze SEO Tags
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null;
    const alternate = document.querySelector('link[rel="alternate"]')?.getAttribute('href') || null;
    const prev = document.querySelector('link[rel="prev"]')?.getAttribute('href') || null;
    const next = document.querySelector('link[rel="next"]')?.getAttribute('href') || null;

    // Get all hreflang tags
    const hreflangTags = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map(link => ({
      hreflang: link.getAttribute('hreflang'),
      href: link.getAttribute('href')
    }));

    const seo = {
      canonical,
      alternate,
      prev,
      next,
      hreflang: hreflangTags
    };

    // Check social media images
    const socialImages = [];

    // Check Open Graph image
    if (openGraph.image) {
      const ogImageExists = await checkImageExists(openGraph.image);
      socialImages.push({
        type: 'openGraph',
        url: openGraph.image,
        exists: ogImageExists,
        absoluteUrl: new URL(openGraph.image, targetUrl).href
      });
    }

    // Check Twitter image
    if (twitter.image && twitter.image !== openGraph.image) {
      const twitterImageExists = await checkImageExists(twitter.image);
      socialImages.push({
        type: 'twitter',
        url: twitter.image,
        exists: twitterImageExists,
        absoluteUrl: new URL(twitter.image, targetUrl).href
      });
    }

    // Calculate summary statistics
    const hasOpenGraph = Object.values(openGraph).some(v => v !== null);
    const hasTwitterCard = Object.values(twitter).some(v => v !== null);
    const hasBasicMeta = basic.title && basic.description;
    const hasSeoTags = canonical || hreflangTags.length > 0;

    const summary = {
      hasBasicMeta,
      hasOpenGraph,
      hasTwitterCard,
      hasSeoTags,
      basicMetaCount: Object.values(basic).filter(v => v !== null).length,
      openGraphCount: Object.values(openGraph).filter(v => v !== null).length,
      twitterCount: Object.values(twitter).filter(v => v !== null).length
    };

    return NextResponse.json({
      projectName: projectData.name,
      projectUrl: projectData.domain,
      analyzedUrl: targetUrl,
      basic,
      openGraph,
      twitter,
      seo,
      socialImages,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Meta tags analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze meta tags' },
      { status: 500 }
    );
  }
}
