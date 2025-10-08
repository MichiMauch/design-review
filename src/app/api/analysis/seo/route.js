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
          'User-Agent': 'Mozilla/5.0 (compatible; SEO-Analyzer/1.0)',
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
      titleMeta: {},
      headings: [],
      headingAnalysis: '',
      links: {
        internal: 0,
        external: 0,
        total: 0,
        issues: []
      },
      images: {
        total: 0,
        withAlt: 0,
        missingAlt: 0
      },
      recommendations: []
    };

    // Analyze Title and Meta Description
    const title = document.querySelector('title');
    const metaDescription = document.querySelector('meta[name="description"]');

    if (title) {
      const titleText = title.textContent.trim();
      const titleLength = titleText.length;

      analysis.titleMeta.title = {
        content: titleText,
        length: titleLength,
        status: titleLength >= 30 && titleLength <= 60 ? 'good' :
                titleLength < 30 ? 'warning' : 'error',
        recommendation: titleLength < 30 ? 'Title zu kurz (< 30 Zeichen)' :
                        titleLength > 60 ? 'Title zu lang (> 60 Zeichen)' :
                        'Title-Länge optimal'
      };
    } else {
      analysis.titleMeta.title = {
        content: '',
        length: 0,
        status: 'error',
        recommendation: 'Kein Title-Tag gefunden'
      };
      analysis.recommendations.push({
        title: 'Title-Tag fehlt',
        description: 'Fügen Sie einen aussagekräftigen Title-Tag hinzu (30-60 Zeichen)',
        priority: 'high'
      });
    }

    if (metaDescription) {
      const descText = metaDescription.getAttribute('content').trim();
      const descLength = descText.length;

      analysis.titleMeta.description = {
        content: descText,
        length: descLength,
        status: descLength >= 120 && descLength <= 160 ? 'good' :
                descLength < 120 ? 'warning' : 'error',
        recommendation: descLength < 120 ? 'Meta Description zu kurz (< 120 Zeichen)' :
                        descLength > 160 ? 'Meta Description zu lang (> 160 Zeichen)' :
                        'Meta Description-Länge optimal'
      };
    } else {
      analysis.recommendations.push({
        title: 'Meta Description fehlt',
        description: 'Fügen Sie eine Meta Description hinzu (120-160 Zeichen)',
        priority: 'high'
      });
    }

    // Analyze Heading Structure
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let h1Count = 0;

    headings.forEach(heading => {
      const level = heading.tagName.toLowerCase();
      const text = heading.textContent.trim();

      if (level === 'h1') h1Count++;

      analysis.headings.push({
        level,
        text,
        length: text.length
      });
    });

    // Heading analysis
    if (h1Count === 0) {
      analysis.headingAnalysis = 'Keine H1-Überschrift gefunden. Fügen Sie eine H1 hinzu.';
      analysis.recommendations.push({
        title: 'H1-Überschrift fehlt',
        description: 'Jede Seite sollte genau eine H1-Überschrift haben',
        priority: 'high'
      });
    } else if (h1Count > 1) {
      analysis.headingAnalysis = `${h1Count} H1-Überschriften gefunden. Verwenden Sie nur eine H1 pro Seite.`;
      analysis.recommendations.push({
        title: 'Mehrere H1-Überschriften',
        description: 'Verwenden Sie nur eine H1-Überschrift pro Seite',
        priority: 'medium'
      });
    } else {
      analysis.headingAnalysis = 'Heading-Struktur ist korrekt.';
    }

    // Analyze Links
    const links = document.querySelectorAll('a[href]');
    const domain = new URL(projectUrl).hostname;

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      analysis.links.total++;

      try {
        if (href.startsWith('http')) {
          const linkDomain = new URL(href).hostname;
          if (linkDomain === domain) {
            analysis.links.internal++;
          } else {
            analysis.links.external++;
          }
        } else if (href.startsWith('/') || !href.includes('://')) {
          analysis.links.internal++;
        }
      } catch (e) {
        analysis.links.issues.push(`Ungültige URL: ${href}`);
      }
    });

    // Analyze Images
    const images = document.querySelectorAll('img');
    analysis.images.total = images.length;

    images.forEach(img => {
      const alt = img.getAttribute('alt');
      if (alt && alt.trim()) {
        analysis.images.withAlt++;
      }
    });

    analysis.images.missingAlt = analysis.images.total - analysis.images.withAlt;

    if (analysis.images.missingAlt > 0) {
      analysis.recommendations.push({
        title: 'Fehlende Alt-Texte',
        description: `${analysis.images.missingAlt} Bilder ohne Alt-Text gefunden`,
        priority: 'medium'
      });
    }

    // Content Analysis
    const textContent = document.body ? document.body.textContent.trim() : '';
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

    // Store page content for AI suggestions
    analysis.pageContent = textContent.substring(0, 2000); // First 2000 chars for AI

    if (wordCount < 300) {
      analysis.recommendations.push({
        title: 'Wenig Content',
        description: `Nur ${wordCount} Wörter gefunden. Mindestens 300 Wörter empfohlen.`,
        priority: 'medium'
      });
    }

    // Calculate SEO Score
    let score = 0;
    let maxScore = 0;

    // Title (25 points)
    maxScore += 25;
    if (analysis.titleMeta.title && analysis.titleMeta.title.status === 'good') {
      score += 25;
    } else if (analysis.titleMeta.title && analysis.titleMeta.title.status === 'warning') {
      score += 15;
    }

    // Meta Description (20 points)
    maxScore += 20;
    if (analysis.titleMeta.description && analysis.titleMeta.description.status === 'good') {
      score += 20;
    } else if (analysis.titleMeta.description && analysis.titleMeta.description.status === 'warning') {
      score += 10;
    }

    // Headings (20 points)
    maxScore += 20;
    if (h1Count === 1) {
      score += 20;
    } else if (h1Count > 1) {
      score += 10;
    }

    // Images with Alt (15 points)
    maxScore += 15;
    if (analysis.images.total > 0) {
      score += Math.round((analysis.images.withAlt / analysis.images.total) * 15);
    }

    // Content length (10 points)
    maxScore += 10;
    if (wordCount >= 300) {
      score += 10;
    } else if (wordCount >= 150) {
      score += 5;
    }

    // Links (10 points)
    maxScore += 10;
    if (analysis.links.internal > 0 && analysis.links.total > 0) {
      score += 10;
    }

    analysis.score = Math.round((score / maxScore) * 100);

    // Generate summary
    if (analysis.score >= 90) {
      analysis.summary = 'Ausgezeichnete SEO-Optimierung! Ihre Seite ist sehr gut optimiert.';
    } else if (analysis.score >= 70) {
      analysis.summary = 'Gute SEO-Basis vorhanden. Einige Verbesserungen möglich.';
    } else if (analysis.score >= 50) {
      analysis.summary = 'Grundlegende SEO-Elemente vorhanden. Deutliche Verbesserungen empfohlen.';
    } else {
      analysis.summary = 'SEO-Optimierung dringend erforderlich. Viele wichtige Elemente fehlen.';
    }

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('SEO analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error during SEO analysis' },
      { status: 500 }
    );
  }
}