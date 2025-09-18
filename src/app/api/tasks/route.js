import { NextResponse } from 'next/server';
import { getDb, initDatabase } from '../../../../lib/db.js';

// Add CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.title || !data.url || !data.project_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const db = getDb();

    // Resolve project ID: accept numeric ID or project name
    let projectId;
    try {
      const asNumber = Number(data.project_id);
      if (!isNaN(asNumber) && String(asNumber) === String(data.project_id)) {
        // Looks like a numeric ID
        const check = await db.execute({ sql: 'SELECT id FROM projects WHERE id = ?', args: [asNumber] });
        if (check.rows.length === 0) {
          return NextResponse.json(
            { success: false, error: `Project with id '${data.project_id}' not found.` },
            { status: 404, headers: corsHeaders() }
          );
        }
        projectId = asNumber;
      } else {
        // Treat as project name
        const projectResult = await db.execute({ sql: 'SELECT id FROM projects WHERE name = ?', args: [data.project_id] });
        if (projectResult.rows.length === 0) {
          return NextResponse.json(
            { success: false, error: `Project with name '${data.project_id}' not found.` },
            { status: 404, headers: corsHeaders() }
          );
        }
        projectId = projectResult.rows[0].id;
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Failed to resolve project' }, { status: 500, headers: corsHeaders() });
    }
    
    // R2 Upload only - no Data URL storage
    let screenshotUrl = null;
    let screenshotFilename = null;
    
    if (data.screenshot && data.screenshot.startsWith('data:')) {
      console.log('=== R2 UPLOAD PROCESS START (/api/tasks) ===');
      console.log('Environment check:', {
        hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        hasAccessKey: !!process.env.CLOUDFLARE_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.CLOUDFLARE_SECRET_ACCESS_KEY
      });
      
      // Extract content type and base64 data
      const matches = data.screenshot.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        console.error('Invalid data URL format');
        return NextResponse.json(
          { success: false, error: 'Invalid screenshot format' },
          { status: 400, headers: corsHeaders() }
        );
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
        return NextResponse.json(
          { success: false, error: `Screenshot upload failed: ${error.message}` },
          { status: 500, headers: corsHeaders() }
        );
      }
    } else if (data.screenshot) {
      console.log('Non-data URL screenshot received:', data.screenshot.substring(0, 100));
      return NextResponse.json(
        { success: false, error: 'Only data URL screenshots are supported' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Process metadata if provided
    let metadataJson = null;
    if (data.metadata) {
      try {
        // Validate and structure metadata
        const metadata = {
          browser: data.metadata.browser || {},
          display: data.metadata.display || {},
          system: data.metadata.system || {},
          context: data.metadata.context || {}
        };
        metadataJson = JSON.stringify(metadata);
      } catch (error) {
        console.warn('Failed to process metadata:', error);
        // Continue without metadata if it fails
      }
    }

    // Insert task into database
    const result = await db.execute({
      sql: `
        INSERT INTO tasks (project_id, title, description, screenshot, screenshot_url, url, selected_area, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      args: [
        projectId,
        data.title,
        data.description || '',
        screenshotFilename || null,
        screenshotUrl || null,
        data.url,
        data.selected_area ? JSON.stringify(data.selected_area) : null,
        metadataJson
      ]
    });

    const taskId = Number(result.lastInsertRowid);

    // Trigger AI analysis synchronously to ensure persistence
    if (data.title || data.description) {
      try {
        const { analyzeFeedback } = await import('../../../lib/ai-service.js');
        const analysisText = [data.title, data.description].filter(Boolean).join('. ');
        const aiResult = await analyzeFeedback(analysisText, { debug: true, retries: 1 });
        const analysis = aiResult?.analysis;
        if (analysis) {
          await db.execute({
            sql: `
              UPDATE tasks
              SET
                ai_sentiment = ?,
                ai_confidence = ?,
                ai_category = ?,
                ai_priority = ?,
                ai_summary = ?,
                ai_keywords = ?,
                ai_analyzed_at = datetime('now')
              WHERE id = ?
            `,
            args: [
              analysis.sentiment,
              analysis.confidence,
              analysis.category,
              analysis.priority,
              analysis.summary,
              JSON.stringify(analysis.keywords),
              taskId
            ]
          });
          console.log(`✅ AI analysis stored for task ${taskId} (success: ${aiResult.success})`);
        } else {
          console.warn(`⚠️ AI analysis not available for task ${taskId}`);
        }
      } catch (err) {
        console.warn('AI analysis failed or unavailable:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      id: taskId,
      project_id: projectId, // Return numeric project ID for PATCH updates
      screenshot: screenshotFilename,
      screenshot_url: screenshotUrl,
      message: 'Task saved successfully'
    }, {
      headers: corsHeaders()
    });

  } catch (error) {
    
    if (error.message && error.message.includes('no such table')) {
      try {
        await initDatabase();
        return await POST(request);
      } catch {
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
