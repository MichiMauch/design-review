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
    let screenshotUrl = null;

    if (task.screenshot_url) {
      // Use the R2 URL directly
      screenshotUrl = task.screenshot_url;
    } else if (task.screenshot) {
      // Handle different screenshot formats
      if (task.screenshot.startsWith('data:')) {
        // Base64 data URL
        screenshotUrl = task.screenshot;
      } else if (task.screenshot.startsWith('http')) {
        // Full URL
        screenshotUrl = task.screenshot;
      } else if (task.screenshot.includes('.png') || task.screenshot.includes('.jpg') || task.screenshot.includes('.jpeg')) {
        // Filename - construct R2 URL
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

  } catch (error) {
    console.error('Error loading screenshot for task:', error);
    return addCorsHeaders(new Response(`Error loading screenshot: ${error.message}`, { status: 500 }));
  }
}