import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { screenshot, projectId, taskId } = await request.json();

    if (!screenshot) {
      return NextResponse.json({ error: 'Screenshot ist erforderlich' }, { status: 400 });
    }

    // Convert base64 to buffer
    const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `screenshots/${projectId}/${taskId || 'temp'}-${timestamp}.png`;

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/png'
    });

    return NextResponse.json({ 
      url: blob.url,
      filename: filename
    });

  } catch (error) {
    console.error('Screenshot upload failed:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hochladen des Screenshots' },
      { status: 500 }
    );
  }
}