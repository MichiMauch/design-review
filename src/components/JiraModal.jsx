'use client';

import { useState, useEffect } from 'react';

// JIRA Icon Component
const JiraIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.96 4.35 4.35 4.35v-6c0-2.4-1.96-4.4-4.4-4.4H11.53zm-6.77 6.77c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.96 4.35 4.35 4.35v-6c0-2.4-1.96-4.4-4.4-4.4H4.76zm6.77 6.77c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.96 4.35 4.35 4.35v-6c0-2.4-1.96-4.4-4.4-4.4h-6.08z"/>
  </svg>
);

export default function JiraModal({
  selectedTask,
  onClose,
  onSubmit,
  isSubmitting = false,
  jiraConfig = {},
  isWidget = false
}) {
  const [jiraTaskData, setJiraTaskData] = useState({
    title: '',
    description: '',
    assignee: '',
    sprint: '',
    labels: '',
    column: ''
  });

  const [jiraUsers, setJiraUsers] = useState([]);
  const [jiraSprintsOptions, setJiraSprintsOptions] = useState([]);
  const [jiraBoardColumns, setJiraBoardColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize form data when selectedTask changes
  useEffect(() => {
    if (selectedTask) {
      setJiraTaskData({
        title: selectedTask.title || '',
        description: selectedTask.description || '',
        assignee: '',
        sprint: '',
        labels: '',
        column: ''
      });
    }
  }, [selectedTask]);

  // Load JIRA data when modal opens
  useEffect(() => {
    if (selectedTask && jiraConfig.serverUrl) {
      loadJiraData();
    }
  }, [selectedTask, jiraConfig]);

  const loadJiraData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get base URL for API calls
      const baseUrl = isWidget
        ? (typeof window !== 'undefined' ? window.location.origin : '')
        : '';

      // First load boards to get board ID
      const boardsResponse = await fetch(`${baseUrl}/api/jira`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getBoards',
          jiraConfig: {
            serverUrl: jiraConfig.serverUrl,
            username: jiraConfig.username,
            apiToken: jiraConfig.apiToken,
            projectKey: jiraConfig.projectKey
          }
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
        // Load users
        fetch(`${baseUrl}/api/jira`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'getUsers',
            jiraConfig: {
              serverUrl: jiraConfig.serverUrl,
              username: jiraConfig.username,
              apiToken: jiraConfig.apiToken,
              projectKey: jiraConfig.projectKey
            }
          })
        }),
        // Load sprints (if boardId available)
        boardId ? fetch(`${baseUrl}/api/jira`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'getSprints',
            jiraConfig: {
              serverUrl: jiraConfig.serverUrl,
              username: jiraConfig.username,
              apiToken: jiraConfig.apiToken,
              projectKey: jiraConfig.projectKey
            },
            boardId: boardId
          })
        }) : Promise.resolve({ ok: false }),
        // Load board columns (if boardId available)
        boardId ? fetch(`${baseUrl}/api/jira`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'getBoardColumns',
            jiraConfig: {
              serverUrl: jiraConfig.serverUrl,
              username: jiraConfig.username,
              apiToken: jiraConfig.apiToken,
              projectKey: jiraConfig.projectKey
            },
            boardId: boardId
          })
        }) : Promise.resolve({ ok: false })
      ];

      const [usersResponse, sprintsResponse, columnsResponse] = await Promise.all(promises);

      // Process users
      if (usersResponse.ok) {
        const usersResult = await usersResponse.json();
        if (usersResult.success) {
          setJiraUsers(usersResult.data || []);
        }
      }

      // Process sprints
      if (sprintsResponse.ok) {
        const sprintsResult = await sprintsResponse.json();
        if (sprintsResult.success) {
          setJiraSprintsOptions(sprintsResult.data || []);
        }
      }

      // Process columns
      if (columnsResponse.ok) {
        const columnsResult = await columnsResponse.json();
        if (columnsResult.success) {
          setJiraBoardColumns(columnsResult.data || []);
        }
      }

    } catch (err) {
      console.error('Error loading JIRA data:', err);
      setError('Fehler beim Laden der JIRA-Daten');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!jiraTaskData.title.trim()) return;

    onSubmit({
      ...jiraTaskData,
      taskId: selectedTask?.id,
      taskData: selectedTask
    });
  };

  const handleClose = () => {
    if (isWidget && window.parent !== window) {
      // Send message to parent window (widget)
      window.parent.postMessage({
        type: 'jira-modal-close'
      }, '*');
    } else {
      onClose();
    }
  };

  if (!selectedTask) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[65] p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          JIRA-Task erstellen
          <span className="text-xs text-gray-500 ml-2">
            (Task ID: {selectedTask.id})
          </span>
        </h3>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Lade JIRA-Daten...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadJiraData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Erneut versuchen
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel
                </label>
                <input
                  type="text"
                  value={jiraTaskData.title}
                  onChange={(e) => setJiraTaskData({ ...jiraTaskData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Task-Titel"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung
                </label>
                <textarea
                  value={jiraTaskData.description}
                  onChange={(e) => setJiraTaskData({ ...jiraTaskData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows="4"
                  placeholder="Beschreibung des Tasks"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zugewiesen an
                </label>
                <select
                  value={jiraTaskData.assignee}
                  onChange={(e) => setJiraTaskData({ ...jiraTaskData, assignee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Nicht zugewiesen</option>
                  {jiraUsers.map(user => (
                    <option key={user.accountId} value={user.accountId}>
                      {user.displayName} ({user.emailAddress})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sprint
                </label>
                <select
                  value={jiraTaskData.sprint}
                  onChange={(e) => setJiraTaskData({ ...jiraTaskData, sprint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Kein Sprint</option>
                  {jiraSprintsOptions.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name} ({sprint.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Board-Spalte
                </label>
                <select
                  value={jiraTaskData.column}
                  onChange={(e) => setJiraTaskData({ ...jiraTaskData, column: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Standard (To Do)</option>
                  {jiraBoardColumns.map(column => (
                    <option key={column.id} value={column.statusId || column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Labels (kommagetrennt)
                </label>
                <input
                  type="text"
                  value={jiraTaskData.labels}
                  onChange={(e) => setJiraTaskData({ ...jiraTaskData, labels: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="label1, label2, label3"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                disabled={!jiraTaskData.title || isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Erstelle...
                  </>
                ) : (
                  <>
                    <JiraIcon className="h-4 w-4" />
                    Erstellen
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}