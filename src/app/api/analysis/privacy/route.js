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
        containerId: null
      },
      detectedCMPs: [],
      gdprCompliance: {
        hasPrivacyPolicy: false,
        hasImprint: false,
        hasContactInfo: false,
        privacyPolicyLinks: [],
        imprintLinks: [],
        contactLinks: []
      },
      consentManagement: {
        platform: 'none',
        detected: false
      },
      thirdPartyServices: {
        analytics: [],
        marketing: [],
        social: [],
        other: []
      }
    };

    // Analyze Cookie Banner (with GTM support)
    analyzeCookieBannerWithGTM(document, rawHtml, analysis);

    // Analyze Scripts for Third-Party Services and Cookie Detection
    analyzeThirdPartyServices(document, analysis);

    // Analyze GDPR Compliance Elements
    analyzeGDPRCompliance(document, analysis);

    // Analyze Consent Management Platform
    analyzeConsentManagement(document, analysis);

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Privacy analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error during privacy analysis' },
      { status: 500 }
    );
  }
}


function detectGTMImplementation(html) {
  const gtm = {
    detected: false,
    containerId: null
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

  // Pattern: Look for Next.js gtmId configuration
  const gtmConfigMatch = html.match(/["']gtmId["']\s*:\s*["']([^"']+)["']/);
  if (gtmConfigMatch && !gtm.containerId) {
    gtm.containerId = gtmConfigMatch[1];
    gtm.detected = true;
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
        /usercentrics/i,
        /uc\.js/i,
        /settingsId/i,
        /window\.UC_UI/i,
        /aggregator\.usercentrics/i,
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
    },
    {
      name: 'Borlabs Cookie',
      patterns: [
        /borlabs.*cookie/i,
        /borlabsCookie/i,
        /BorlabsCookie/i
      ],
      confidence: 0.85
    },
    {
      name: 'Klaro',
      patterns: [
        /klaro/i,
        /klaro\.js/i,
        /klaroConfig/i
      ],
      confidence: 0.8
    },
    {
      name: 'CookieFirst',
      patterns: [
        /cookiefirst/i,
        /cookiefirst\.com/i
      ],
      confidence: 0.8
    },
    {
      name: 'Cookie Information',
      patterns: [
        /cookie-information/i,
        /cookieinformation/i,
        /consent\.cookieinformation/i
      ],
      confidence: 0.8
    },
    {
      name: 'TrustCommander',
      patterns: [
        /trustcommander/i,
        /tagcommander/i
      ],
      confidence: 0.8
    },
    {
      name: 'Axeptio',
      patterns: [
        /axeptio/i,
        /static\.axept\.io/i
      ],
      confidence: 0.8
    },
    {
      name: 'CookiePro',
      patterns: [
        /cookiepro/i,
        /cookie-cdn\.cookiepro/i
      ],
      confidence: 0.8
    }
  ];

  const detected = [];

  cmpPatterns.forEach(cmp => {
    const matched = cmp.patterns.some(pattern => pattern.test(html));

    if (matched) {
      detected.push({
        name: cmp.name,
        confidence: cmp.confidence,
        loadedVia: 'script-tag'
      });
    }
  });

  // If no specific CMP found, check for generic cookie consent patterns
  if (detected.length === 0) {
    const genericPatterns = [
      { pattern: /window\.cookieconsent/i, name: 'Generic CookieConsent' },
      { pattern: /cookieConsent\.run/i, name: 'Generic CookieConsent' },
      { pattern: /gdpr.*cookie/i, name: 'GDPR Cookie Banner' },
      { pattern: /cookie.*notice/i, name: 'Cookie Notice' },
      { pattern: /privacy.*consent/i, name: 'Privacy Consent' },
      { pattern: /cookielawinfo/i, name: 'Cookie Law Info' },
      { pattern: /cookie.*compliance/i, name: 'Cookie Compliance' }
    ];

    for (const generic of genericPatterns) {
      if (generic.pattern.test(html)) {
        detected.push({
          name: generic.name,
          confidence: 0.7,
          loadedVia: 'generic-detection'
        });
        break;
      }
    }
  }

  return detected;
}

function analyzeCookieBannerWithGTM(document, html, analysis) {
  const staticBanner = analyzeStaticCookieBanner(document);

  const gtm = detectGTMImplementation(html);
  analysis.gtm = gtm;

  const cmpScripts = detectCMPScripts(document, html);
  analysis.detectedCMPs = cmpScripts;

  if (staticBanner.detected) {
    analysis.cookieBanner = {
      ...staticBanner,
      detectionMethod: 'static-dom',
      confidence: 1.0,
      loadedVia: gtm.detected ? 'possibly-gtm-or-direct' : 'direct-embed'
    };

    if (cmpScripts.length > 0) {
      analysis.cookieBanner.cmpProvider = cmpScripts[0].name;
    }
  } else if (cmpScripts.length > 0) {
    const topCMP = cmpScripts[0];

    analysis.cookieBanner.detected = true;
    analysis.cookieBanner.detectionMethod = 'cmp-script';
    analysis.cookieBanner.confidence = topCMP.confidence;
    analysis.cookieBanner.cmpProvider = topCMP.name;
    analysis.cookieBanner.loadedVia = gtm.detected ? 'google-tag-manager' : 'direct-script';
    analysis.cookieBanner.note = 'Cookie-Banner wird dynamisch geladen. Details können nur nach dem Rendern der Seite ermittelt werden.';

    analysis.cookieBanner.hasAcceptButton = true;
    analysis.cookieBanner.hasRejectButton = topCMP.confidence >= 0.9;
    analysis.cookieBanner.hasSettingsLink = topCMP.confidence >= 0.85;

    analysis.cookieBanner.textAnalysis.mentionsGDPR = true;
    analysis.cookieBanner.textAnalysis.mentionsCookies = true;
    analysis.cookieBanner.textAnalysis.explainsPurpose = topCMP.confidence >= 0.9;
    analysis.cookieBanner.textAnalysis.providesDetails = topCMP.confidence >= 0.85;
  } else {
    analysis.cookieBanner.detectionMethod = 'none';
    analysis.cookieBanner.confidence = 0;
  }
}

function analyzeStaticCookieBanner(document) {
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

    const style = bannerElement.style;
    const classList = bannerElement.className.toLowerCase();
    if (classList.includes('bottom') || style.bottom) {
      result.position = 'bottom';
    } else if (classList.includes('top') || style.top) {
      result.position = 'top';
    } else if (classList.includes('modal') || classList.includes('center')) {
      result.position = 'modal';
    }

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

    const lowerText = bannerText.toLowerCase();
    result.textAnalysis.mentionsGDPR = gdprKeywords.some(keyword => lowerText.includes(keyword));
    result.textAnalysis.mentionsCookies = cookieKeywords.some(keyword => lowerText.includes(keyword));
    result.textAnalysis.explainsPurpose = lowerText.includes('zweck') || lowerText.includes('purpose') || lowerText.includes('verwendung');
    result.textAnalysis.providesDetails = lowerText.length > 200;
  }

  return result;
}

function analyzeThirdPartyServices(document, analysis) {
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

  const scripts = document.querySelectorAll('script[src]');

  scripts.forEach(script => {
    const src = script.getAttribute('src') || '';

    Object.entries(servicePatterns).forEach(([category, services]) => {
      services.forEach(service => {
        if (service.pattern.test(src)) {
          analysis.thirdPartyServices[category].push({
            name: service.name,
            detected: true,
            source: 'script',
            url: src
          });
        }
      });
    });
  });
}

function analyzeGDPRCompliance(document, analysis) {
  // Extended patterns for privacy policy links
  const privacyPatterns = [
    'privacy', 'datenschutz', 'privacidad', 'confidentialité',
    'protezione-dati', 'protection-données', 'privacy-policy',
    'datenschutzerklärung', 'politica-de-privacidad'
  ];

  // Extended patterns for imprint links
  const imprintPatterns = [
    'imprint', 'impressum', 'legal', 'mentions', 'aviso-legal',
    'note-legali', 'legal-notice', 'rechtliches'
  ];

  // Extended patterns for contact links
  const contactPatterns = [
    'contact', 'kontakt', 'contacto', 'contatto', 'get-in-touch',
    'kontaktieren', 'kontaktformular', 'contactez'
  ];

  // Find all links
  const allLinks = document.querySelectorAll('a[href]');

  allLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    const text = link.textContent?.trim().toLowerCase() || '';
    const hrefLower = href.toLowerCase();

    // Check privacy policy
    if (privacyPatterns.some(pattern => hrefLower.includes(pattern) || text.includes(pattern))) {
      analysis.gdprCompliance.hasPrivacyPolicy = true;
      if (analysis.gdprCompliance.privacyPolicyLinks.length < 5) {
        analysis.gdprCompliance.privacyPolicyLinks.push({
          text: link.textContent?.trim() || 'Privacy Policy',
          href: href
        });
      }
    }

    // Check imprint
    if (imprintPatterns.some(pattern => hrefLower.includes(pattern) || text.includes(pattern))) {
      analysis.gdprCompliance.hasImprint = true;
      if (analysis.gdprCompliance.imprintLinks.length < 5) {
        analysis.gdprCompliance.imprintLinks.push({
          text: link.textContent?.trim() || 'Imprint',
          href: href
        });
      }
    }

    // Check contact
    if (contactPatterns.some(pattern => hrefLower.includes(pattern) || text.includes(pattern))) {
      if (analysis.gdprCompliance.contactLinks.length < 5) {
        analysis.gdprCompliance.contactLinks.push({
          text: link.textContent?.trim() || 'Contact',
          href: href
        });
      }
    }
  });

  // Check for contact information
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phonePattern = /(\+\d{1,3}[- ]?)?\d{1,14}/;
  const bodyText = document.body?.textContent || '';

  analysis.gdprCompliance.hasContactInfo = 
    emailPattern.test(bodyText) || 
    phonePattern.test(bodyText) ||
    analysis.gdprCompliance.contactLinks.length > 0;
}

function analyzeConsentManagement(document, analysis) {
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

  cmpProviders.forEach(provider => {
    provider.patterns.forEach(pattern => {
      if (allText.includes(pattern)) {
        analysis.consentManagement.detected = true;
        analysis.consentManagement.platform = provider.name;
      }
    });
  });
}
