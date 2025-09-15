import { getDb, initDatabase } from '../../../../../../lib/db.js';

function addCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return addCorsHeaders(new Response(null, { status: 200 }));
}

export async function GET(request, { params }) {
  let resolvedParams;
  try {
    resolvedParams = await params;
    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: 'SELECT id, project_id, title, description, url, status, selected_area, jira_key, title_en, description_en, screenshot, screenshot_url, sort_order, created_at FROM tasks WHERE project_id = ? ORDER BY COALESCE(sort_order, 999), created_at DESC',
      args: [resolvedParams.id]
    });

    // Process screenshots to ensure proper URLs
    const processedRows = result.rows.map(row => {
      let screenshotDisplay = null;

      if (row.screenshot_url) {
        // Use the R2 URL
        screenshotDisplay = row.screenshot_url;
      } else if (row.screenshot && !row.screenshot.startsWith('data:')) {
        // Construct R2 URL from filename (for older entries without screenshot_url)
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'cac1d67ee1dc4cb6814dff593983d703';
        screenshotDisplay = `https://pub-${accountId}.r2.dev/screenshots/${row.screenshot}`;
      }

      return {
        ...row,
        screenshot_display: screenshotDisplay
      };
    });

    return addCorsHeaders(Response.json(processedRows));

  } catch (error) {
    console.error('Error loading tasks for project', resolvedParams?.id || 'unknown', ':', error);
    return addCorsHeaders(new Response(`Fehler beim Laden der Tasks: ${error.message}`, { status: 500 }));
  }
}

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const { title, description, screenshot, url, selected_area, title_en, description_en } = await request.json();


    if (!title || !url) {
      return addCorsHeaders(new Response('Titel und URL sind erforderlich', { status: 400 }));
    }

    await initDatabase();
    const db = getDb();

    // Handle both numeric IDs and project names
    let projectId = resolvedParams.id;

    // If the ID is not numeric, treat it as a project name and find the actual ID
    if (isNaN(Number(projectId))) {
      // Decode URL-encoded project name
      const projectName = decodeURIComponent(projectId);

      const projectResult = await db.execute({
        sql: 'SELECT id FROM projects WHERE name = ?',
        args: [projectName]
      });

      if (projectResult.rows.length === 0) {
        return addCorsHeaders(new Response(`Project '${projectName}' nicht gefunden`, { status: 404 }));
      }

      projectId = projectResult.rows[0].id;
    }

    // Use SQLite's datetime function for consistent timezone handling

    // R2 Upload only - no Data URL storage
    let screenshotUrl = null;
    let screenshotFilename = null;

    if (screenshot && screenshot.startsWith('data:')) {
      console.log('=== R2 UPLOAD PROCESS START ===');
      console.log('Environment check:', {
        hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        hasAccessKey: !!process.env.CLOUDFLARE_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.CLOUDFLARE_SECRET_ACCESS_KEY
      });

      // Extract content type and base64 data
      const matches = screenshot.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        console.error('Invalid data URL format');
        return addCorsHeaders(new Response('Invalid screenshot format', { status: 400 }));
      }

      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Generate filename
      const ext = contentType.split('/')[1] || 'png';
      const timestamp = Date.now();
      const filename = `task-${timestamp}.${ext}`;
      const key = `screenshots/${filename}`;

      console.log('Upload details:', {
        contentType,
        bufferSize: buffer.length,
        filename,
        key
      });

      // Setup S3 client
      const AWS = await import('aws-sdk');
      const https = await import('https');
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'cac1d67ee1dc4cb6814dff593983d703';

      const s3 = new AWS.default.S3({
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
        region: 'auto',
        sslEnabled: true,
        httpOptions: {
          agent: https.default.globalAgent,
          timeout: 120000,
        }
      });

      try {
        console.log('Starting S3 putObject...');
        await s3.putObject({
          Bucket: 'review',
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }).promise();

        screenshotFilename = filename;
        screenshotUrl = `https://pub-${accountId}.r2.dev/${key}`;

        console.log('=== R2 UPLOAD SUCCESS ===');
        console.log('Filename:', screenshotFilename);
        console.log('URL:', screenshotUrl);

      } catch (error) {
        console.error('=== R2 UPLOAD FAILED ===');
        console.error('Error:', error.message);
        console.error('Error code:', error.code);
        console.error('Stack:', error.stack);
        return addCorsHeaders(new Response(`Screenshot upload failed: ${error.message}`, { status: 500 }));
      }
    } else if (screenshot) {
      console.log('Non-data URL screenshot received:', screenshot.substring(0, 100));
      return addCorsHeaders(new Response('Only data URL screenshots are supported', { status: 400 }));
    }

    const result = await db.execute({
      sql: `
        INSERT INTO tasks (project_id, title, description, screenshot, screenshot_url, url, selected_area, title_en, description_en, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `,
      args: [
        projectId, // Now using the resolved numeric project ID
        title,
        description || null,
        screenshotFilename || null, // Only filename, no Data URLs
        screenshotUrl || null,  // R2 URLs and external URLs
        url,
        selected_area ? JSON.stringify(selected_area) : null,
        title_en || null,
        description_en || null
      ]
    });

    const taskId = Number(result.lastInsertRowid);

    return addCorsHeaders(Response.json({
      id: taskId,
      project_id: Number(projectId),
      title,
      description,
      screenshot: screenshotFilename,
      screenshot_url: screenshotUrl,
      url,
      status: 'open',
      selected_area,
      title_en,
      description_en,
      created_at: new Date().toISOString()
    }));

  } catch (error) {
    return addCorsHeaders(new Response(`Fehler beim Erstellen der Task: ${error.message}`, { status: 500 }));
  }
}