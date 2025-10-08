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
          'User-Agent': 'Mozilla/5.0 (compatible; Privacy-Analyzer/1.0)',
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

    // Store raw HTML for pattern matching
    const rawHtml = html;
    const analysis = {
      url: projectUrl,
      timestamp: new Date().toISOString(),
      score: 0,
      summary: '',
      cookieBanner: {
        detected: false,
        position: 'unknown',
        hasRejectButton: false,
        hasAcceptButton: false,
        hasSettingsLink: false,
        detectionMethod: 'none',
        confidence: 0,
        cmpProvider: null,
        loadedVia: null,
        note: null,
        textAnalysis: {
          mentionsGDPR: false,
          mentionsCookies: false,
          explainsPurpose: false,
          providesDetails: false
        },
        bannerText: ''
      },
      gtm: {
        detected: false,
        containerId: null,
        dataLayerFound: false
      },
      detectedCMPs: [],
      cookies: {
        total: 0,
        categories: {
          necessary: 0,
          analytics: 0,
          marketing: 0,
          functional: 0,
          unknown: 0
        },
        thirdParty: [],
        domains: []
      },
      gdprCompliance: {
        hasPrivacyPolicy: false,
        hasImprint: false,
        hasContactInfo: false,
        optInMechanism: false,
        rightToWithdraw: false,
        dataPortability: false,
        rightToErasure: false,
        privacyPolicyLinks: [],
        imprintLinks: []
      },
      consentManagement: {
        platform: 'none',
        detected: false,
        iabTcfCompliant: false,
        granularSettings: false,
        consentString: null,
        providers: []
      },
      thirdPartyServices: {
        analytics: [],
        marketing: [],
        social: [],
        other: []
      },
      recommendations: []
    };

    // Analyze Cookie Banner (with GTM support)
    analyzeCookieBannerWithGTM(document, rawHtml, analysis);

    // Analyze Scripts for Third-Party Services and Cookie Detection
    analyzeThirdPartyServices(document, analysis);

    // Analyze GDPR Compliance Elements
    analyzeGDPRCompliance(document, analysis);

    // Analyze Consent Management Platform
    analyzeConsentManagement(document, analysis);

    // Calculate Privacy Score
    calculatePrivacyScore(analysis);

    // Generate Recommendations
    generatePrivacyRecommendations(analysis);

    // Generate Summary
    generatePrivacySummary(analysis);

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Privacy analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error during privacy analysis' },
      { status: 500 }
    );
  }
}

function detectGTMImplementation(document, html) {
  const gtm = {
    detected: false,
    containerId: null,
    dataLayerFound: false
  };

  // Check for GTM container
  if (html.includes('gtm.js') || html.includes('googletagmanager.com')) {
    gtm.detected = true;
    // Extract GTM container ID
    const match = html.match(/GTM-[A-Z0-9]+/);
    if (match) {
      gtm.containerId = match[0];
    }
  }

  // Check for dataLayer
  if (html.includes('dataLayer') || html.includes('window.dataLayer')) {
    gtm.dataLayerFound = true;
  }

  return gtm;
}

function detectCMPScripts(document, html) {
  const cmpPatterns = [
    {
      name: 'OneTrust',
      patterns: [
        /cdn\.cookielaw\.org/i,
        /optanon/i,
        /onetrust/i,
        /otSDKStub/i
      ],
      confidence: 0.95
    },
    {
      name: 'Cookiebot',
      patterns: [
        /consent\.cookiebot\.com/i,
        /cookiebot\.com\/uc\.js/i,
        /CookieConsent/i
      ],
      confidence: 0.95
    },
    {
      name: 'Usercentrics',
      patterns: [
        /usercentrics\.eu/i,
        /app\.usercentrics/i,
        /privacy-proxy\.usercentrics/i
      ],
      confidence: 0.9
    },
    {
      name: 'ConsentManager',
      patterns: [
        /consentmanager\.net/i,
        /consentmanager\.mgr/i,
        /cmp\.consentmanager/i
      ],
      confidence: 0.9
    },
    {
      name: 'Iubenda',
      patterns: [
        /iubenda\.com/i,
        /_iub_cs/i,
        /cdn\.iubenda/i
      ],
      confidence: 0.85
    },
    {
      name: 'Quantcast Choice',
      patterns: [
        /quantcast\.mgr\.consensu\.org/i,
        /__tcfapi/i,
        /quantserve\.com/i
      ],
      confidence: 0.85
    },
    {
      name: 'Didomi',
      patterns: [
        /sdk\.privacy-center\.org/i,
        /didomi/i,
        /didomi-host/i
      ],
      confidence: 0.85
    },
    {
      name: 'Termly',
      patterns: [
        /app\.termly\.io/i,
        /termly\.io\/api/i
      ],
      confidence: 0.85
    },
    {
      name: 'Osano',
      patterns: [
        /osano\.com/i,
        /cmp\.osano/i
      ],
      confidence: 0.85
    },
    {
      name: 'CookieScript',
      patterns: [
        /cookie-script\.com/i,
        /cookiescript/i
      ],
      confidence: 0.8
    },
    {
      name: 'Complianz',
      patterns: [
        /complianz/i,
        /cmplz/i
      ],
      confidence: 0.8
    },
    {
      name: 'CookieYes',
      patterns: [
        /cookieyes\.com/i,
        /cky-consent/i
      ],
      confidence: 0.8
    }
  ];

  const detected = [];

  cmpPatterns.forEach(cmp => {
    // Check if any pattern matches
    const matched = cmp.patterns.some(pattern => pattern.test(html));

    if (matched) {
      detected.push({
        name: cmp.name,
        confidence: cmp.confidence,
        loadedVia: 'script-tag'
      });
    }
  });

  return detected;
}

function analyzeCookieBannerWithGTM(document, html, analysis) {
  // First, try static DOM analysis
  const staticBanner = analyzeStaticCookieBanner(document);

  // Detect GTM
  const gtm = detectGTMImplementation(document, html);
  analysis.gtm = gtm;

  // Detect CMP scripts
  const cmpScripts = detectCMPScripts(document, html);
  analysis.detectedCMPs = cmpScripts;

  // Combine results
  if (staticBanner.detected) {
    // Banner definitely present in static DOM
    analysis.cookieBanner = {
      ...staticBanner,
      detectionMethod: 'static-dom',
      confidence: 1.0,
      loadedVia: gtm.detected ? 'possibly-gtm-or-direct' : 'direct-embed'
    };

    // Add CMP info if detected
    if (cmpScripts.length > 0) {
      analysis.cookieBanner.cmpProvider = cmpScripts[0].name;
    }
  } else if (cmpScripts.length > 0) {
    // CMP script found but banner not in static DOM
    // Banner is likely loaded dynamically
    const topCMP = cmpScripts[0];

    analysis.cookieBanner.detected = true;
    analysis.cookieBanner.detectionMethod = 'cmp-script';
    analysis.cookieBanner.confidence = topCMP.confidence;
    analysis.cookieBanner.cmpProvider = topCMP.name;
    analysis.cookieBanner.loadedVia = gtm.detected ? 'google-tag-manager' : 'direct-script';
    analysis.cookieBanner.note = 'Cookie-Banner wird dynamisch geladen. Details können nur nach dem Rendern der Seite ermittelt werden.';

    // We can't determine buttons in dynamic banner, but assume modern CMP has them
    analysis.cookieBanner.hasAcceptButton = true; // Most CMPs have this
    analysis.cookieBanner.hasRejectButton = topCMP.confidence >= 0.9; // High-quality CMPs usually have reject
    analysis.cookieBanner.hasSettingsLink = topCMP.confidence >= 0.85; // Modern CMPs have settings

    // Set text analysis based on CMP provider reputation
    analysis.cookieBanner.textAnalysis.mentionsGDPR = true; // Professional CMPs mention GDPR
    analysis.cookieBanner.textAnalysis.mentionsCookies = true;
    analysis.cookieBanner.textAnalysis.explainsPurpose = topCMP.confidence >= 0.9;
    analysis.cookieBanner.textAnalysis.providesDetails = topCMP.confidence >= 0.85;
  } else {
    // No banner detected
    analysis.cookieBanner.detectionMethod = 'none';
    analysis.cookieBanner.confidence = 0;
  }
}

function analyzeStaticCookieBanner(document) {
  // Original analyzeCookieBanner logic, but returns result instead of modifying analysis
  const result = {
    detected: false,
    position: 'unknown',
    hasRejectButton: false,
    hasAcceptButton: false,
    hasSettingsLink: false,
    textAnalysis: {
      mentionsGDPR: false,
      mentionsCookies: false,
      explainsPurpose: false,
      providesDetails: false
    },
    bannerText: ''
  };

  // Common cookie banner selectors and keywords
  const bannerSelectors = [
    '[class*="cookie"]',
    '[id*="cookie"]',
    '[class*="consent"]',
    '[id*="consent"]',
    '[class*="privacy"]',
    '[id*="privacy"]',
    '[class*="gdpr"]',
    '[id*="gdpr"]'
  ];

  const cookieKeywords = ['cookie', 'cookies', 'consent', 'privacy', 'gdpr', 'dsgvo', 'datenschutz'];
  const gdprKeywords = ['gdpr', 'dsgvo', 'datenschutz', 'privacy policy', 'datenschutzerklärung'];

  let bannerElement = null;
  let bannerText = '';

  // Try to find cookie banner
  for (const selector of bannerSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent?.toLowerCase() || '';
      const hasKeyword = cookieKeywords.some(keyword => text.includes(keyword));

      if (hasKeyword && text.length > 50 && text.length < 2000) {
        bannerElement = element;
        bannerText = element.textContent || '';
        break;
      }
    }
    if (bannerElement) break;
  }

  if (bannerElement) {
    result.detected = true;
    result.bannerText = bannerText;

    // Determine position
    const style = bannerElement.style;
    const classList = bannerElement.className.toLowerCase();
    if (classList.includes('bottom') || style.bottom) {
      result.position = 'bottom';
    } else if (classList.includes('top') || style.top) {
      result.position = 'top';
    } else if (classList.includes('modal') || classList.includes('center')) {
      result.position = 'modal';
    }

    // Check for buttons
    const buttons = bannerElement.querySelectorAll('button, a, [role="button"]');
    buttons.forEach(button => {
      const buttonText = button.textContent?.toLowerCase() || '';
      if (buttonText.includes('accept') || buttonText.includes('akzeptieren') || buttonText.includes('zustimmen')) {
        result.hasAcceptButton = true;
      }
      if (buttonText.includes('reject') || buttonText.includes('ablehnen') || buttonText.includes('verweigern')) {
        result.hasRejectButton = true;
      }
      if (buttonText.includes('settings') || buttonText.includes('einstellungen') || buttonText.includes('konfigurieren')) {
        result.hasSettingsLink = true;
      }
    });

    // Text analysis
    const lowerText = bannerText.toLowerCase();
    result.textAnalysis.mentionsGDPR = gdprKeywords.some(keyword => lowerText.includes(keyword));
    result.textAnalysis.mentionsCookies = cookieKeywords.some(keyword => lowerText.includes(keyword));
    result.textAnalysis.explainsPurpose = lowerText.includes('zweck') || lowerText.includes('purpose') || lowerText.includes('verwendung');
    result.textAnalysis.providesDetails = lowerText.length > 200;
  }

  return result;
}

function analyzeThirdPartyServices(document, analysis) {
  // Common third-party services patterns
  const servicePatterns = {
    analytics: [
      { name: 'Google Analytics', pattern: /google-analytics|googletagmanager|gtag/, domain: 'google-analytics.com' },
      { name: 'Adobe Analytics', pattern: /adobe.*analytics|omniture/, domain: 'adobe.com' },
      { name: 'Matomo', pattern: /matomo|piwik/, domain: 'matomo.org' },
      { name: 'Hotjar', pattern: /hotjar/, domain: 'hotjar.com' },
      { name: 'Mixpanel', pattern: /mixpanel/, domain: 'mixpanel.com' }
    ],
    marketing: [
      { name: 'Facebook Pixel', pattern: /facebook.*pixel|fbevents/, domain: 'facebook.com' },
      { name: 'Google Ads', pattern: /googleadservices|googlesyndication/, domain: 'google.com' },
      { name: 'LinkedIn Insight', pattern: /linkedin.*insight|bizographics/, domain: 'linkedin.com' },
      { name: 'Twitter Pixel', pattern: /twitter.*pixel|analytics\.twitter/, domain: 'twitter.com' },
      { name: 'TikTok Pixel', pattern: /tiktok.*pixel|analytics\.tiktok/, domain: 'tiktok.com' }
    ],
    social: [
      { name: 'Facebook SDK', pattern: /facebook.*sdk|connect\.facebook/, domain: 'facebook.com' },
      { name: 'Twitter Widgets', pattern: /platform\.twitter|twitter.*widgets/, domain: 'twitter.com' },
      { name: 'LinkedIn Share', pattern: /platform\.linkedin/, domain: 'linkedin.com' },
      { name: 'YouTube Embed', pattern: /youtube.*embed|youtube-nocookie/, domain: 'youtube.com' }
    ],
    other: [
      { name: 'Recaptcha', pattern: /recaptcha|google.*recaptcha/, domain: 'google.com' },
      { name: 'Stripe', pattern: /stripe/, domain: 'stripe.com' },
      { name: 'PayPal', pattern: /paypal/, domain: 'paypal.com' },
      { name: 'Cloudflare', pattern: /cloudflare/, domain: 'cloudflare.com' }
    ]
  };

  // Analyze all scripts
  const scripts = document.querySelectorAll('script[src]');
  const domains = new Set();

  scripts.forEach(script => {
    const src = script.getAttribute('src') || '';

    // Extract domain
    try {
      const url = new URL(src.startsWith('//') ? 'https:' + src : src);
      const domain = url.hostname;
      if (!domain.includes(new URL(analysis.url).hostname)) {
        domains.add(domain);
      }
    } catch (e) {
      // Invalid URL, skip
    }

    // Check against known services
    Object.entries(servicePatterns).forEach(([category, services]) => {
      services.forEach(service => {
        if (service.pattern.test(src)) {
          analysis.thirdPartyServices[category].push({
            name: service.name,
            detected: true,
            source: 'script',
            url: src
          });

          // Estimate cookie usage
          if (category === 'analytics') {
            analysis.cookies.categories.analytics += 2;
          } else if (category === 'marketing') {
            analysis.cookies.categories.marketing += 3;
          } else if (category === 'social') {
            analysis.cookies.categories.functional += 1;
          }
        }
      });
    });
  });

  analysis.cookies.domains = Array.from(domains);
  analysis.cookies.total = Object.values(analysis.cookies.categories).reduce((a, b) => a + b, 0);
}

function analyzeGDPRCompliance(document, analysis) {
  // Look for privacy policy links
  const privacyLinks = document.querySelectorAll('a[href*="privacy"], a[href*="datenschutz"], a[href*="privacidad"]');
  const imprintLinks = document.querySelectorAll('a[href*="imprint"], a[href*="impressum"], a[href*="legal"]');

  analysis.gdprCompliance.hasPrivacyPolicy = privacyLinks.length > 0;
  analysis.gdprCompliance.hasImprint = imprintLinks.length > 0;

  // Collect links
  privacyLinks.forEach(link => {
    analysis.gdprCompliance.privacyPolicyLinks.push({
      text: link.textContent?.trim() || '',
      href: link.getAttribute('href') || ''
    });
  });

  imprintLinks.forEach(link => {
    analysis.gdprCompliance.imprintLinks.push({
      text: link.textContent?.trim() || '',
      href: link.getAttribute('href') || ''
    });
  });

  // Check for contact information
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phonePattern = /(\+\d{1,3}[- ]?)?\d{1,14}/;
  const bodyText = document.body?.textContent || '';

  analysis.gdprCompliance.hasContactInfo = emailPattern.test(bodyText) || phonePattern.test(bodyText);

  // Check for GDPR rights mentions
  const gdprRightsKeywords = [
    'right to erasure', 'recht auf löschung',
    'data portability', 'datenportabilität',
    'withdraw consent', 'einwilligung widerrufen'
  ];

  gdprRightsKeywords.forEach(keyword => {
    if (bodyText.toLowerCase().includes(keyword.toLowerCase())) {
      if (keyword.includes('erasure') || keyword.includes('löschung')) {
        analysis.gdprCompliance.rightToErasure = true;
      }
      if (keyword.includes('portability') || keyword.includes('portabilität')) {
        analysis.gdprCompliance.dataPortability = true;
      }
      if (keyword.includes('withdraw') || keyword.includes('widerrufen')) {
        analysis.gdprCompliance.rightToWithdraw = true;
      }
    }
  });
}

function analyzeConsentManagement(document, analysis) {
  // Known CMP providers
  const cmpProviders = [
    { name: 'OneTrust', patterns: ['onetrust', 'optanon'] },
    { name: 'Cookiebot', patterns: ['cookiebot', 'cookieconsent'] },
    { name: 'TrustArc', patterns: ['trustarc', 'truste'] },
    { name: 'Quantcast Choice', patterns: ['quantcast', 'qcmp'] },
    { name: 'ConsentManager', patterns: ['consentmanager'] },
    { name: 'Usercentrics', patterns: ['usercentrics'] },
    { name: 'Didomi', patterns: ['didomi'] },
    { name: 'Termly', patterns: ['termly'] }
  ];

  const allText = document.documentElement.outerHTML.toLowerCase();
  const scripts = document.querySelectorAll('script');

  cmpProviders.forEach(provider => {
    provider.patterns.forEach(pattern => {
      if (allText.includes(pattern)) {
        analysis.consentManagement.detected = true;
        analysis.consentManagement.platform = provider.name;
        analysis.consentManagement.providers.push(provider.name);
      }
    });
  });

  // Check for IAB TCF compliance indicators
  if (allText.includes('__tcfapi') || allText.includes('iabtcf') || allText.includes('tc string')) {
    analysis.consentManagement.iabTcfCompliant = true;
  }

  // Check for granular settings
  if (analysis.cookieBanner.hasSettingsLink || allText.includes('cookie settings') || allText.includes('cookie-einstellungen')) {
    analysis.consentManagement.granularSettings = true;
  }
}

function calculatePrivacyScore(analysis) {
  let score = 0;
  let maxScore = 0;

  // Cookie Banner (25 points)
  maxScore += 25;
  if (analysis.cookieBanner.detected) {
    score += 10;
    if (analysis.cookieBanner.hasRejectButton) score += 5;
    if (analysis.cookieBanner.hasAcceptButton) score += 3;
    if (analysis.cookieBanner.hasSettingsLink) score += 4;
    if (analysis.cookieBanner.textAnalysis.mentionsGDPR) score += 3;
  }

  // GDPR Compliance (30 points)
  maxScore += 30;
  if (analysis.gdprCompliance.hasPrivacyPolicy) score += 8;
  if (analysis.gdprCompliance.hasImprint) score += 6;
  if (analysis.gdprCompliance.hasContactInfo) score += 4;
  if (analysis.gdprCompliance.rightToErasure) score += 4;
  if (analysis.gdprCompliance.dataPortability) score += 4;
  if (analysis.gdprCompliance.rightToWithdraw) score += 4;

  // Consent Management (25 points)
  maxScore += 25;
  if (analysis.consentManagement.detected) {
    score += 10;
    if (analysis.consentManagement.iabTcfCompliant) score += 8;
    if (analysis.consentManagement.granularSettings) score += 7;
  }

  // Third-Party Services Management (20 points)
  maxScore += 20;
  const totalServices = Object.values(analysis.thirdPartyServices).flat().length;
  if (totalServices === 0) {
    score += 20; // No third-party services is perfect
  } else if (analysis.consentManagement.detected && totalServices > 0) {
    score += 15; // Has services but manages them
  } else if (totalServices <= 3) {
    score += 10; // Few services
  } else if (totalServices <= 6) {
    score += 5; // Moderate services
  }
  // Many unmanaged services get 0 points

  analysis.score = Math.round((score / maxScore) * 100);
}

function generatePrivacyRecommendations(analysis) {
  // Cookie Banner Recommendations
  if (!analysis.cookieBanner.detected) {
    analysis.recommendations.push({
      title: 'Cookie-Banner implementieren',
      description: 'Ein Cookie-Banner ist für DSGVO-Compliance erforderlich',
      priority: 'high',
      category: 'compliance'
    });
  } else {
    if (!analysis.cookieBanner.hasRejectButton) {
      analysis.recommendations.push({
        title: 'Ablehnungs-Button hinzufügen',
        description: 'Users müssen Cookies einfach ablehnen können',
        priority: 'high',
        category: 'compliance'
      });
    }
    if (!analysis.cookieBanner.hasSettingsLink) {
      analysis.recommendations.push({
        title: 'Cookie-Einstellungen anbieten',
        description: 'Granulare Cookie-Kontrolle für bessere Compliance',
        priority: 'medium',
        category: 'ux'
      });
    }
  }

  // GDPR Compliance Recommendations
  if (!analysis.gdprCompliance.hasPrivacyPolicy) {
    analysis.recommendations.push({
      title: 'Datenschutzerklärung hinzufügen',
      description: 'Eine vollständige Datenschutzerklärung ist gesetzlich erforderlich',
      priority: 'high',
      category: 'compliance'
    });
  }

  if (!analysis.gdprCompliance.hasImprint) {
    analysis.recommendations.push({
      title: 'Impressum hinzufügen',
      description: 'Ein Impressum ist in Deutschland und der EU erforderlich',
      priority: 'high',
      category: 'compliance'
    });
  }

  if (!analysis.gdprCompliance.rightToErasure) {
    analysis.recommendations.push({
      title: 'Recht auf Löschung implementieren',
      description: 'Users müssen ihre Daten löschen lassen können',
      priority: 'medium',
      category: 'compliance'
    });
  }

  // CMP Recommendations
  if (!analysis.consentManagement.detected && analysis.cookies.total > 3) {
    analysis.recommendations.push({
      title: 'Consent Management Platform verwenden',
      description: 'Professionelle Cookie-Verwaltung für bessere Compliance',
      priority: 'medium',
      category: 'compliance'
    });
  }

  // Third-Party Services
  const totalServices = Object.values(analysis.thirdPartyServices).flat().length;
  if (totalServices > 5 && !analysis.consentManagement.detected) {
    analysis.recommendations.push({
      title: 'Third-Party Services überprüfen',
      description: 'Viele externe Dienste gefunden - Einwilligungen erforderlich',
      priority: 'medium',
      category: 'compliance'
    });
  }
}

function generatePrivacySummary(analysis) {
  if (analysis.score >= 90) {
    analysis.summary = 'Ausgezeichnete Privacy-Compliance! Alle wichtigen DSGVO-Anforderungen erfüllt.';
  } else if (analysis.score >= 75) {
    analysis.summary = 'Gute Privacy-Compliance. Einige kleinere Verbesserungen möglich.';
  } else if (analysis.score >= 50) {
    analysis.summary = 'Grundlegende Privacy-Elemente vorhanden. Wichtige Verbesserungen erforderlich.';
  } else if (analysis.score >= 25) {
    analysis.summary = 'Unzureichende Privacy-Compliance. Dringende Maßnahmen erforderlich.';
  } else {
    analysis.summary = 'Kritische Privacy-Mängel. Sofortige DSGVO-Compliance-Maßnahmen nötig.';
  }
}