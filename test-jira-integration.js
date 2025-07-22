#!/usr/bin/env node

// JIRA Integration Test Script
// Tests the JIRA user loading functionality


const testJiraUsers = async () => {
  try {
    // Diese Werte sollten mit echten JIRA-Credentials ersetzt werden
    const testConfig = {
      serverUrl: 'https://your-company.atlassian.net',
      username: 'your-email@company.com',
      apiToken: 'your-api-token'
    };

    
    const params = new URLSearchParams({
      action: 'getUsers',
      serverUrl: testConfig.serverUrl,
      username: testConfig.username,
      apiToken: testConfig.apiToken
    });

    const response = await fetch(`http://localhost:3000/api/jira?${params}`);
    const data = await response.json();

    if (data.success) {
      
      data.users.slice(0, 5).forEach(user => {
      });
      
      if (data.users.length > 5) {
      }
    } else {
    }

  } catch (error) {
  }
};

const testTicketCreation = () => {
};

const main = async () => {
  await testJiraUsers();
  testTicketCreation();
  
};

if (require.main === module) {
  main();
}

module.exports = { testJiraUsers, testTicketCreation };
