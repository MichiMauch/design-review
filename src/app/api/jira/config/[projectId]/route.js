import { getDb, initDatabase } from '../../../../../../lib/db.js';

// Helper function to add CORS headers
function addCORSHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  const response = new Response(null, { status: 200 });
  return addCORSHeaders(response);
}

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    await initDatabase();
    const db = getDb();

    // Get admin JIRA settings
    const adminSettings = await db.execute(`
      SELECT key, value
      FROM app_settings
      WHERE key IN ('jira_url', 'jira_email', 'jira_api_key')
    `);

    // Convert admin settings to object
    const adminConfig = {};
    adminSettings.rows.forEach(row => {
      adminConfig[row.key] = row.value;
    });

    // Get project-specific JIRA settings
    const projectResult = await db.execute({
      sql: 'SELECT jira_project_key, jira_issue_type FROM projects WHERE id = ?',
      args: [resolvedParams.projectId]
    });

    if (projectResult.rows.length === 0) {
      const response = Response.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
      return addCORSHeaders(response);
    }

    const projectData = projectResult.rows[0];

    // Combine admin and project settings
    const combinedConfig = {
      serverUrl: adminConfig.jira_url || '',
      username: adminConfig.jira_email || '',
      apiToken: adminConfig.jira_api_key || '',
      projectKey: projectData.jira_project_key || '',
      issueType: projectData.jira_issue_type || 'Task'
    };

    // Check if configuration is complete
    const isConfigured = Boolean(
      combinedConfig.serverUrl &&
      combinedConfig.username &&
      combinedConfig.apiToken &&
      combinedConfig.projectKey
    );

    const response = Response.json({
      success: true,
      config: combinedConfig,
      isConfigured
    });

    return addCORSHeaders(response);

  } catch (error) {
    console.error('Error fetching JIRA configuration:', error);
    const response = Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
    return addCORSHeaders(response);
  }
}