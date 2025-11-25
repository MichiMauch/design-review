import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { analyzeContent } from '@/lib/ai-service';

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
          'User-Agent': 'Mozilla/5.0 (compatible; Content-Analyzer/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'de,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000
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

    // Extract page title
    const titleElement = document.querySelector('title');
    const pageTitle = titleElement ? titleElement.textContent.trim() : '';

    // Extract headings
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headings = Array.from(headingElements).map(heading => ({
      level: heading.tagName.toLowerCase(),
      text: heading.textContent.trim()
    }));

    // Extract main text content
    // Remove script, style, nav, footer, header elements for cleaner content
    const elementsToRemove = document.querySelectorAll('script, style, nav, footer, header, aside, noscript, iframe');
    elementsToRemove.forEach(el => el.remove());

    // Get text content from body
    const bodyContent = document.body ? document.body.textContent : '';

    // Clean up the text content
    const pageContent = bodyContent
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    // Calculate word count
    const wordCount = pageContent.split(/\s+/).filter(word => word.length > 0).length;

    // Check if there's enough content to analyze
    if (wordCount < 20) {
      return NextResponse.json({
        url: projectUrl,
        timestamp: new Date().toISOString(),
        score: 0,
        error: 'Insufficient content for analysis',
        summary: 'Die Seite enthält zu wenig Text für eine Content-Analyse.',
        wordCount,
        analysis: null
      });
    }

    // Call AI service for content analysis
    const aiResult = await analyzeContent({
      url: projectUrl,
      pageContent,
      headings,
      pageTitle
    });

    // Prepare response
    const response_data = {
      url: projectUrl,
      timestamp: new Date().toISOString(),
      score: aiResult.analysis?.overallScore?.score || 0,
      summary: aiResult.analysis?.overallScore?.summary || 'Analyse konnte nicht durchgeführt werden.',
      wordCount,
      headingsCount: headings.length,
      pageTitle,
      analysis: aiResult.analysis,
      success: aiResult.success,
      error: aiResult.error || null,
      // Store content for optimization feature
      pageContent: pageContent.substring(0, 8000),
      keyTextSections: aiResult.analysis?.keyTextSections || null
    };

    return NextResponse.json(response_data);

  } catch (error) {
    console.error('Content analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error during content analysis' },
      { status: 500 }
    );
  }
}
