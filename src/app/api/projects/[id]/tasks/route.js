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
  try {
    const resolvedParams = await params;
    await initDatabase();
    const db = getDb();

    const result = await db.execute({
      sql: 'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
      args: [resolvedParams.id]
    });

    // Process screenshots to ensure proper URLs
    const processedRows = result.rows.map(row => {
      let screenshotDisplay = null;
      
      if (row.screenshot_url) {
        // Use the R2 URL
        screenshotDisplay = row.screenshot_url;
      } else if (row.screenshot && row.screenshot.startsWith('data:')) {
        // Use base64 data as fallback
        screenshotDisplay = row.screenshot;
      } else if (row.screenshot && !row.screenshot.startsWith('data:')) {
        // Construct R2 URL from filename
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
    console.error('Error fetching tasks:', error);
    return addCorsHeaders(new Response('Fehler beim Laden der Tasks', { status: 500 }));
  }
}

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const { title, description, screenshot, url, selected_area, title_en, description_en } = await request.json();

    console.log('📝 Task creation request:', {
      title,
      description,
      screenshot,
      screenshot_type: typeof screenshot,
      screenshot_length: screenshot ? screenshot.length : 0,
      url,
      selected_area,
      title_en,
      description_en
    });

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
        console.error('Project not found:', projectName);
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
        // Base64 data - store as blob (fallback)
        screenshotBlob = screenshot;
        console.log('Screenshot type: Base64 blob (fallback)');
      } else if (screenshot.startsWith('http')) {
        // Full URL - extract filename and store both
        screenshotUrl = screenshot;
        screenshotFilename = screenshot.split('/').pop(); // Extract filename from URL
        console.log('Screenshot type: Full URL');
      } else if (screenshot.includes('.png') || screenshot.includes('.jpg') || screenshot.includes('.jpeg')) {
        // Filename only - store filename and construct R2 URL
        screenshotFilename = screenshot;
        screenshotUrl = `https://pub-${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev/screenshots/${screenshot}`;
        console.log('Screenshot type: Filename -> R2 URL:', screenshotUrl);
        console.log('Screenshot filename stored:', screenshotFilename);
      } else {
        // Unknown format - treat as blob
        screenshotBlob = screenshot;
        console.log('Screenshot type: Unknown format -> blob');
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
    console.error('Error creating task:', error);
    console.error('Error details:', {
      projectId: resolvedParams?.id,
      error: error.message,
      stack: error.stack
    });
    return addCorsHeaders(new Response(`Fehler beim Erstellen der Task: ${error.message}`, { status: 500 }));
  }
}