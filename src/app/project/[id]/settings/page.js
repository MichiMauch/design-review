'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';

export default function ProjectSettings() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [jiraConfig, setJiraConfig] = useState({
    projectKey: '',
    issueType: 'Task'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProject();
    loadJiraConfig();
  }, [params.id]);

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      if (response.ok) {
        const projectData = await response.json();
        setProject(projectData);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const loadJiraConfig = async () => {
    try {
      const response = await fetch(`/api/jira/config/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setJiraConfig({
            projectKey: data.config.projectKey || '',
            issueType: data.config.issueType || 'Task'
          });
        }
      }
    } catch (error) {
      console.error('Error loading JIRA config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveJiraConfig = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jira_project_key: jiraConfig.projectKey,
          jira_issue_type: jiraConfig.issueType
        })
      });

      if (response.ok) {
        setMessage('JIRA-Einstellungen erfolgreich gespeichert');
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving JIRA config:', error);
      setMessage('Fehler beim Speichern der Einstellungen');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Lade Einstellungen...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Zurück zum Projekt
          </button>

          <div className="flex items-center">
            <Settings className="w-8 h-8 text-gray-400 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Projekt-Einstellungen
              </h1>
              {project && (
                <p className="text-gray-600">{project.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Settings Card */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              JIRA Integration
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Konfiguriere die JIRA-Integration für dieses Projekt.
              Die Server-Einstellungen werden in den Admin-Einstellungen verwaltet.
            </p>
          </div>

          <div className="px-6 py-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  JIRA Projekt-Key
                </label>
                <input
                  type="text"
                  value={jiraConfig.projectKey}
                  onChange={(e) => setJiraConfig({ ...jiraConfig, projectKey: e.target.value })}
                  placeholder="z.B. PROJ"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Der Key des JIRA-Projekts, in dem Tasks erstellt werden sollen
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Standard Issue Type
                </label>
                <select
                  value={jiraConfig.issueType}
                  onChange={(e) => setJiraConfig({ ...jiraConfig, issueType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Task">Task</option>
                  <option value="Bug">Bug</option>
                  <option value="Story">Story</option>
                  <option value="Epic">Epic</option>
                  <option value="Subtask">Subtask</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Der Standard-Issue-Type für neue JIRA-Tasks
                </p>
              </div>
            </div>

            {/* Success/Error Message */}
            {message && (
              <div className={`mt-4 p-3 rounded-md text-sm ${
                message.includes('erfolgreich')
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            {/* Save Button */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={saveJiraConfig}
                disabled={saving}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {saving ? 'Speichere...' : 'Einstellungen speichern'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}