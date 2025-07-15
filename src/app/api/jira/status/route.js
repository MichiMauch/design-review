import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const issueKey = searchParams.get('issueKey');
    const serverUrl = searchParams.get('serverUrl');
    const username = searchParams.get('username');
    const apiToken = searchParams.get('apiToken');

    if (!issueKey || !serverUrl || !username || !apiToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    const response = await fetch(`${serverUrl}/rest/api/3/issue/${issueKey}?fields=status,customfield_10020`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`JIRA API Error: ${errorData.errorMessages?.join(', ') || response.statusText}`);
    }

    const issueData = await response.json();

    // Extract sprint information from customfield_10020
    let sprintInfo = null;
    if (issueData.fields.customfield_10020 && issueData.fields.customfield_10020.length > 0) {
      // Get the active sprint (usually the last one)
      const activeSprint = issueData.fields.customfield_10020[issueData.fields.customfield_10020.length - 1];
      sprintInfo = {
        id: activeSprint.id,
        name: activeSprint.name,
        state: activeSprint.state
      };
    }

    return NextResponse.json({
      success: true,
      status: {
        name: issueData.fields.status.name,
        category: issueData.fields.status.statusCategory.name,
        color: issueData.fields.status.statusCategory.colorName
      },
      sprint: sprintInfo
    });

  } catch (error) {
    console.error('JIRA Status API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}