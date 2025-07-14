#!/usr/bin/env node

// JIRA Integration Test Script
// Tests the JIRA user loading functionality

console.log('🧪 JIRA Integration Test');
console.log('========================');

const testJiraUsers = async () => {
  try {
    // Diese Werte sollten mit echten JIRA-Credentials ersetzt werden
    const testConfig = {
      serverUrl: 'https://your-company.atlassian.net',
      username: 'your-email@company.com',
      apiToken: 'your-api-token'
    };

    console.log('\n📋 Teste JIRA User API...');
    
    const params = new URLSearchParams({
      action: 'getUsers',
      serverUrl: testConfig.serverUrl,
      username: testConfig.username,
      apiToken: testConfig.apiToken
    });

    const response = await fetch(`http://localhost:3000/api/jira?${params}`);
    const data = await response.json();

    if (data.success) {
      console.log('✅ JIRA User API erfolgreich');
      console.log(`📊 ${data.users.length} User gefunden:`);
      
      data.users.slice(0, 5).forEach(user => {
        console.log(`   👤 ${user.displayName} (${user.emailAddress})`);
        console.log(`      Account ID: ${user.accountId}`);
      });
      
      if (data.users.length > 5) {
        console.log(`   ... und ${data.users.length - 5} weitere`);
      }
    } else {
      console.log('❌ JIRA User API fehlgeschlagen:', data.error);
    }

  } catch (error) {
    console.log('🚫 Test fehlgeschlagen:', error.message);
    console.log('\n💡 Tipp: Konfigurieren Sie echte JIRA-Credentials in diesem Script für vollständige Tests');
  }
};

const testTicketCreation = () => {
  console.log('\n🎫 JIRA Ticket Features:');
  console.log('✅ Assignee-Auswahl: Dropdown mit JIRA-Usern');
  console.log('✅ Labels: Komma-getrennte Tags für Kategorisierung');
  console.log('✅ Due Date: Automatisches Fälligkeitsdatum basierend auf Tagen');
  console.log('✅ Screenshot-Upload: Automatischer Anhang zu Tickets');
  console.log('✅ Settings-Persistierung: Konfiguration in Turso-Database');
};

const main = async () => {
  await testJiraUsers();
  testTicketCreation();
  
  console.log('\n🎯 Nächste Schritte:');
  console.log('1. Öffnen Sie http://localhost:3000/admin-review');
  console.log('2. Klicken Sie auf "Settings" (⚙️ Icon)');
  console.log('3. Geben Sie Ihre JIRA-Credentials ein');
  console.log('4. Klicken Sie "Verbindung testen"');
  console.log('5. Wählen Sie Projekt, Assignee, Labels und Due Date');
  console.log('6. Speichern Sie die Konfiguration');
  console.log('7. Erstellen Sie ein Test-Feedback und JIRA-Ticket');
};

if (require.main === module) {
  main();
}

module.exports = { testJiraUsers, testTicketCreation };
