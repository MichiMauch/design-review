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
      sql: 'SELECT *, COALESCE(screenshot_url, screenshot) as screenshot_display FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
      args: [resolvedParams.id]
    });

    return addCorsHeaders(Response.json(result.rows));

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return addCorsHeaders(new Response('Fehler beim Laden der Tasks', { status: 500 }));
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

    // Determine if screenshot is a URL or base64 data
    const isScreenshotUrl = screenshot && (screenshot.startsWith('http') || screenshot.startsWith('https'));
    const screenshotUrl = isScreenshotUrl ? screenshot : null;
    const screenshotBlob = !isScreenshotUrl ? screenshot : null;

    console.log('Screenshot type:', isScreenshotUrl ? 'URL' : 'Base64/Blob');
    console.log('Screenshot URL:', screenshotUrl);

    const result = await db.execute({
      sql: `
        INSERT INTO tasks (project_id, title, description, screenshot, screenshot_url, url, selected_area, title_en, description_en, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        projectId, // Now using the resolved numeric project ID
        title,
        description || null,
        screenshotBlob || null, // Legacy screenshot field for base64 data
        screenshotUrl || null,  // New field for R2 URLs
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
      screenshot: screenshotBlob,
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