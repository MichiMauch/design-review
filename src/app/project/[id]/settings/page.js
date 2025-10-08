'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Settings, AlertTriangle, Trash2, Code, Copy, CheckCircle } from 'lucide-react';
import StatusManager from '../../../../components/status/StatusManager';
import ProjectUserManager from '../../../../components/shared/users/ProjectUserManager';
import { useProjectUsers } from '../../../../hooks/useProjectUsers';

export default function ProjectSettings() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [jiraConfig, setJiraConfig] = useState({
    projectKey: '',
    issueType: 'Task'
  });
  const [jiraAutoCreate, setJiraAutoCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingProject, setDeletingProject] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [copiedWidget, setCopiedWidget] = useState(false);

  // Project users management
  const { users, loading: loadingUsers, refreshUsers } = useProjectUsers(parseInt(params.id));

  const checkAuthentication = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          // Check if user has access to this project
          const hasAccess = data.user.role === 'admin' || data.user.projectAccess.includes(parseInt(params.id));
          if (!hasAccess) {
            router.push('/projects');
            return;
          }
        } else {
          router.push('/login');
          return;
        }
      } else {
        router.push('/login');
        return;
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      router.push('/login');
      return;
    } finally {
      setAuthChecked(true);
    }
  }, [params.id, router]);

  const loadProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      if (response.ok) {
        const projectData = await response.json();
        setProject(projectData);
        // Load the jira_auto_create setting
        setJiraAutoCreate(Boolean(projectData.jira_auto_create));
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  }, [params.id]);

  const loadJiraConfig = useCallback(async () => {
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
  }, [params.id]);

  useEffect(() => {
    loadProject();
    loadJiraConfig();
    checkAuthentication();
  }, [loadProject, loadJiraConfig, checkAuthentication]);

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

  const copyWidgetScript = async () => {
    if (!project) return;

    const snippetCode = `<script>
(function() {
  const script = document.createElement('script');
  script.src = '${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/widget/widget.js';
  script.setAttribute('data-project-id', '${project.id}');
  script.async = true;
  document.head.appendChild(script);
})();
</script>`;

    try {
      await navigator.clipboard.writeText(snippetCode);
      setCopiedWidget(true);
      setTimeout(() => setCopiedWidget(false), 2000);
    } catch (err) {
      console.error('Failed to copy widget script:', err);
    }
  };

  const saveJiraConfig = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: project.name,
          domain: project.domain,
          jira_project_key: jiraConfig.projectKey,
          jira_issue_type: jiraConfig.issueType,
          jira_auto_create: jiraAutoCreate
        })
      });

      if (response.ok) {
        setMessage('JIRA-Einstellungen erfolgreich gespeichert!');
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

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Lade Einstellungen...</div>
      </div>
    );
  }

  // Don't render anything if user doesn't exist (will redirect to login)
  if (!user) {
    return null;
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

              <div className="border-t pt-6 mt-6">
                <h3 className="text-base font-medium text-gray-900 mb-4">Widget-Integration</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="jira-auto-create"
                    checked={jiraAutoCreate}
                    onChange={(e) => setJiraAutoCreate(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    disabled={saving}
                  />
                  <div>
                    <label htmlFor="jira-auto-create" className="text-sm font-medium text-gray-700">
                      JIRA Task-Erstellung im Widget aktivieren
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      Benutzer können direkt im Feedback-Widget JIRA-Tasks erstellen
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Was passiert wenn aktiviert:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Benutzer sehen eine &quot;Als JIRA-Task erstellen&quot; Checkbox im Widget</li>
                    <li>• Feedback kann direkt als JIRA-Task erstellt werden</li>
                    <li>• Funktioniert nur wenn JIRA korrekt konfiguriert ist</li>
                  </ul>
                </div>
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

        {/* Status Management Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6 mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Status / Swimlanes
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Verwalten Sie die Status für Tasks in diesem Projekt.
              Status können hinzugefügt, bearbeitet, gelöscht und neu sortiert werden.
            </p>
          </div>

          <div className="px-6 py-6">
            <StatusManager projectId={parseInt(params.id)} />
          </div>
        </div>

        {/* User Access Management Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6 mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Benutzerzugriffe
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Verwalten Sie welche Benutzer Zugriff auf dieses Projekt haben.
              Nur Admins können Benutzer hinzufügen oder entfernen.
            </p>
          </div>

          <div className="px-6 py-6">
            <ProjectUserManager
              projectId={parseInt(params.id)}
              users={users}
              loading={loadingUsers}
              currentUser={user}
              refreshUsers={refreshUsers}
            />
          </div>
        </div>

        {/* Widget Installation Script */}
        {project && (
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6 mt-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Code className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">
                  Widget Installation
                </h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Fügen Sie dieses Script auf Ihrer Website ein, um das Feedback-Widget zu aktivieren.
              </p>
            </div>

            <div className="px-6 py-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <pre className="text-sm text-gray-800 overflow-x-auto font-mono whitespace-pre-wrap">
{`<script>
(function() {
  const script = document.createElement('script');
  script.src = '${process.env.NEXT_PUBLIC_BASE_URL || typeof window !== 'undefined' ? window.location.origin : ''}/widget/widget.js';
  script.setAttribute('data-project-id', '${project.id}');
  script.async = true;
  document.head.appendChild(script);
})();
</script>`}
                </pre>
              </div>

              <button
                onClick={copyWidgetScript}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {copiedWidget ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Script kopieren
                  </>
                )}
              </button>

              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Fügen Sie diesen Code vor dem schließenden <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> Tag ein
                </p>
                <p className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Das Widget erscheint als Button am rechten Bildschirmrand
                </p>
                <p className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  Nutzer können Elemente auswählen und Feedback hinterlassen
                </p>
              </div>

              {project.widget_installed && project.widget_last_ping && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Widget ist aktiv - Letzter Ping: {new Date(project.widget_last_ping).toLocaleString('de-DE', {
                      timeZone: 'Europe/Zurich',
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

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