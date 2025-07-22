import { NextResponse } from 'next/server';
import { uploadScreenshotToR2 } from '../../../lib/cloudflare-r2';

function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new Response(null, { status: 200 }));
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const screenshotFile = formData.get('screenshot');
    const projectId = formData.get('projectId');

    if (!screenshotFile) {
      return addCorsHeaders(NextResponse.json({ error: 'Screenshot ist erforderlich' }, { status: 400 }));
    }

    // Convert file to buffer
    const arrayBuffer = await screenshotFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${projectId || 'unknown'}-${timestamp}.png`;

    // Upload to Cloudflare R2
    const result = await uploadScreenshotToR2(buffer, filename, 'image/png');

    return addCorsHeaders(NextResponse.json({ 
      url: result.url,
      filename: result.filename
    }));

  } catch (error) {
    return addCorsHeaders(NextResponse.json(
      { error: 'Fehler beim Hochladen des Screenshots' },
      { status: 500 }
    ));
  }
}