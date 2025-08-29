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
      sql: 'SELECT id, project_id, title, description, url, status, selected_area, jira_key, title_en, description_en, screenshot, screenshot_url, created_at FROM tasks WHERE project_id = ? ORDER BY created_at DESC LIMIT 20',
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

    // Get current German time with proper timezone info
    const now = new Date();
    const germanTime = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(now).replace(' ', 'T') + '+02:00'; // Add CEST timezone offset

    // Determine screenshot type and storage strategy
    let screenshotUrl = null;
    let screenshotFilename = null;
    let screenshotBlob = null;
    
    if (screenshot) {
      // Check if it's a filename (R2), URL, or base64 data
      if (screenshot.startsWith('data:')) {
        // Base64 data - upload to R2 using AWS SDK v2
        console.log('Uploading screenshot to R2 using AWS SDK v2...');
        console.log('Environment check:', {
          hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
          hasBucket: !!process.env.CLOUDFLARE_R2_BUCKET,
          hasAccessKey: !!process.env.CLOUDFLARE_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.CLOUDFLARE_SECRET_ACCESS_KEY
        });
        
        try {
          const { uploadDataUrlToR2 } = await import('@/lib/cloudflare-r2-v2.ts');
          console.log('R2 v2 function imported successfully');
          const uploadResult = await uploadDataUrlToR2(screenshot);
          console.log('R2 v2 upload result:', uploadResult);
          
          if (uploadResult.success) {
            screenshotFilename = uploadResult.filename;
            screenshotUrl = uploadResult.url;
            console.log('R2 v2 upload SUCCESS:', { filename: screenshotFilename, url: screenshotUrl });
          } else {
            console.error('R2 v2 upload FAILED:', uploadResult.error);
            throw new Error(`R2 v2 upload failed: ${uploadResult.error}`);
          }
        } catch (error) {
          console.error('R2 v2 upload EXCEPTION:', error.message);
          console.error('Stack trace:', error.stack);
          throw new Error(`R2 v2 upload exception: ${error.message}`);
        }
      } else if (screenshot.startsWith('http')) {
        // Full URL - extract filename and store both
        screenshotUrl = screenshot;
        screenshotFilename = screenshot.split('/').pop(); // Extract filename from URL
      } else if (screenshot.includes('.png') || screenshot.includes('.jpg') || screenshot.includes('.jpeg')) {
        // Filename only - store filename and construct R2 URL
        screenshotFilename = screenshot;
        screenshotUrl = `https://pub-${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev/screenshots/${screenshot}`;
      } else {
        // Unknown format - treat as blob
        screenshotBlob = screenshot;
      }
    }

    const result = await db.execute({
      sql: `
        INSERT INTO tasks (project_id, title, description, screenshot, screenshot_url, url, selected_area, title_en, description_en, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        projectId, // Now using the resolved numeric project ID
        title,
        description || null,
        screenshotFilename || screenshotBlob || null, // Filename preferred, fallback to base64
        screenshotUrl || null,  // R2 URLs and external URLs
        url,
        selected_area ? JSON.stringify(selected_area) : null,
        title_en || null,
        description_en || null,
        germanTime
      ]
    });

    const taskId = Number(result.lastInsertRowid);

    return addCorsHeaders(Response.json({
      id: taskId,
      project_id: Number(projectId),
      title,
      description,
      screenshot: screenshotFilename || screenshotBlob,
      screenshot_url: screenshotUrl,
      url,
      status: 'open',
      selected_area,
      title_en,
      description_en,
      created_at: germanTime
    }));

  } catch (error) {
    return addCorsHeaders(new Response(`Fehler beim Erstellen der Task: ${error.message}`, { status: 500 }));
  }
}