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
      security: {
        ssl: {
          isSecure: false,
          certificate: null,
          errors: []
        },
        headers: {
          securityHeaders: [],
          missingHeaders: [],
          recommendations: []
        },
        content: {
          mixedContent: [],
          externalResources: [],
          insecureLinks: []
        },
        vulnerabilities: []
      }
    };

    // Check SSL/TLS
    const isHTTPS = projectUrl.startsWith('https://');
    analysis.security.ssl.isSecure = isHTTPS;
    
    if (!isHTTPS) {
      analysis.security.ssl.errors.push({
        type: 'no-https',
        message: 'Website verwendet kein HTTPS',
        severity: 'high'
      });
    }

    // Fetch the project's HTML and headers
    let html;
    let responseHeaders;
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
      responseHeaders = response.headers;
    } catch (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch project URL', details: fetchError.message },
        { status: 502 }
      );
    }

    // Parse HTML with JSDOM
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Analyze Security Headers
    const securityHeaderChecks = [
      {
        name: 'Strict-Transport-Security',
        description: 'HSTS Header',
        importance: 'high',
        recommendation: 'Fügt HSTS Header hinzu um HTTPS zu erzwingen'
      },
      {
        name: 'Content-Security-Policy',
        description: 'Content Security Policy',
        importance: 'high',
        recommendation: 'CSP Header schützt vor XSS-Attacken'
      },
      {
        name: 'X-Frame-Options',
        description: 'Clickjacking Schutz',
        importance: 'medium',
        recommendation: 'Verhindert Einbettung in Frames (Clickjacking)'
      },
      {
        name: 'X-Content-Type-Options',
        description: 'MIME-Type Sniffing Schutz',
        importance: 'medium',
        recommendation: 'Verhindert MIME-Type Sniffing'
      },
      {
        name: 'Referrer-Policy',
        description: 'Referrer Policy',
        importance: 'low',
        recommendation: 'Kontrolliert Referrer-Informationen'
      },
      {
        name: 'Permissions-Policy',
        description: 'Feature Policy',
        importance: 'low',
        recommendation: 'Kontrolliert Browser-Features'
      }
    ];

    securityHeaderChecks.forEach(check => {
      const headerValue = responseHeaders.get(check.name.toLowerCase());
      if (headerValue) {
        analysis.security.headers.securityHeaders.push({
          name: check.name,
          value: headerValue,
          description: check.description,
          status: 'present'
        });
      } else {
        analysis.security.headers.missingHeaders.push({
          name: check.name,
          description: check.description,
          importance: check.importance,
          recommendation: check.recommendation
        });
      }
    });

    // Check for mixed content
    const httpResources = [];
    
    // Check images
    const images = document.querySelectorAll('img[src]');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('http://')) {
        httpResources.push({
          type: 'image',
          url: src,
          element: 'img'
        });
      }
    });

    // Check scripts
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && src.startsWith('http://')) {
        httpResources.push({
          type: 'script',
          url: src,
          element: 'script'
        });
      }
    });

    // Check stylesheets
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"][href]');
    stylesheets.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('http://')) {
        httpResources.push({
          type: 'stylesheet',
          url: href,
          element: 'link'
        });
      }
    });

    analysis.security.content.mixedContent = httpResources;

    // Check for insecure links
    const links = document.querySelectorAll('a[href]');
    const insecureLinks = [];
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('http://')) {
        insecureLinks.push({
          url: href,
          text: link.textContent?.trim() || '[Kein Text]'
        });
      }
    });
    analysis.security.content.insecureLinks = insecureLinks;

    // Analyze external resources
    const externalResources = [];
    [...scripts, ...stylesheets].forEach(element => {
      const src = element.getAttribute('src') || element.getAttribute('href');
      if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
        try {
          const url = new URL(src);
          const currentUrl = new URL(projectUrl);
          if (url.hostname !== currentUrl.hostname) {
            externalResources.push({
              type: element.tagName.toLowerCase(),
              url: src,
              domain: url.hostname
            });
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });
    analysis.security.content.externalResources = externalResources;

    // Check for common vulnerabilities in HTML
    const vulnerabilities = [];

    // Check for inline scripts (potential XSS risk)
    const inlineScripts = document.querySelectorAll('script:not([src])');
    if (inlineScripts.length > 0) {
      vulnerabilities.push({
        type: 'inline-scripts',
        severity: 'medium',
        message: 'Inline JavaScript gefunden',
        description: `${inlineScripts.length} Inline-Scripts gefunden. Diese können XSS-Risiken darstellen.`,
        recommendation: 'Verwenden Sie externe JavaScript-Dateien und CSP.'
      });
    }

    // Check for eval() usage (potential code injection)
    if (html.includes('eval(')) {
      vulnerabilities.push({
        type: 'eval-usage',
        severity: 'high',
        message: 'eval() Funktion verwendet',
        description: 'Die eval() Funktion kann zu Code-Injection führen.',
        recommendation: 'Vermeiden Sie die Verwendung von eval().'
      });
    }

    // Check for document.write (potential XSS)
    if (html.includes('document.write')) {
      vulnerabilities.push({
        type: 'document-write',
        severity: 'medium',
        message: 'document.write() verwendet',
        description: 'document.write() kann XSS-Angriffe ermöglichen.',
        recommendation: 'Verwenden Sie moderne DOM-Manipulationsmethoden.'
      });
    }

    // Check for forms without CSRF protection hints
    const forms = document.querySelectorAll('form');
    let formsWithoutCSRF = 0;
    forms.forEach(form => {
      const hasCSRFToken = form.querySelector('input[name*="csrf"], input[name*="token"]');
      if (!hasCSRFToken) {
        formsWithoutCSRF++;
      }
    });
    
    if (formsWithoutCSRF > 0) {
      vulnerabilities.push({
        type: 'csrf-protection',
        severity: 'medium',
        message: 'Möglicher CSRF-Schutz fehlt',
        description: `${formsWithoutCSRF} von ${forms.length} Formularen ohne erkennbaren CSRF-Schutz.`,
        recommendation: 'Implementieren Sie CSRF-Token für alle Formulare.'
      });
    }

    analysis.security.vulnerabilities = vulnerabilities;

    // Security score calculation
    let securityScore = 100;
    
    // Deduct points for missing security headers
    analysis.security.headers.missingHeaders.forEach(header => {
      if (header.importance === 'high') securityScore -= 20;
      else if (header.importance === 'medium') securityScore -= 10;
      else securityScore -= 5;
    });

    // Deduct points for vulnerabilities
    vulnerabilities.forEach(vuln => {
      if (vuln.severity === 'high') securityScore -= 25;
      else if (vuln.severity === 'medium') securityScore -= 15;
      else securityScore -= 5;
    });

    // Deduct points for mixed content
    if (httpResources.length > 0) {
      securityScore -= Math.min(30, httpResources.length * 5);
    }

    // Deduct points for not using HTTPS
    if (!isHTTPS) {
      securityScore -= 30;
    }

    securityScore = Math.max(0, securityScore);
    analysis.security.score = securityScore;

    // Summary statistics
    analysis.summary = {
      securityScore,
      isHTTPS,
      securityHeadersPresent: analysis.security.headers.securityHeaders.length,
      securityHeadersMissing: analysis.security.headers.missingHeaders.length,
      vulnerabilitiesFound: vulnerabilities.length,
      highSeverityIssues: vulnerabilities.filter(v => v.severity === 'high').length,
      mediumSeverityIssues: vulnerabilities.filter(v => v.severity === 'medium').length,
      mixedContentIssues: httpResources.length,
      externalResourcesCount: externalResources.length,
      hasCSP: analysis.security.headers.securityHeaders.some(h => h.name === 'Content-Security-Policy'),
      hasHSTS: analysis.security.headers.securityHeaders.some(h => h.name === 'Strict-Transport-Security')
    };

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Security analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}