import { NextResponse } from 'next/server';

// Hilfsfunktion für CORS-Header
function withCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  // Preflight-Response für CORS
  const response = NextResponse.json({}, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// JIRA API Integration
export async function POST(request) {
  try {
    const requestBody = await request.json();
    console.log('JIRA API received:', requestBody);
    
    const { action, ...data } = requestBody;
    let result;
    switch (action) {
      case 'createTicket':
        result = await createJiraTicket(data);
        break;
      case 'testConnection':
        result = await testJiraConnection(data);
        break;
      case 'getUsers':
        result = await getJiraUsersForWidget(data);
        break;
      case 'getBoards':
        result = await getJiraBoardsForWidget(data);
        break;
      case 'getSprints':
        result = await getJiraSprintsForWidget(data);
        break;
      case 'getSwimlanes':
        result = await getJiraSwimlanes(data);
        break;
      default:
        result = NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }
    return withCORS(result);
  } catch (error) {
    console.error('JIRA API Error:', error);
    console.error('Error details:', error.stack);
    const errorResponse = NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
    return withCORS(errorResponse);
  }
}

async function createJiraTicket({ feedback, jiraConfig }) {
  const { 
    serverUrl, 
    username, 
    apiToken, 
    projectKey, 
    issueType, 
    defaultAssignee,
    defaultLabels,
    defaultDueDateDays,
    defaultDueDate,
    selectedSprint,
    selectedBoardId
  } = jiraConfig;
  
  if (!serverUrl || !username || !apiToken || !projectKey) {
    throw new Error('JIRA Konfiguration unvollständig');
  }

  // Calculate or use specific due date
  let dueDate = null;
  if (defaultDueDate) {
    // Spezifisches Datum aus Datepicker
    dueDate = defaultDueDate;
  } else if (defaultDueDateDays && parseInt(defaultDueDateDays) > 0) {
    // Relative Tage ab heute (Fallback)
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + parseInt(defaultDueDateDays));
    dueDate = dueDateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  // Prepare labels
  let labels = [];
  if (defaultLabels) {
    if (Array.isArray(defaultLabels)) {
      labels = defaultLabels;
    } else if (typeof defaultLabels === 'string') {
      const customLabels = defaultLabels.split(',').map(label => label.trim()).filter(Boolean);
      labels = customLabels;
    }
  }

  // JIRA Issue erstellen
  const issueData = {
    fields: {
      project: {
        key: projectKey
      },
      summary: feedback.title || `Website Feedback: ${feedback.text?.replace(/\r?\n/g, ' ').substring(0, 100)}${feedback.text?.length > 100 ? '...' : ''}`,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Discover" }]
          },
          ...(feedback.description ? [
            {
              type: "paragraph",
              content: [{ type: "text", text: feedback.description }]
            }
          ] : [
            {
              type: "paragraph",
              content: [{ type: "text", text: "" }]
            }
          ]),
          {
            type: "paragraph",
            content: [{ type: "text", text: `URL: ${feedback.url}` }]
          },
          ...(feedback.selected_area ? (() => {
            try {
              const areaData = typeof feedback.selected_area === 'string' 
                ? JSON.parse(feedback.selected_area) 
                : feedback.selected_area;
              
              const areaSize = Math.round(areaData.width) * Math.round(areaData.height);
              const isLargeArea = areaSize > 50000;
              const isSmallElement = areaData.width < 100 && areaData.height < 100;
              
              let areaDescription = `Ausgewählter Bereich: ${Math.round(areaData.width)}×${Math.round(areaData.height)}px`;
              if (isLargeArea) areaDescription += ' (großer Bereich)';
              if (isSmallElement) areaDescription += ' (kleines Element)';
              areaDescription += ` - Position: ${Math.round(areaData.x)}px von links, ${Math.round(areaData.y)}px von oben`;
              
              return [
                {
                  type: "paragraph", 
                  content: [{ type: "text", text: areaDescription }]
                }
              ];
            } catch {
              return [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Bereichs-Auswahl verfügbar" }]
                }
              ];
            }
          })() : []),
          ...(feedback.translation ? [
            {
              type: "paragraph",
              content: [{ type: "text", text: `English Translation: ${feedback.translation}` }]
            }
          ] : []),
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Define" }]
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "" }]
          },
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Design" }]
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "" }]
          },
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Deliver" }]
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "" }]
          }
        ]
      },
      issuetype: {
        name: issueType || 'Task'
      }
    }
  };

  // Labels nur hinzufügen wenn sie existieren
  if (labels && labels.length > 0) {
    issueData.fields.labels = labels;
  }

  // Assignee hinzufügen falls konfiguriert
  if (defaultAssignee && defaultAssignee.trim()) {
    issueData.fields.assignee = {
      accountId: defaultAssignee.trim()
    };
  }

  // Due Date hinzufügen falls berechnet
  if (dueDate) {
    issueData.fields.duedate = dueDate;
  }

  // Sprint-Feld NICHT mehr setzen, da es zu Fehlern führt und nicht benötigt wird
  // if (selectedSprint && selectedSprint.trim()) {
  //   issueData.fields.customfield_10020 = parseInt(selectedSprint.trim()); // Standard Sprint field
  // }

  // Bereich-Informationen hinzufügen falls vorhanden
  if (feedback.selected_area) {
    try {
      const area = JSON.parse(feedback.selected_area);
      issueData.fields.description.content.push({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: `Markierter Bereich: ${Math.round(area.width)}×${Math.round(area.height)}px bei Position (${Math.round(area.x)}, ${Math.round(area.y)})`
          }
        ]
      });
    } catch {
      console.log('Could not parse selected area');
    }
  }

  // JIRA API Request
  const response = await fetch(`${serverUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(issueData)
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error('JIRA API Error Details:', {
      status: response.status,
      statusText: response.statusText,
      responseData,
      requestData: issueData
    });
    
    const errorMessage = responseData.errorMessages?.join(', ') || 
                        responseData.errors ? Object.values(responseData.errors).join(', ') : 
                        response.statusText;
    
    throw new Error(`JIRA API Error (${response.status}): ${errorMessage}`);
  }

  // Screenshot als Attachment hinzufügen falls vorhanden
  let attachmentInfo = null;
  if (feedback.screenshot && responseData.key) {
    try {
      attachmentInfo = await uploadScreenshotToJira({
        serverUrl,
        username,
        apiToken,
        issueKey: responseData.key,
        screenshot: feedback.screenshot,
        feedbackId: feedback.id
      });
      
      // Add image to description if attachment was successful
      if (attachmentInfo && attachmentInfo.length > 0) {
        await addImageToDescription({
          serverUrl,
          username,
          apiToken,
          issueKey: responseData.key,
          attachment: attachmentInfo[0],
          originalDescription: issueData.fields.description
        });
      }
    } catch (error) {
      console.warn('Screenshot upload failed:', error);
      // Ticket wurde erstellt, nur Screenshot-Upload fehlgeschlagen
    }
  }

  // Sprint-Zuweisung falls konfiguriert
  if (selectedSprint && selectedBoardId && responseData.key) {
    try {
      await addIssueToSprint({
        serverUrl,
        username,
        apiToken,
        sprintId: selectedSprint,
        issueKey: responseData.key
      });
    } catch (error) {
      console.warn('Sprint assignment failed:', error);
      // Ticket wurde erstellt, nur Sprint-Zuweisung fehlgeschlagen
    }
  }

  return NextResponse.json({
    success: true,
    ticket: {
      key: responseData.key,
      url: `${serverUrl}/browse/${responseData.key}`,
      id: responseData.id
    }
  });
}

async function uploadScreenshotToJira({ serverUrl, username, apiToken, issueKey, screenshot, feedbackId }) {
  let buffer;
  let filename = `feedback-${feedbackId}-screenshot.png`;
  
  if (screenshot.startsWith('data:image')) {
    // Base64 Data URL
    const base64Data = screenshot.replace(/^data:image\/[a-z]+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else if (screenshot.startsWith('http')) {
    // URL - download the image first
    try {
      const imageResponse = await fetch(screenshot);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      
      // Extract filename from URL if possible
      const urlParts = screenshot.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        filename = lastPart;
      }
    } catch (error) {
      console.error('Error downloading screenshot:', error);
      throw new Error(`Screenshot download failed: ${error.message}`);
    }
  } else {
    throw new Error('Invalid screenshot format - must be data URL or HTTP URL');
  }
  
  // FormData für File Upload erstellen
  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'image/png' });
  formData.append('file', blob, filename);

  const response = await fetch(`${serverUrl}/rest/api/3/issue/${issueKey}/attachments`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
      'X-Atlassian-Token': 'no-check'
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Screenshot upload failed: ${errorData.errorMessages?.join(', ') || response.statusText}`);
  }

  return await response.json();
}

async function addImageToDescription({ serverUrl, username, apiToken, issueKey, attachment, originalDescription }) {
  try {
    console.log('Adding image to description:', { issueKey, attachment });
    
    // Insert the image right after the Discover section
    const discoverIndex = originalDescription.content.findIndex(
      item => item.type === "heading" && item.content?.[0]?.text === "Discover"
    );
    
    let insertIndex = discoverIndex + 2; // After Discover heading and its paragraph
    if (discoverIndex === -1) {
      insertIndex = originalDescription.content.length; // Fallback to end
    }

    const imageContent = [
      {
        type: "mediaGroup",
        content: [
          {
            type: "media",
            attrs: {
              id: attachment.id,
              type: "file",
              collection: attachment.collection || "MediaServicesSample",
              width: 400,
              height: 300,
              url: attachment.content || attachment.self
            }
          }
        ]
      }
    ];

    // Create updated description with image inserted at the right position
    const updatedContent = [...originalDescription.content];
    updatedContent.splice(insertIndex, 0, ...imageContent);
    
    const updatedDescription = {
      ...originalDescription,
      content: updatedContent
    };

    console.log('Updated description structure:', JSON.stringify(updatedDescription, null, 2));

    const response = await fetch(`${serverUrl}/rest/api/3/issue/${issueKey}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          description: updatedDescription
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.warn('Failed to add image to description:', errorData);
      
      // Try a simpler approach - just mention the attachment
      const simpleUpdatedDescription = {
        ...originalDescription,
        content: [
          ...originalDescription.content,
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `Anhang: ${attachment.filename}`
              }
            ]
          }
        ]
      };

      const retryResponse = await fetch(`${serverUrl}/rest/api/3/issue/${issueKey}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            description: simpleUpdatedDescription
          }
        })
      });

      if (!retryResponse.ok) {
        const retryErrorData = await retryResponse.json();
        console.warn('Retry also failed:', retryErrorData);
      } else {
        console.log('Simple text reference added successfully');
      }
    } else {
      console.log('Image added to description successfully');
    }
  } catch (error) {
    console.warn('Error adding image to description:', error);
  }
}

async function addIssueToSprint({ serverUrl, username, apiToken, sprintId, issueKey }) {
  const response = await fetch(`${serverUrl}/rest/agile/1.0/sprint/${sprintId}/issue`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      issues: [issueKey]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Sprint assignment failed: ${errorData.errorMessages?.join(', ') || response.statusText}`);
  }

  return await response.json();
}

async function testJiraConnection({ serverUrl, username, apiToken }) {
  if (!serverUrl || !username || !apiToken) {
    throw new Error('JIRA Konfiguration unvollständig');
  }

  // Test API Call zu JIRA
  const response = await fetch(`${serverUrl}/rest/api/3/myself`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`JIRA Verbindung fehlgeschlagen: ${errorData.errorMessages?.join(', ') || response.statusText}`);
  }

  const userData = await response.json();

  return NextResponse.json({
    success: true,
    user: {
      displayName: userData.displayName,
      emailAddress: userData.emailAddress,
      accountId: userData.accountId
    }
  });
}

// GET für Projekt-Informationen abrufen
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const serverUrl = searchParams.get('serverUrl');
    const username = searchParams.get('username');
    const apiToken = searchParams.get('apiToken');

    if (action === 'getProjects') {
      return await getJiraProjects({ serverUrl, username, apiToken });
    }

    if (action === 'getUsers') {
      const projectKey = searchParams.get('projectKey');
      return await getJiraUsers({ serverUrl, username, apiToken, projectKey });
    }

    if (action === 'getBoards') {
      const projectKey = searchParams.get('projectKey');
      return await getJiraBoards({ serverUrl, username, apiToken, projectKey });
    }

    if (action === 'getSprints') {
      const boardId = searchParams.get('boardId');
      return await getJiraSprints({ serverUrl, username, apiToken, boardId });
    }

    if (action === 'getBoardColumns') {
      const boardId = searchParams.get('boardId');
      return await getJiraBoardColumns({ serverUrl, username, apiToken, boardId });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 });

  } catch (error) {
    console.error('JIRA GET API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

async function getJiraProjects({ serverUrl, username, apiToken }) {
  if (!serverUrl || !username || !apiToken) {
    throw new Error('JIRA Konfiguration unvollständig');
  }

  const response = await fetch(`${serverUrl}/rest/api/3/project/search`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`JIRA Projekte abrufen fehlgeschlagen: ${errorData.errorMessages?.join(', ') || response.statusText}`);
  }

  const data = await response.json();

  return NextResponse.json({
    success: true,
    projects: data.values.map(project => ({
      key: project.key,
      name: project.name,
      id: project.id,
      projectTypeKey: project.projectTypeKey
    }))
  });
}

async function getJiraUsers({ serverUrl, username, apiToken, projectKey }) {
  if (!serverUrl || !username || !apiToken) {
    throw new Error('JIRA Konfiguration unvollständig');
  }

  let url = `${serverUrl}/rest/api/3/users/search?maxResults=50`;
  
  // Falls projectKey angegeben, filtere nach Projekt-Zugehörigkeit
  if (projectKey) {
    url = `${serverUrl}/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=50`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`JIRA User abrufen fehlgeschlagen: ${errorData.errorMessages?.join(', ') || response.statusText}`);
  }

  const data = await response.json();

  return NextResponse.json({
    success: true,
    users: data.map(user => ({
      accountId: user.accountId,
      displayName: user.displayName,
      emailAddress: user.emailAddress,
      active: user.active
    })).filter(user => user.active) // Nur aktive User
  });
}

async function getJiraBoards({ serverUrl, username, apiToken, projectKey }) {
  if (!serverUrl || !username || !apiToken) {
    throw new Error('JIRA Konfiguration unvollständig');
  }

  let url = `${serverUrl}/rest/agile/1.0/board?maxResults=50`;
  if (projectKey) {
    url += `&projectKeyOrId=${projectKey}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`JIRA Boards abrufen fehlgeschlagen: ${errorData.errorMessages?.join(', ') || response.statusText}`);
  }

  const data = await response.json();

  return NextResponse.json({
    success: true,
    boards: data.values.map(board => ({
      id: board.id,
      name: board.name,
      type: board.type,
      projectKey: board.location?.projectKey
    }))
  });
}

async function getJiraSprints({ serverUrl, username, apiToken, boardId }) {
  if (!serverUrl || !username || !apiToken) {
    throw new Error('JIRA Konfiguration unvollständig - serverUrl, username oder apiToken fehlt');
  }
  
  if (!boardId || boardId.trim() === '') {
    throw new Error('Board ID fehlt oder ist leer');
  }

  const url = `${serverUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active,future&maxResults=50`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`JIRA Sprints abrufen fehlgeschlagen: ${errorData.errorMessages?.join(', ') || response.statusText}`);
  }

  const data = await response.json();

  return NextResponse.json({
    success: true,
    sprints: data.values.map(sprint => ({
      id: sprint.id,
      name: sprint.name,
      state: sprint.state,
      startDate: sprint.startDate,
      endDate: sprint.endDate
    }))
  });
}

async function getJiraBoardColumns({ serverUrl, username, apiToken, boardId }) {
  if (!serverUrl || !username || !apiToken || !boardId) {
    throw new Error('JIRA Konfiguration oder Board ID unvollständig');
  }

  const response = await fetch(`${serverUrl}/rest/agile/1.0/board/${boardId}/configuration`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`JIRA Board Konfiguration abrufen fehlgeschlagen: ${errorData.errorMessages?.join(', ') || response.statusText}`);
  }

  const data = await response.json();

  return NextResponse.json({
    success: true,
    columns: data.columnConfig?.columns?.map(column => ({
      name: column.name,
      statuses: column.statuses?.map(status => ({
        id: status.id,
        name: status.name,
        category: status.statusCategory?.name
      }))
    })) || []
  });
}

// POST API wrappers for widget usage
async function getJiraUsersForWidget({ jiraConfig }) {
  const { serverUrl, username, apiToken, projectKey } = jiraConfig;
  
  if (!serverUrl || !username || !apiToken) {
    return NextResponse.json({ 
      success: false, 
      error: 'JIRA Konfiguration unvollständig' 
    }, { status: 400 });
  }

  let url = `${serverUrl}/rest/api/3/users/search?maxResults=50`;
  
  // Falls projectKey angegeben, filtere nach Projekt-Zugehörigkeit
  if (projectKey) {
    url = `${serverUrl}/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=50`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('JIRA Users API Error:', response.status, errorText);
    return NextResponse.json({ 
      success: false, 
      error: `JIRA API Error: ${response.status} - ${errorText}` 
    }, { status: response.status });
  }

  const data = await response.json();
  
  return NextResponse.json({
    success: true,
    data: data.map(user => ({
      accountId: user.accountId,
      name: user.name || user.displayName,
      displayName: user.displayName,
      emailAddress: user.emailAddress,
      active: user.active !== false
    }))
  });
}

async function getJiraBoardsForWidget({ jiraConfig }) {
  const { serverUrl, username, apiToken, projectKey } = jiraConfig;
  
  if (!serverUrl || !username || !apiToken) {
    return NextResponse.json({ 
      success: false, 
      error: 'JIRA Konfiguration unvollständig' 
    }, { status: 400 });
  }

  try {
    const boardsUrl = `${serverUrl}/rest/agile/1.0/board?projectKeyOrId=${projectKey}&maxResults=50`;
    const boardsResponse = await fetch(boardsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    if (!boardsResponse.ok) {
      const errorText = await boardsResponse.text();
      console.error('JIRA Boards API Error:', boardsResponse.status, errorText);
      return NextResponse.json({ 
        success: false, 
        error: `JIRA Boards API Error: ${boardsResponse.status}` 
      }, { status: boardsResponse.status });
    }

    const boardsData = await boardsResponse.json();
    
    return NextResponse.json({
      success: true,
      data: boardsData.values.map(board => ({
        id: board.id,
        name: board.name,
        type: board.type,
        projectKey: board.location?.projectKey
      }))
    });

  } catch (error) {
    console.error('JIRA Boards Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

async function getJiraSprintsForWidget({ jiraConfig, boardId }) {
  const { serverUrl, username, apiToken } = jiraConfig;
  
  if (!serverUrl || !username || !apiToken) {
    return NextResponse.json({ 
      success: false, 
      error: 'JIRA Konfiguration unvollständig' 
    }, { status: 400 });
  }
  
  if (!boardId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Board ID ist erforderlich' 
    }, { status: 400 });
  }

  try {
    // Get sprints for the specific board
    const sprintsUrl = `${serverUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active,future&maxResults=50`;
    const sprintsResponse = await fetch(sprintsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    if (!sprintsResponse.ok) {
      const errorText = await sprintsResponse.text();
      console.error('JIRA Sprints API Error:', sprintsResponse.status, errorText);
      return NextResponse.json({ 
        success: false, 
        error: `JIRA Sprints API Error: ${sprintsResponse.status}` 
      }, { status: sprintsResponse.status });
    }

    const sprintsData = await sprintsResponse.json();
    
    return NextResponse.json({
      success: true,
      data: sprintsData.values.map(sprint => ({
        id: sprint.id,
        name: sprint.name,
        state: sprint.state,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        goal: sprint.goal
      }))
    });

  } catch (error) {
    console.error('JIRA Sprints Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

async function getJiraSwimlanes({ jiraConfig, boardId }) {
  const { serverUrl, username, apiToken } = jiraConfig;
  
  if (!serverUrl || !username || !apiToken) {
    return NextResponse.json({ 
      success: false, 
      error: 'JIRA Konfiguration unvollständig' 
    }, { status: 400 });
  }
  
  if (!boardId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Board ID ist erforderlich' 
    }, { status: 400 });
  }

  try {
    // Get board configuration to access swimlanes
    const configUrl = `${serverUrl}/rest/agile/1.0/board/${boardId}/configuration`;
    const configResponse = await fetch(configUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    if (!configResponse.ok) {
      const errorText = await configResponse.text();
      console.error('JIRA Board Config API Error:', configResponse.status, errorText);
      return NextResponse.json({ 
        success: false, 
        error: `JIRA Board Config API Error: ${configResponse.status}` 
      }, { status: configResponse.status });
    }

    const configData = await configResponse.json();
    console.log('JIRA Board Configuration:', JSON.stringify(configData, null, 2));
    
    let swimlaneOptions = [{ id: '', name: 'Keine Swimlane' }];
    
    // Check for swimlane configuration in the board
    if (configData.subQuery && configData.subQuery.query) {
      const subQuery = configData.subQuery.query;
      console.log('JIRA Swimlane SubQuery:', subQuery);
      
      // Parse different types of swimlane configurations
      if (subQuery.includes('assignee')) {
        // Get assignable users for swimlanes
        const usersUrl = `${serverUrl}/rest/api/3/user/assignable/search?project=${jiraConfig.projectKey}&maxResults=50`;
        const usersResponse = await fetch(usersUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
            'Accept': 'application/json'
          }
        });
        
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          swimlaneOptions.push(...usersData.map(user => ({
            id: user.accountId,
            name: `${user.displayName} (${user.emailAddress || user.name})`
          })));
        }
      } else if (subQuery.includes('component')) {
        // Get project components for swimlanes
        const componentsUrl = `${serverUrl}/rest/api/3/project/${jiraConfig.projectKey}/components`;
        const componentsResponse = await fetch(componentsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
            'Accept': 'application/json'
          }
        });
        
        if (componentsResponse.ok) {
          const componentsData = await componentsResponse.json();
          swimlaneOptions.push(...componentsData.map(component => ({
            id: component.id,
            name: component.name
          })));
        }
      } else if (subQuery.includes('priority')) {
        // Get priorities for swimlanes
        const prioritiesUrl = `${serverUrl}/rest/api/3/priority`;
        const prioritiesResponse = await fetch(prioritiesUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
            'Accept': 'application/json'
          }
        });
        
        if (prioritiesResponse.ok) {
          const prioritiesData = await prioritiesResponse.json();
          swimlaneOptions.push(...prioritiesData.map(priority => ({
            id: priority.id,
            name: priority.name
          })));
        }
      } else {
        // Generic custom field or other swimlane types
        // Add some common fallback options
        swimlaneOptions.push(
          { id: 'epic', name: 'Nach Epic' },
          { id: 'fixVersion', name: 'Nach Fix Version' },
          { id: 'assignee', name: 'Nach Assignee' }
        );
      }
    }
    
    console.log('JIRA Swimlanes found:', swimlaneOptions.length);
    
    return NextResponse.json({
      success: true,
      data: swimlaneOptions
    });

  } catch (error) {
    console.error('JIRA Swimlanes Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
