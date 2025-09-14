'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Settings, AlertTriangle, Trash2 } from 'lucide-react';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingProject, setDeletingProject] = useState(false);

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

  const deleteProject = async () => {
    if (deleteConfirmText.trim() !== `Ich will dieses Projekt: ${project.name} löschen`) {
      return;
    }

    setDeletingProject(true);
    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        router.push('/projects');
      } else {
        throw new Error('Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setMessage('Fehler beim Löschen des Projekts');
      setTimeout(() => setMessage(''), 3000);
      setDeletingProject(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
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

        {/* Danger Zone */}
        <div className="bg-white shadow rounded-lg mt-8 border-2 border-red-200">
          <div className="px-6 py-4 border-b border-red-200 bg-red-50">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <h2 className="text-lg font-medium text-red-900">
                Danger Zone
              </h2>
            </div>
            <p className="mt-1 text-sm text-red-700">
              Vorsicht! Diese Aktionen können nicht rückgängig gemacht werden.
            </p>
          </div>

          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Projekt löschen
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Alle Tasks und Daten dieses Projekts werden dauerhaft gelöscht.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Projekt löschen
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Projekt löschen</h3>

              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  Sind Sie sicher, dass Sie das Projekt <strong>{project.name}</strong> löschen möchten?
                </p>
                <p className="text-sm text-red-600 mb-4">
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle Tasks und Daten werden dauerhaft gelöscht.
                </p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-red-800 mb-2">Sicherheitsabfrage:</p>
                  <p className="text-sm text-red-700 mb-3">
                    Geben Sie den folgenden Text exakt ein, um das Löschen zu bestätigen:
                  </p>
                  <p className="text-sm font-mono bg-red-100 p-2 rounded border border-red-300 text-red-900">
                    Ich will dieses Projekt: {project.name} löschen
                  </p>
                </div>

                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Text hier eingeben..."
                  disabled={deletingProject}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={deleteProject}
                  disabled={deletingProject || deleteConfirmText.trim() !== `Ich will dieses Projekt: ${project.name} löschen`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  {deletingProject ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Lösche...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Projekt löschen
                    </>
                  )}
                </button>
                <button
                  onClick={closeDeleteModal}
                  disabled={deletingProject}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}