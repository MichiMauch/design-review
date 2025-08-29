import { getDb, initDatabase } from '../../../../../../../../lib/db.js';

function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new Response(null, { status: 200 }));
}

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const url = new URL(request.url);
    const format = url.searchParams.get('format'); // 'json' or 'image' (default: image)
    
    await initDatabase();
    const db = getDb();

    // Get the screenshot data for this specific task
    const result = await db.execute({
      sql: 'SELECT screenshot, screenshot_url FROM tasks WHERE id = ? AND project_id = ?',
      args: [resolvedParams.taskId, resolvedParams.id]
    });

    if (result.rows.length === 0) {
      return addCorsHeaders(new Response('Task not found', { status: 404 }));
    }

    const task = result.rows[0];
    
    // If format=json is requested, return the old JSON format
    if (format === 'json') {
      let screenshotUrl = null;

      if (task.screenshot_url) {
        screenshotUrl = task.screenshot_url;
      } else if (task.screenshot) {
        if (task.screenshot.startsWith('data:')) {
          screenshotUrl = task.screenshot;
        } else if (task.screenshot.startsWith('http')) {
          screenshotUrl = task.screenshot;
        } else if (task.screenshot.includes('.png') || task.screenshot.includes('.jpg') || task.screenshot.includes('.jpeg')) {
          const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'cac1d67ee1dc4cb6814dff593983d703';
          screenshotUrl = `https://pub-${accountId}.r2.dev/screenshots/${task.screenshot}`;
        }
      }

      if (!screenshotUrl) {
        return addCorsHeaders(new Response('No screenshot available', { status: 404 }));
      }

      return addCorsHeaders(Response.json({ 
        screenshot_url: screenshotUrl,
        task_id: resolvedParams.taskId 
      }));
    }
    
    // Default: serve the actual image data
    let imageData = null;
    let contentType = 'image/png';

    if (task.screenshot) {
      if (task.screenshot.startsWith('data:')) {
        // Extract base64 data from data URL
        const matches = task.screenshot.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          contentType = matches[1];
          const base64Data = matches[2];
          imageData = Buffer.from(base64Data, 'base64');
        }
      } else if (task.screenshot.startsWith('http')) {
        // Fetch from external URL
        try {
          const response = await fetch(task.screenshot);
          if (response.ok) {
            imageData = Buffer.from(await response.arrayBuffer());
            contentType = response.headers.get('content-type') || 'image/png';
          }
        } catch (error) {
          console.error('Error fetching external screenshot:', error);
        }
      }
    }

    if (!imageData) {
      return addCorsHeaders(new Response('No image data available', { status: 404 }));
    }

    return addCorsHeaders(new Response(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      }
    }));

  } catch (error) {
    console.error('Error loading screenshot for task:', error);
    return addCorsHeaders(new Response(`Error loading screenshot: ${error.message}`, { status: 500 }));
  }
}