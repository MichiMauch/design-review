import { NextResponse } from 'next/server';
import { getDb, initDatabase } from '../../../../lib/db.js';

// Hilfsfunktion für CORS-Header
function withCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  const response = NextResponse.json({}, { status: 200 });
  return withCORS(response);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const taskId = searchParams.get('taskId');
    const taskTitle = searchParams.get('title') || '';
    const taskDescription = searchParams.get('description') || '';

    if (!projectId) {
      return withCORS(NextResponse.json({ error: 'Project ID is required' }, { status: 400 }));
    }

    // Load project configuration
    await initDatabase();
    const db = getDb();

    const projectResult = await db.execute({
      sql: 'SELECT * FROM projects WHERE id = ? OR name = ?',
      args: [projectId, projectId]
    });

    if (projectResult.rows.length === 0) {
      return withCORS(NextResponse.json({ error: 'Project not found' }, { status: 404 }));
    }

    const project = projectResult.rows[0];

    // Check if JIRA is configured
    if (!project.jira_server_url || !project.jira_username || !project.jira_api_token || !project.jira_project_key) {
      return withCORS(NextResponse.json({ error: 'JIRA not configured for this project' }, { status: 400 }));
    }

    const jiraConfig = {
      serverUrl: project.jira_server_url,
      username: project.jira_username,
      apiToken: project.jira_api_token,
      projectKey: project.jira_project_key
    };

    const selectedTask = {
      id: taskId,
      title: taskTitle,
      description: taskDescription
    };

    // Generate the complete HTML page with the modal
    const html = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JIRA Task erstellen</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
        .modal-backdrop { background: rgba(0, 0, 0, 0.5); }
    </style>
</head>
<body class="bg-gray-100">
    <div id="jira-modal-root"></div>

    <script>
        // Configuration passed from server
        window.JIRA_CONFIG = ${JSON.stringify(jiraConfig)};
        window.SELECTED_TASK = ${JSON.stringify(selectedTask)};
        window.IS_WIDGET = true;

        // Modal state
        let isSubmitting = false;
        let jiraUsers = [];
        let jiraSprintsOptions = [];
        let jiraBoardColumns = [];
        let isLoading = true;

        let formData = {
            title: window.SELECTED_TASK.title || '',
            description: window.SELECTED_TASK.description || '',
            assignee: '',
            sprint: '',
            labels: '',
            column: ''
        };

        // Create modal HTML
        function createModalHTML() {
            return \`
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div class="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">
                            JIRA-Task erstellen
                            <span class="text-xs text-gray-500 ml-2">
                                (Task ID: \${window.SELECTED_TASK.id || 'Widget'})
                            </span>
                        </h3>

                        \${isLoading ? \`
                            <div class="text-center py-8">
                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                <p class="text-gray-600">Lade JIRA-Daten...</p>
                            </div>
                        \` : \`
                            <form id="jira-form">
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                                        <input type="text" id="title" value="\${formData.title}" required
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Task-Titel">
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                                        <textarea id="description" rows="4"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                            placeholder="Beschreibung des Tasks">\${formData.description}</textarea>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Zugewiesen an</label>
                                        <select id="assignee" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                            <option value="">Nicht zugewiesen</option>
                                            \${jiraUsers.map(user => \`<option value="\${user.accountId}">\${user.displayName} (\${user.emailAddress})</option>\`).join('')}
                                        </select>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
                                        <select id="sprint" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                            <option value="">Kein Sprint</option>
                                            \${jiraSprintsOptions.map(sprint => \`<option value="\${sprint.id}">\${sprint.name} (\${sprint.state})</option>\`).join('')}
                                        </select>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Board-Spalte</label>
                                        <select id="column" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                            <option value="">Standard (To Do)</option>
                                            \${jiraBoardColumns.map(column => \`<option value="\${column.statusId || column.id}">\${column.name}</option>\`).join('')}
                                        </select>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Labels (kommagetrennt)</label>
                                        <input type="text" id="labels" value="\${formData.labels}"
                                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="label1, label2, label3">
                                    </div>
                                </div>

                                <div class="flex gap-3 mt-6">
                                    <button type="submit" id="submit-btn" \${isSubmitting ? 'disabled' : ''}
                                        class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg">
                                        \${isSubmitting ? \`
                                            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Erstelle...
                                        \` : \`
                                            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                                                <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.96 4.35 4.35 4.35v-6c0-2.4-1.96-4.4-4.4-4.4H11.53zm-6.77 6.77c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.96 4.35 4.35 4.35v-6c0-2.4-1.96-4.4-4.4-4.4H4.76zm6.77 6.77c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.96 4.35 4.35 4.35v-6c0-2.4-1.96-4.4-4.4-4.4h-6.08z"/>
                                            </svg>
                                            Erstellen
                                        \`}
                                    </button>
                                    <button type="button" id="cancel-btn"
                                        class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg">
                                        Abbrechen
                                    </button>
                                </div>
                            </form>
                        \`}
                    </div>
                </div>
            \`;
        }

        // Update modal display
        function updateModal() {
            document.getElementById('jira-modal-root').innerHTML = createModalHTML();

            if (!isLoading) {
                // Attach event listeners
                document.getElementById('jira-form').addEventListener('submit', handleSubmit);
                document.getElementById('cancel-btn').addEventListener('click', handleCancel);

                // Update form data on input
                ['title', 'description', 'assignee', 'sprint', 'labels', 'column'].forEach(field => {
                    const element = document.getElementById(field);
                    if (element) {
                        element.addEventListener('input', (e) => {
                            formData[field] = e.target.value;
                        });
                    }
                });
            }
        }

        // Load JIRA data
        async function loadJiraData() {
            try {
                isLoading = true;
                updateModal();

                const baseUrl = window.location.origin;

                // First load boards to get board ID
                const boardsResponse = await fetch(\`\${baseUrl}/api/jira\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'getBoards',
                        jiraConfig: window.JIRA_CONFIG
                    })
                });

                let boardId = null;
                if (boardsResponse.ok) {
                    const boardsResult = await boardsResponse.json();
                    if (boardsResult.success && boardsResult.data && boardsResult.data.length > 0) {
                        boardId = boardsResult.data[0].id;
                    }
                }

                // Load users, sprints, and columns in parallel
                const promises = [
                    fetch(\`\${baseUrl}/api/jira\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'getUsers',
                            jiraConfig: window.JIRA_CONFIG
                        })
                    }),
                    boardId ? fetch(\`\${baseUrl}/api/jira\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'getSprints',
                            jiraConfig: window.JIRA_CONFIG,
                            boardId: boardId
                        })
                    }) : Promise.resolve({ ok: false }),
                    boardId ? fetch(\`\${baseUrl}/api/jira\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'getBoardColumns',
                            jiraConfig: window.JIRA_CONFIG,
                            boardId: boardId
                        })
                    }) : Promise.resolve({ ok: false })
                ];

                const [usersResponse, sprintsResponse, columnsResponse] = await Promise.all(promises);

                // Process responses
                if (usersResponse.ok) {
                    const result = await usersResponse.json();
                    if (result.success) jiraUsers = result.data || [];
                }

                if (sprintsResponse.ok) {
                    const result = await sprintsResponse.json();
                    if (result.success) jiraSprintsOptions = result.data || [];
                }

                if (columnsResponse.ok) {
                    const result = await columnsResponse.json();
                    if (result.success) jiraBoardColumns = result.data || [];
                }

            } catch (error) {
                console.error('Error loading JIRA data:', error);
            } finally {
                isLoading = false;
                updateModal();
            }
        }

        // Handle form submission
        async function handleSubmit(e) {
            e.preventDefault();

            if (!formData.title.trim()) return;

            try {
                isSubmitting = true;
                updateModal();

                const baseUrl = window.location.origin;

                const response = await fetch(\`\${baseUrl}/api/jira\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'createTicket',
                        feedback: {
                            id: window.SELECTED_TASK.id,
                            title: formData.title,
                            description: formData.description,
                            url: window.parent !== window ? document.referrer : window.location.href
                        },
                        jiraConfig: {
                            ...window.JIRA_CONFIG,
                            issueType: 'Bug',
                            defaultAssignee: formData.assignee,
                            defaultLabels: formData.labels.split(',').map(l => l.trim()).filter(Boolean),
                            selectedSprint: formData.sprint,
                            selectedColumn: formData.column
                        }
                    })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // Send success message to parent window
                    if (window.parent !== window) {
                        window.parent.postMessage({
                            type: 'jira-task-created',
                            success: true,
                            jiraKey: result.ticket?.key,
                            jiraUrl: result.ticket?.url
                        }, '*');
                    }

                    // Close modal
                    setTimeout(() => {
                        if (window.parent !== window) {
                            window.close();
                        }
                    }, 1000);

                } else {
                    throw new Error(result.error || 'Failed to create JIRA task');
                }

            } catch (error) {
                console.error('Error creating JIRA task:', error);
                alert('Fehler beim Erstellen des JIRA-Tasks: ' + error.message);
            } finally {
                isSubmitting = false;
                updateModal();
            }
        }

        // Handle cancel
        function handleCancel() {
            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'jira-modal-close'
                }, '*');
                window.close();
            }
        }

        // Initialize
        loadJiraData();

        // Handle messages from parent
        window.addEventListener('message', (event) => {
            if (event.data.type === 'close-modal') {
                window.close();
            }
        });
    </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error) {
    console.error('Error in jira-modal route:', error);
    return withCORS(NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 }));
  }
}