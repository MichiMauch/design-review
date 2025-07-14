import { NextResponse } from 'next/server';
import { uploadScreenshotToR2 } from '../../../lib/cloudflare-r2.ts';

export async function POST(request) {
  try {
    const { url, selectedArea } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Use NodeHive API with correct parameters
    const nodeHiveUrl = new URL('https://preview.nodehive.com/api/screenshot');
    nodeHiveUrl.searchParams.set('url', encodeURIComponent(url));
    nodeHiveUrl.searchParams.set('resX', '1280');
    nodeHiveUrl.searchParams.set('resY', '900');
    nodeHiveUrl.searchParams.set('outFormat', 'png');
    nodeHiveUrl.searchParams.set('waitTime', '1000');
    nodeHiveUrl.searchParams.set('isFullPage', 'true');
    nodeHiveUrl.searchParams.set('dismissModals', 'true');
    
    console.log('Requesting screenshot from:', nodeHiveUrl.toString());

    const response = await fetch(nodeHiveUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`NodeHive API returned ${response.status}: ${response.statusText}`);
    }

    // Get the image as buffer
    const imageBuffer = await response.arrayBuffer();
    const imageBufferNode = Buffer.from(imageBuffer);
    
    // Upload to Cloudflare R2
    const fileName = `screenshot-${Date.now()}.png`;
    const r2Result = await uploadScreenshotToR2(imageBufferNode, fileName, 'image/png');
    
    // Also keep base64 for immediate display if needed
    const base64Image = imageBufferNode.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    return NextResponse.json({
      success: true,
      screenshot: dataUrl,
      r2Url: r2Result.url,
      r2Filename: r2Result.filename,
      selectedArea: selectedArea || null
    });

  } catch (error) {
    console.error('Screenshot API error:', error);
    
    // Return a fallback placeholder
    return NextResponse.json({
      success: true,
      screenshot: createPlaceholderImage(),
      error: error.message
    });
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