'use client';

import { useState } from 'react';

export default function JiraDebugPage() {
  const [jiraSettings, setJiraSettings] = useState({
    serverUrl: '',
    username: '',
    apiToken: ''
  });
  const [projectKey, setProjectKey] = useState('');
  const [boardId, setBoardId] = useState('');
  const [debugData, setDebugData] = useState({});
  const [loading, setLoading] = useState(false);

  const debugAction = async (action, params = {}) => {
    setLoading(true);
    try {
      const urlParams = new URLSearchParams({
        action,
        serverUrl: jiraSettings.serverUrl,
        username: jiraSettings.username,
        apiToken: jiraSettings.apiToken,
        ...params
      });
      
      const response = await fetch(`/api/jira?${urlParams}`);
      const data = await response.json();
      
      setDebugData(prev => ({
        ...prev,
        [action]: data
      }));
    } catch (error) {
      setDebugData(prev => ({
        ...prev,
        [action]: { error: error.message }
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">JIRA API Debug Tool</h1>
      
      {/* JIRA Einstellungen */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">JIRA Verbindungseinstellungen</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Server URL
            </label>
            <input
              type="text"
              value={jiraSettings.serverUrl}
              onChange={(e) => setJiraSettings({...jiraSettings, serverUrl: e.target.value})}
              placeholder="https://your-domain.atlassian.net"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username/Email
            </label>
            <input
              type="text"
              value={jiraSettings.username}
              onChange={(e) => setJiraSettings({...jiraSettings, username: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Token
            </label>
            <input
              type="password"
              value={jiraSettings.apiToken}
              onChange={(e) => setJiraSettings({...jiraSettings, apiToken: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Debug Controls */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Debug Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <button
            onClick={() => debugAction('getProjects')}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Load Projects
          </button>
          <button
            onClick={() => debugAction('getUsers', projectKey ? { projectKey } : {})}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            Load Users
          </button>
          <button
            onClick={() => debugAction('getBoards', projectKey ? { projectKey } : {})}
            disabled={loading}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Load Boards
          </button>
          <button
            onClick={() => debugAction('getSprints', boardId ? { boardId } : {})}
            disabled={loading}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
          >
            Load Sprints
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Key (optional für Users/Boards)
            </label>
            <input
              type="text"
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value)}
              placeholder="z.B. TEST"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Board ID (für Sprints)
            </label>
            <input
              type="text"
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              placeholder="z.B. 1"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Debug Results */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Debug Results</h2>
        {loading && (
          <div className="text-blue-500 mb-4">Loading...</div>
        )}
        
        {Object.entries(debugData).map(([action, data]) => (
          <div key={action} className="mb-6">
            <h3 className="text-md font-semibold mb-2 capitalize">{action} Results:</h3>
            <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              <pre className="text-sm">{JSON.stringify(data, null, 2)}</pre>
            </div>
          </div>
        ))}
        
        {Object.keys(debugData).length === 0 && !loading && (
          <p className="text-gray-500">Noch keine Debug-Daten. Klicken Sie auf eine der Schaltflächen oben.</p>
        )}
      </div>
    </div>
  );
}
