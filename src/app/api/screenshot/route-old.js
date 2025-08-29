import { NextResponse } from 'next/server';
import { uploadScreenshotToR2 } from '../../../lib/cloudflare-r2-v2';

function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new Response(null, { status: 200 }));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const url = searchParams.get('url');
    const resX = parseInt(searchParams.get('resX') || '1280');
    const resY = parseInt(searchParams.get('resY') || '900');
    const waitTime = parseInt(searchParams.get('waitTime') || '1000');
    const isFullPage = searchParams.get('isFullPage') === 'true';
    const dismissModals = searchParams.get('dismissModals') === 'true';

    if (!url) {
      return addCorsHeaders(NextResponse.json(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      ));
    }


    // Use POST function with converted parameters
    const mockRequest = {
      json: async () => ({
        url: url,
        width: resX,
        height: resY,
        waitTime: waitTime,
        isFullPage: isFullPage,
        dismissModals: dismissModals
      })
    };
    
    return await POST(mockRequest);
    
  } catch (error) {
    return addCorsHeaders(NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 }));
  }
}

export async function POST(request) {
  try {
    const { url, width = 1920, height = 1080 } = await request.json();

    if (!url) {
      return addCorsHeaders(NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      ));
    }


    // Multiple screenshot service fallbacks for reliability
    let imageBuffer = null;
    let method = 'unknown';

    // Option 1: Try NodeHive API (primary) - CORRECTED URL
    try {
      const nodeHiveUrl = new URL('https://preview.nodehive.com/api/screenshot');
      nodeHiveUrl.searchParams.set('url', url);
      nodeHiveUrl.searchParams.set('resX', width.toString());
      nodeHiveUrl.searchParams.set('resY', height.toString());
      nodeHiveUrl.searchParams.set('outFormat', 'png');
      nodeHiveUrl.searchParams.set('waitTime', '2000');
      nodeHiveUrl.searchParams.set('isFullPage', 'false');
      

      const response = await fetch(nodeHiveUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/png,image/*,*/*',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(15000) // 15 seconds
      });

      if (response.ok) {
        imageBuffer = await response.arrayBuffer();
        method = 'nodehive';
      }
    } catch {
    }

    // Option 2: Try screenshot.rocks API (fallback)
    if (!imageBuffer) {
      try {
        const screenshotUrl = `https://api.screenshot.rocks/screenshot?url=${encodeURIComponent(url)}&width=1280&height=900&quality=80`;
        
        const response = await fetch(screenshotUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(6000) // Reduced to 6 seconds
        });

        if (response.ok) {
          imageBuffer = await response.arrayBuffer();
          method = 'screenshot-rocks';
        }
      } catch {
      }
    }

    // Option 3: Use htmlcsstoimage.com if API key available
    if (!imageBuffer && process.env.HTMLCSS_API_KEY) {
      try {
        const response = await fetch('https://hcti.io/v1/image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(process.env.HTMLCSS_USER_ID + ':' + process.env.HTMLCSS_API_KEY).toString('base64')
          },
          body: JSON.stringify({
            url: url,
            viewport_width: 1280,
            viewport_height: 900,
            device_scale: 1
          }),
          signal: AbortSignal.timeout(12000) // 12 second timeout
        });

        if (response.ok) {
          const data = await response.json();
          // Download the image from the returned URL
          const imageResponse = await fetch(data.url);
          if (imageResponse.ok) {
            imageBuffer = await imageResponse.arrayBuffer();
            method = 'htmlcss';
          }
        }
      } catch {
      }
    }

    // If all services failed, return fallback response
    if (!imageBuffer) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        fallback: true,
        error: 'All screenshot services unavailable',
        method: 'client-fallback',
        message: 'Using client-side screenshot capture'
      }));
    }

    const imageBufferNode = Buffer.from(imageBuffer);
    
    // Upload to Cloudflare R2
    const fileName = `screenshot-${Date.now()}.png`;
    const r2Result = await uploadScreenshotToR2(imageBufferNode, fileName, 'image/png');
    
    // Also keep base64 for immediate display if needed
    const base64Image = imageBufferNode.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    return addCorsHeaders(NextResponse.json({
      success: true,
      screenshot: dataUrl,
      r2Url: r2Result.url,
      r2Filename: r2Result.filename,
      method: method
    }));

  } catch (error) {
    
    // Return a fallback placeholder
    return addCorsHeaders(NextResponse.json({
      success: true,
      screenshot: createPlaceholderImage(),
      error: error.message
    }));
  }
}

function createPlaceholderImage() {
  // Create a simple SVG placeholder as base64
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <rect x="50" y="50" width="700" height="500" fill="white" stroke="#e5e7eb" stroke-width="2"/>
      <text x="400" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">
        Screenshot nicht verfügbar
      </text>
      <text x="400" y="320" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">
        Service temporär nicht erreichbar
      </text>
    </svg>
  `;
  
  const base64Svg = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64Svg}`;
}