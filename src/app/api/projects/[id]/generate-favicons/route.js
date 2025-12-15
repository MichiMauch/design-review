import { NextResponse } from 'next/server';
import { favicons } from 'favicons';

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { imageData, imageUrl, appName } = body;

    if (!imageData && !imageUrl) {
      return NextResponse.json(
        { error: 'Either imageData (base64) or imageUrl is required' },
        { status: 400 }
      );
    }

    let source;

    if (imageData) {
      // Convert base64 to buffer
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      source = Buffer.from(base64Data, 'base64');
    } else if (imageUrl) {
      // Fetch image from URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch image from URL' },
          { status: 400 }
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      source = Buffer.from(arrayBuffer);
    }

    // Configure favicon generation
    const configuration = {
      path: '/',
      appName: appName || 'My App',
      appShortName: appName || 'App',
      appDescription: '',
      developerName: null,
      developerURL: null,
      cacheBustingQueryParam: null,
      dir: 'auto',
      lang: 'de-CH',
      background: '#ffffff',
      theme_color: '#ffffff',
      appleStatusBarStyle: 'black-translucent',
      display: 'standalone',
      orientation: 'any',
      scope: '/',
      start_url: '/',
      preferRelatedApplications: false,
      relatedApplications: undefined,
      version: '1.0',
      pixel_art: false,
      loadManifestWithCredentials: false,
      manifestMaskable: true,
      icons: {
        android: true,
        appleIcon: true,
        appleStartup: false, // Skip startup images to reduce size
        favicons: true,
        windows: true,
        yandex: false,
      },
    };

    // Generate favicons
    const response = await favicons(source, configuration);

    // Convert images to base64 for JSON response
    const images = response.images.map((image) => ({
      name: image.name,
      contents: `data:image/png;base64,${image.contents.toString('base64')}`,
      size: image.contents.length,
    }));

    // Get HTML tags
    const html = response.html;

    // Get manifest and other files
    const files = response.files.map((file) => ({
      name: file.name,
      contents: file.contents,
    }));

    return NextResponse.json({
      success: true,
      images,
      html,
      files,
      summary: {
        totalImages: images.length,
        totalFiles: files.length,
      },
    });
  } catch (error) {
    console.error('Favicon generation error:', error);
    return NextResponse.json(
      { error: `Failed to generate favicons: ${error.message}` },
      { status: 500 }
    );
  }
}
