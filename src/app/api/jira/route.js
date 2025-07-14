import { NextResponse } from 'next/server';

// JIRA API Integration
export async function POST(request) {
  try {
    const { action, ...data } = await request.json();
    
    switch (action) {
      case 'createTicket':
        return await createJiraTicket(data);
      case 'testConnection':
        return await testJiraConnection(data);
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('JIRA API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
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
    const customLabels = defaultLabels.split(',').map(label => label.trim()).filter(Boolean);
    labels = customLabels;
  }

  // JIRA Issue erstellen
  const issueData = {
    fields: {
      project: {
        key: projectKey
      },
      summary: `Website Feedback: ${feedback.text.substring(0, 100)}${feedback.text.length > 100 ? '...' : ''}`,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `Feedback von der Website:\n\n${feedback.text}\n\n`
              }
            ]
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `URL: ${feedback.url}\n`
              }
            ]
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `Erstellt am: ${new Date(feedback.created_at).toLocaleString('de-DE')}\n`
              }
            ]
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
  if (feedback.screenshot && responseData.key) {
    try {
      await uploadScreenshotToJira({
        serverUrl,
        username,
        apiToken,
        issueKey: responseData.key,
        screenshot: feedback.screenshot,
        feedbackId: feedback.id
      });
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
  // Screenshot von Data URL zu File konvertieren
  const base64Data = screenshot.replace(/^data:image\/[a-z]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  // FormData für File Upload erstellen
  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'image/png' });
  formData.append('file', blob, `feedback-${feedbackId}-screenshot.png`);

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
