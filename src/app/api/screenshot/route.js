import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { uploadScreenshotToR2 } from '../../../lib/cloudflare-r2';
import sharp from 'sharp';

// CORS Headers
function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new Response(null, { status: 200 }));
}

// Playwright configuration for Vercel serverless
const PLAYWRIGHT_CONFIG = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=VizDisplayCompositor'
  ]
};

// External screenshot service as fallback
const NODEHIVE_API_URL = 'https://preview.nodehive.com/api/screenshot';

// Crop screenshot to selected area
async function cropScreenshot(imageBuffer, selectionArea, viewportWidth, viewportHeight, scrollX = 0, scrollY = 0) {
  if (!selectionArea) {
    return imageBuffer; // Return original if no selection
  }
  
  try {
    console.log('=== CROP DEBUG INFO ===');
    console.log('Selection area received (absolute coordinates):', selectionArea);
    console.log('Viewport dimensions received:', { viewportWidth, viewportHeight });
    console.log('Scroll position:', { scrollX, scrollY });
    
    // Get image metadata
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    console.log('Screenshot actual dimensions:', { width: metadata.width, height: metadata.height });
    
    // Convert absolute coordinates to viewport-relative coordinates
    // The screenshot shows content starting from scroll position
    const relativeX = selectionArea.x - scrollX;
    const relativeY = selectionArea.y - scrollY;
    
    console.log('Converted to viewport-relative coordinates:', { relativeX, relativeY, width: selectionArea.width, height: selectionArea.height });
    
    // Calculate scaling factors between screenshot and viewport
    const scaleX = metadata.width / viewportWidth;
    const scaleY = metadata.height / viewportHeight;
    console.log('Calculated scale factors:', { scaleX, scaleY });
    
    // Scale viewport-relative coordinates to screenshot space
    const cropX = Math.round(relativeX * scaleX);
    const cropY = Math.round(relativeY * scaleY);
    const cropWidth = Math.round(selectionArea.width * scaleX);
    const cropHeight = Math.round(selectionArea.height * scaleY);
    
    console.log('Raw crop coordinates (before bounds check):', { cropX, cropY, cropWidth, cropHeight });
    
    // Ensure crop coordinates are within bounds
    const maxX = Math.max(0, Math.min(cropX, metadata.width - 1));
    const maxY = Math.max(0, Math.min(cropY, metadata.height - 1));
    const maxWidth = Math.min(cropWidth, metadata.width - maxX);
    const maxHeight = Math.min(cropHeight, metadata.height - maxY);
    
    console.log('Final crop parameters:', { left: maxX, top: maxY, width: maxWidth, height: maxHeight });
    console.log('=== END CROP DEBUG ===');
    
    // Validate crop parameters
    if (maxWidth <= 0 || maxHeight <= 0) {
      console.warn('Invalid crop dimensions, returning original image');
      return imageBuffer;
    }
    
    const croppedBuffer = await image
      .extract({ left: maxX, top: maxY, width: maxWidth, height: maxHeight })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    console.log('Screenshot successfully cropped');
    return croppedBuffer;
  } catch (error) {
    console.error('Error cropping screenshot:', error);
    return imageBuffer; // Return original on error
  }
}

async function createScreenshotWithPlaywright(url, options = {}) {
  const { 
    width = 1920, 
    height = 1080, 
    quality = 90, 
    fullPage = false, 
    waitTime = 2000,
    actualViewportWidth,
    actualViewportHeight,
    scrollX = 0,
    scrollY = 0
  } = options;
  
  // Use actual viewport dimensions for browser context if provided
  const viewportWidth = actualViewportWidth || width;
  const viewportHeight = actualViewportHeight || height;
  
  console.log('Playwright: Browser viewport will be:', { viewportWidth, viewportHeight });
  console.log('Playwright: Screenshot dimensions will be:', { width, height });
  console.log('Playwright: Target scroll position:', { scrollX, scrollY });
  
  // Check if we're on Vercel and Playwright is available
  const isVercel = process.env.VERCEL === '1';
  console.log('Playwright: Running on Vercel:', isVercel);
  console.log('Playwright: Environment check - Node version:', process.version);
  console.log('Playwright: Environment check - Platform:', process.platform);
  
  // Try to check if chromium is available
  let browser = null;
  try {
    console.log('Playwright: Starting browser...');
    
    if (isVercel) {
      // On Vercel, try with minimal config first
      console.log('Playwright: Using Vercel-optimized config...');
      browser = await chromium.launch({
        ...PLAYWRIGHT_CONFIG,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
      });
    } else {
      browser = await chromium.launch(PLAYWRIGHT_CONFIG);
    }
    
    console.log('Playwright: Browser launched successfully');
    
    const context = await browser.newContext({
      viewport: { width: viewportWidth, height: viewportHeight },
      deviceScaleFactor: 1,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Set timeout and handle console logs
    page.setDefaultTimeout(30000);
    
    // Block unnecessary resources for faster loading
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    console.log(`Playwright: Navigating to ${url}...`);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for any dynamic content
    if (waitTime > 0) {
      await page.waitForTimeout(waitTime);
    }
    
    // Try to dismiss common modals/popups
    try {
      await page.click('[aria-label*="close"], [aria-label*="Close"], .modal-close, .popup-close', { timeout: 1000 });
    } catch {
      // Ignore if no modal found
    }
    
    // Scroll to the user's current position if provided
    if (scrollX > 0 || scrollY > 0) {
      console.log(`Playwright: Scrolling to position ${scrollX}, ${scrollY}...`);
      await page.evaluate(({ x, y }) => {
        window.scrollTo(x, y);
      }, { x: scrollX, y: scrollY });
      
      // Wait a bit for scroll to complete
      await page.waitForTimeout(500);
    }
    
    console.log('Playwright: Taking screenshot...');
    
    // Take screenshot with desired dimensions (might be higher resolution than viewport)
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: quality,
      fullPage: fullPage,
      // Force specific dimensions for the screenshot output
      ...(width !== viewportWidth || height !== viewportHeight ? {
        clip: {
          x: 0,
          y: 0,
          width: Math.min(width, viewportWidth),
          height: Math.min(height, viewportHeight)
        }
      } : {})
    });
    
    console.log('Playwright: Screenshot created successfully');
    return screenshot;
    
  } catch (error) {
    console.error('Playwright: Browser launch failed:', error.message);
    console.error('Playwright: Error details:', error);
    
    // If we're on Vercel and Playwright fails, throw immediately to use fallback
    if (isVercel) {
      throw new Error(`Playwright failed on Vercel: ${error.message}`);
    } else {
      throw error;
    }
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.warn('Playwright: Error closing browser:', closeError.message);
      }
    }
  }
}

async function createScreenshotWithFallback(url, options = {}) {
  const { width = 1920, height = 1080, actualViewportWidth, actualViewportHeight } = options;
  
  // Use actual viewport dimensions if provided
  const targetWidth = actualViewportWidth || width;
  const targetHeight = actualViewportHeight || height;
  
  console.log('Fallback: Starting screenshot with multiple services...');
  console.log('Fallback: Target dimensions:', { targetWidth, targetHeight });
  
  // Service 1: NodeHive API
  try {
    console.log('Fallback: Trying NodeHive API...');
    
    const nodeHiveUrl = new URL(NODEHIVE_API_URL);
    nodeHiveUrl.searchParams.set('url', url);
    nodeHiveUrl.searchParams.set('resX', targetWidth.toString());
    nodeHiveUrl.searchParams.set('resY', targetHeight.toString());
    nodeHiveUrl.searchParams.set('outFormat', 'jpeg');
    nodeHiveUrl.searchParams.set('waitTime', '3000');
    nodeHiveUrl.searchParams.set('isFullPage', 'false');
    
    const response = await fetch(nodeHiveUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/jpeg,image/*,*/*',
      },
      signal: AbortSignal.timeout(20000) // 20 seconds
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      console.log('Fallback: NodeHive response content type:', contentType);
      
      if (contentType && contentType.includes('image')) {
        const imageBuffer = await response.arrayBuffer();
        console.log('Fallback: NodeHive image buffer size:', imageBuffer.byteLength);
        
        if (imageBuffer.byteLength > 0) {
          console.log('Fallback: NodeHive screenshot successful');
          return Buffer.from(imageBuffer);
        }
      }
    }
    
    throw new Error(`NodeHive failed: ${response.status}`);
    
  } catch (nodeHiveError) {
    console.warn('Fallback: NodeHive failed:', nodeHiveError.message);
  }
  
  // Service 2: Screenshot.rocks API
  try {
    console.log('Fallback: Trying Screenshot.rocks API...');
    
    const screenshotRocksUrl = `https://api.screenshot.rocks/screenshot?url=${encodeURIComponent(url)}&width=${targetWidth}&height=${targetHeight}&quality=85`;
    
    const response = await fetch(screenshotRocksUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*',
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (response.ok) {
      const imageBuffer = await response.arrayBuffer();
      console.log('Fallback: Screenshot.rocks buffer size:', imageBuffer.byteLength);
      
      if (imageBuffer.byteLength > 0) {
        console.log('Fallback: Screenshot.rocks successful');
        return Buffer.from(imageBuffer);
      }
    }
    
    throw new Error(`Screenshot.rocks failed: ${response.status}`);
    
  } catch (screenshotRocksError) {
    console.warn('Fallback: Screenshot.rocks failed:', screenshotRocksError.message);
  }
  
  // Service 3: htmlcsstoimage.com (if API key available)
  if (process.env.HTMLCSS_API_KEY && process.env.HTMLCSS_USER_ID) {
    try {
      console.log('Fallback: Trying htmlcsstoimage.com...');
      
      const response = await fetch('https://hcti.io/v1/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(process.env.HTMLCSS_USER_ID + ':' + process.env.HTMLCSS_API_KEY).toString('base64')
        },
        body: JSON.stringify({
          url: url,
          viewport_width: targetWidth,
          viewport_height: targetHeight,
          device_scale: 1
        }),
        signal: AbortSignal.timeout(15000)
      });
      
      if (response.ok) {
        const data = await response.json();
        // Download the image from the returned URL
        const imageResponse = await fetch(data.url);
        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer();
          console.log('Fallback: htmlcsstoimage successful');
          return Buffer.from(imageBuffer);
        }
      }
      
    } catch (htmlcssError) {
      console.warn('Fallback: htmlcsstoimage failed:', htmlcssError.message);
    }
  }
  
  // All services failed
  console.error('Fallback: All screenshot services failed');
  throw new Error('All fallback screenshot services unavailable');
}

function createPlaceholderImage() {
  // Create a simple SVG placeholder as base64
  const svg = `
    <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f8fafc"/>
      <rect x="100" y="100" width="1720" height="880" fill="white" stroke="#e2e8f0" stroke-width="4"/>
      <circle cx="960" cy="400" r="80" fill="#e2e8f0"/>
      <rect x="810" y="500" width="300" height="40" fill="#e2e8f0" rx="20"/>
      <text x="960" y="580" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="#64748b">
        Screenshot wird geladen...
      </text>
      <text x="960" y="620" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#94a3b8">
        Fallback-Service wird verwendet
      </text>
      <text x="960" y="650" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#cbd5e1">
        Vercel serverless environment - Playwright unavailable
      </text>
    </svg>
  `;
  
  const base64Svg = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64Svg}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url') || 'https://example.com';
    const width = parseInt(searchParams.get('width')) || 1920;
    const height = parseInt(searchParams.get('height')) || 1080;
    const quality = parseInt(searchParams.get('quality')) || 90;
    const fullPage = searchParams.get('fullPage') === 'true';
    const waitTime = parseInt(searchParams.get('waitTime')) || 2000;
    
    // Parse selection area if provided
    // Parse viewport dimensions and scroll position for coordinate mapping
    const actualViewportWidth = searchParams.get('actualViewportWidth');
    const actualViewportHeight = searchParams.get('actualViewportHeight');
    const scrollX = parseFloat(searchParams.get('scrollX')) || 0;
    const scrollY = parseFloat(searchParams.get('scrollY')) || 0;
    let selectionArea = null;
    const selectionParam = searchParams.get('selectionArea');
    if (selectionParam) {
      try {
        selectionArea = JSON.parse(selectionParam);
      } catch (e) {
        console.warn('Invalid selectionArea parameter:', e.message);
      }
    }
    
    console.log('Playwright Screenshot API (GET): Creating screenshot for:', url);
    if (selectionArea) {
      console.log('Selection area:', selectionArea);
      console.log('Actual viewport dimensions:', { actualViewportWidth, actualViewportHeight });
    }
    
    let imageBuffer;
    let source = 'playwright';
    
    try {
      // Try Playwright first - pass actual viewport dimensions and scroll position
      imageBuffer = await createScreenshotWithPlaywright(url, { 
        width, 
        height, 
        quality, 
        fullPage, 
        waitTime,
        actualViewportWidth: actualViewportWidth ? parseInt(actualViewportWidth) : undefined,
        actualViewportHeight: actualViewportHeight ? parseInt(actualViewportHeight) : undefined,
        scrollX,
        scrollY
      });
      
      // Crop to selected area if provided - use actual viewport dimensions for coordinate mapping
      if (selectionArea) {
        const viewportWidth = actualViewportWidth ? parseInt(actualViewportWidth) : width;
        const viewportHeight = actualViewportHeight ? parseInt(actualViewportHeight) : height;
        imageBuffer = await cropScreenshot(imageBuffer, selectionArea, viewportWidth, viewportHeight, scrollX, scrollY);
      }
    } catch (playwrightError) {
      console.warn('Playwright failed, trying fallback:', playwrightError.message);
      try {
        imageBuffer = await createScreenshotWithFallback(url, { 
          width, 
          height, 
          quality,
          actualViewportWidth,
          actualViewportHeight 
        });
        source = 'fallback';
        
        // Crop fallback image too if selection area provided
        if (selectionArea) {
          const viewportWidth = actualViewportWidth ? parseInt(actualViewportWidth) : width;
          const viewportHeight = actualViewportHeight ? parseInt(actualViewportHeight) : height;
          imageBuffer = await cropScreenshot(imageBuffer, selectionArea, viewportWidth, viewportHeight, scrollX, scrollY);
        }
      } catch (fallbackError) {
        console.error('All screenshot methods failed:', fallbackError.message);
        return addCorsHeaders(NextResponse.json({
          success: true,
          screenshot: createPlaceholderImage(),
          source: 'placeholder',
          error: 'Screenshot services unavailable'
        }));
      }
    }
    
    // Convert to base64 data URL
    const base64Screenshot = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    // Optional: Upload to R2 for persistence
    let r2Result = null;
    try {
      const fileName = `screenshot-${Date.now()}.jpg`;
      r2Result = await uploadScreenshotToR2(imageBuffer, fileName, 'image/jpeg');
    } catch (r2Error) {
      console.warn('R2 upload failed:', r2Error.message);
    }
    
    return addCorsHeaders(NextResponse.json({
      success: true,
      screenshot: base64Screenshot,
      source: source,
      r2Url: r2Result?.url || null,
      r2Filename: r2Result?.filename || null
    }));
    
  } catch (error) {
    console.error('Screenshot API (GET) error:', error);
    return addCorsHeaders(NextResponse.json(
      { 
        success: true, 
        screenshot: createPlaceholderImage(),
        source: 'placeholder',
        error: error.message 
      },
      { status: 200 } // Return 200 to avoid breaking the widget
    ));
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      url, 
      width = 1920, 
      height = 1080, 
      quality = 90, 
      fullPage = false, 
      waitTime = 2000, 
      selectionArea,
      actualViewportWidth,
      actualViewportHeight,
      scrollX = 0,
      scrollY = 0
    } = body;
    
    if (!url) {
      return addCorsHeaders(NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      ));
    }
    
    console.log('Playwright Screenshot API (POST): Creating screenshot for:', url);
    if (selectionArea) {
      console.log('Selection area:', selectionArea);
      console.log('Actual viewport dimensions:', { actualViewportWidth, actualViewportHeight });
      console.log('Screenshot dimensions:', { width, height });
      console.log('Scroll position:', { scrollX, scrollY });
    }
    
    let imageBuffer;
    let source = 'playwright';
    
    try {
      // Try Playwright first - pass actual viewport dimensions and scroll position
      imageBuffer = await createScreenshotWithPlaywright(url, { 
        width, 
        height, 
        quality, 
        fullPage, 
        waitTime,
        actualViewportWidth,
        actualViewportHeight,
        scrollX,
        scrollY
      });
      
      // Crop to selected area if provided - use actual viewport dimensions for coordinate mapping
      if (selectionArea) {
        const viewportWidth = actualViewportWidth || width;
        const viewportHeight = actualViewportHeight || height;
        imageBuffer = await cropScreenshot(imageBuffer, selectionArea, viewportWidth, viewportHeight, scrollX, scrollY);
      }
    } catch (playwrightError) {
      console.warn('Playwright failed, trying fallback:', playwrightError.message);
      try {
        imageBuffer = await createScreenshotWithFallback(url, { 
          width, 
          height, 
          quality,
          actualViewportWidth,
          actualViewportHeight 
        });
        source = 'fallback';
        
        // Crop fallback image too if selection area provided
        if (selectionArea) {
          const viewportWidth = actualViewportWidth || width;
          const viewportHeight = actualViewportHeight || height;
          imageBuffer = await cropScreenshot(imageBuffer, selectionArea, viewportWidth, viewportHeight, scrollX, scrollY);
        }
      } catch (fallbackError) {
        console.error('All screenshot methods failed:', fallbackError.message);
        return addCorsHeaders(NextResponse.json({
          success: true,
          screenshot: createPlaceholderImage(),
          source: 'placeholder',
          error: 'Screenshot services unavailable'
        }));
      }
    }
    
    // Convert to base64 data URL
    const base64Screenshot = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    // Optional: Upload to R2 for persistence
    let r2Result = null;
    try {
      const fileName = `screenshot-${Date.now()}.jpg`;
      r2Result = await uploadScreenshotToR2(imageBuffer, fileName, 'image/jpeg');
    } catch (r2Error) {
      console.warn('R2 upload failed:', r2Error.message);
    }
    
    return addCorsHeaders(NextResponse.json({
      success: true,
      screenshot: base64Screenshot,
      source: source,
      r2Url: r2Result?.url || null,
      r2Filename: r2Result?.filename || null
    }));
    
  } catch (error) {
    console.error('Screenshot API (POST) error:', error);
    return addCorsHeaders(NextResponse.json(
      { 
        success: true, 
        screenshot: createPlaceholderImage(),
        source: 'placeholder',
        error: error.message 
      },
      { status: 200 } // Return 200 to avoid breaking the widget
    ));
  }
}
