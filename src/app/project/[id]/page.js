'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getScreenshotUrl } from '../../../lib/cloudflare-r2';
import { 
  Copy, 
  CheckCircle, 
  ExternalLink, 
  Code, 
  MessageSquare, 
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Globe,
  Calendar,
  Edit3,
  Save,
  X,
  ExternalLink as JiraIcon,
  Settings
} from 'lucide-react';
import Link from 'next/link';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [creatingJira, setCreatingJira] = useState(null);
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [jiraTaskForm, setJiraTaskForm] = useState({
    assignee: '',
    sprint: '',
    board: ''
  });
  const [showJiraSettings, setShowJiraSettings] = useState(false);
  const [jiraConfig, setJiraConfig] = useState({
    serverUrl: '',
    username: '',
    apiToken: '',
    projectKey: '',
    issueType: 'Task',
    defaultAssignee: '',
    selectedSprint: '',
    selectedBoardId: ''
  });
  const [jiraData, setJiraData] = useState({
    projects: [],
    users: [],
    boards: [],
    sprints: []
  });
  const [jiraStatuses, setJiraStatuses] = useState({});
  const [toast, setToast] = useState(null);

  const snippetCode = project ? 
    `<script src="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/widget.js" data-project-id="${project.name}" defer></script>` :
    '';

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      if (!response.ok) {
        throw new Error('Project not found');
      }
      const projectData = await response.json();
      setProject(projectData);
    } catch (error) {
      console.error('Error loading project:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/tasks`);
      if (response.ok) {
        const tasksData = await response.json();
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const checkWidgetStatus = async () => {
    if (!project) return;
    
    try {
      const response = await fetch(`/api/projects/${params.id}/widget-status`);
      if (response.ok) {
        const status = await response.json();
        setProject(prev => ({
          ...prev,
          widget_installed: status.installed,
          widget_last_ping: status.last_ping
        }));
      }
    } catch (error) {
      console.error('Error checking widget status:', error);
    }
  };

  useEffect(() => {
    loadProject();
    loadTasks();
    loadJiraSettings();

    // Check widget installation status immediately and then every 10 seconds
    checkWidgetStatus();
    const interval = setInterval(checkWidgetStatus, 10000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    // Load JIRA statuses when tasks or jiraConfig change
    if (tasks.length > 0 && jiraConfig.serverUrl) {
      loadJiraStatuses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, jiraConfig]);

  const loadJiraSettings = async () => {
    try {
      const response = await fetch(`/api/settings?key=jira_config_project_${params.id}`);
      const data = await response.json();
      
      if (data.success && data.setting) {
        setJiraConfig(data.setting.value);
      }
    } catch (error) {
      console.error('Error loading JIRA settings:', error);
    }
  };


  const saveJiraSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: `jira_config_project_${params.id}`,
          value: jiraConfig
        })
      });

      if (response.ok) {
        showToast('JIRA-Einstellungen gespeichert!', 'success');
        setShowJiraSettings(false);
      } else {
        showToast('Fehler beim Speichern der JIRA-Einstellungen', 'error');
      }
    } catch (error) {
      console.error('Error saving JIRA settings:', error);
      showToast('Fehler beim Speichern der JIRA-Einstellungen', 'error');
    }
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippetCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const showToast = (message, type = 'success', link = null) => {
    setToast({ message, type, link });
    setTimeout(() => setToast(null), 8000); // Longer for links
  };

  const loadJiraStatuses = async () => {
    const tasksWithJira = tasks.filter(task => task.jira_key);
    if (tasksWithJira.length === 0 || !jiraConfig.serverUrl || !jiraConfig.username || !jiraConfig.apiToken) {
      console.log('Skipping JIRA status load:', { 
        tasksWithJira: tasksWithJira.length, 
        hasServerUrl: !!jiraConfig.serverUrl,
        hasCredentials: !!(jiraConfig.username && jiraConfig.apiToken)
      });
      return;
    }

    console.log('Loading JIRA statuses for tasks:', tasksWithJira.map(t => t.jira_key));

    const statusPromises = tasksWithJira.map(async (task) => {
      try {
        const url = `/api/jira/status?issueKey=${encodeURIComponent(task.jira_key)}&serverUrl=${encodeURIComponent(jiraConfig.serverUrl)}&username=${encodeURIComponent(jiraConfig.username)}&apiToken=${encodeURIComponent(jiraConfig.apiToken)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        console.log(`JIRA status response for ${task.jira_key}:`, data);
        
        if (data.success) {
          return { taskId: task.id, status: data.status };
        } else {
          console.warn(`JIRA status failed for ${task.jira_key}:`, data.error);
        }
      } catch (error) {
        console.warn(`Failed to load JIRA status for ${task.jira_key}:`, error);
      }
      return null;
    });

    const results = await Promise.all(statusPromises);
    const statusMap = {};
    results.filter(Boolean).forEach(result => {
      statusMap[result.taskId] = result.status;
    });
    
    console.log('Final JIRA status map:', statusMap);
    setJiraStatuses(statusMap);
  };

  const updateTaskJiraKey = async (taskId, jiraKey) => {
    try {
      console.log('Updating task JIRA key:', { taskId, jiraKey, projectId: params.id });
      
      const response = await fetch(`/api/projects/${params.id}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jira_key: jiraKey
        })
      });

      console.log('Update response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update task JIRA key in database. Status:', response.status, 'Response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          console.error('Parsed error data:', errorData);
        } catch {
          console.error('Could not parse error response as JSON');
        }
      } else {
        const successData = await response.json();
        console.log('JIRA key update successful:', successData);
      }
    } catch (error) {
      console.error('Error updating task JIRA key:', error);
    }
  };

  const startEditing = (task) => {
    setEditingTask(task.id);
    setEditForm({
      title: task.title,
      description: task.description || ''
    });
  };

  const cancelEditing = () => {
    setEditingTask(null);
    setEditForm({ title: '', description: '' });
  };

  const saveTask = async (taskId) => {
    try {
      const response = await fetch(`/api/projects/${params.id}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description
        })
      });

      if (response.ok) {
        // Update tasks in state
        setTasks(tasks.map(task => 
          task.id === taskId 
            ? { ...task, title: editForm.title, description: editForm.description }
            : task
        ));
        setEditingTask(null);
        setEditForm({ title: '', description: '' });
        showToast('Task erfolgreich gespeichert!', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to update task:', response.status, errorData);
        showToast('Fehler beim Speichern: ' + (errorData.details || 'Unbekannter Fehler'), 'error');
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const openJiraModal = async (task) => {
    try {
      // Get project-specific JIRA settings
      const settingsResponse = await fetch(`/api/settings?key=jira_config_project_${params.id}`);
      const settingsData = await settingsResponse.json();
      
      if (!settingsData.success || !settingsData.setting) {
        showToast('Bitte konfigurieren Sie zuerst die JIRA-Einstellungen für dieses Projekt.', 'error');
        return;
      }

      setSelectedTask(task);
      setJiraTaskForm({ assignee: '', sprint: '', board: '' });
      setShowJiraModal(true);
      
      // Load JIRA data for modal
      const config = settingsData.setting.value;
      await loadJiraDataForModal(config);
      
    } catch (error) {
      console.error('Error opening JIRA modal:', error);
      showToast('Fehler beim Laden der JIRA-Daten', 'error');
    }
  };

  const loadJiraDataForModal = async (config) => {
    try {
      // Load users and boards
      const [usersResponse, boardsResponse] = await Promise.all([
        fetch(`/api/jira?action=getUsers&serverUrl=${encodeURIComponent(config.serverUrl)}&username=${encodeURIComponent(config.username)}&apiToken=${encodeURIComponent(config.apiToken)}&projectKey=${encodeURIComponent(config.projectKey)}`),
        fetch(`/api/jira?action=getBoards&serverUrl=${encodeURIComponent(config.serverUrl)}&username=${encodeURIComponent(config.username)}&apiToken=${encodeURIComponent(config.apiToken)}&projectKey=${encodeURIComponent(config.projectKey)}`)
      ]);

      const [usersData, boardsData] = await Promise.all([
        usersResponse.json(),
        boardsResponse.json()
      ]);

      if (usersData.success) {
        setJiraData(prev => ({ ...prev, users: usersData.users }));
      }

      if (boardsData.success) {
        setJiraData(prev => ({ ...prev, boards: boardsData.boards }));
        
        // Auto-select first board and load its sprints
        if (boardsData.boards.length > 0) {
          const firstBoard = boardsData.boards[0];
          setJiraTaskForm(prev => ({ ...prev, board: firstBoard.id }));
          await loadSprintsForBoard(config, firstBoard.id);
        }
      }
    } catch (error) {
      console.error('Error loading JIRA data:', error);
    }
  };

  const loadSprintsForBoard = async (config, boardId) => {
    try {
      const response = await fetch(`/api/jira?action=getSprints&serverUrl=${encodeURIComponent(config.serverUrl)}&username=${encodeURIComponent(config.username)}&apiToken=${encodeURIComponent(config.apiToken)}&boardId=${encodeURIComponent(boardId)}`);
      const data = await response.json();
      
      if (data.success) {
        setJiraData(prev => ({ ...prev, sprints: data.sprints }));
      }
    } catch (error) {
      console.error('Error loading sprints:', error);
    }
  };

  const createJiraTaskWithOptions = async () => {
    if (!selectedTask) return;
    
    setCreatingJira(selectedTask.id);
    try {
      // Get project-specific JIRA settings
      const settingsResponse = await fetch(`/api/settings?key=jira_config_project_${params.id}`);
      const settingsData = await settingsResponse.json();
      const jiraConfig = settingsData.setting.value;

      // Add selected options to config
      const configWithOptions = {
        ...jiraConfig,
        defaultAssignee: jiraTaskForm.assignee,
        selectedSprint: jiraTaskForm.sprint,
        selectedBoardId: jiraTaskForm.board
      };

      const response = await fetch('/api/jira', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'createTicket',
          feedback: {
            title: selectedTask.title.replace(/\r?\n/g, ' '),
            description: selectedTask.description || '',
            url: selectedTask.url,
            screenshot: selectedTask.screenshot ? (
              selectedTask.screenshot.startsWith('http') 
                ? selectedTask.screenshot 
                : getScreenshotUrl(selectedTask.screenshot)
            ) : null,
            created_at: selectedTask.created_at,
            selected_area: selectedTask.selected_area,
            id: selectedTask.id
          },
          jiraConfig: configWithOptions
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.ticket) {
          // Update task in local state with JIRA key only
          setTasks(tasks.map(task => 
            task.id === selectedTask.id 
              ? { 
                  ...task, 
                  jira_key: result.ticket.key
                }
              : task
          ));

          // Update in database (only JIRA key)
          await updateTaskJiraKey(selectedTask.id, result.ticket.key);

          showToast(
            'JIRA-Task erfolgreich erstellt!', 
            'success',
            {
              url: result.ticket.url,
              text: `${result.ticket.key} öffnen →`
            }
          );
          setShowJiraModal(false);
        } else {
          showToast('JIRA-Task wurde erstellt, aber Antwort ist unvollständig.', 'warning');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create JIRA task:', response.status, errorData);
        showToast('Fehler beim Erstellen des JIRA-Tasks: ' + (errorData.error || 'Unbekannter Fehler'), 'error');
      }
    } catch (error) {
      console.error('Error creating JIRA task:', error);
      showToast('Fehler beim Erstellen des JIRA-Tasks', 'error');
    } finally {
      setCreatingJira(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Projekt nicht gefunden</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 max-w-sm ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          toast.type === 'warning' ? 'bg-yellow-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {toast.type === 'error' && <AlertCircle className="h-4 w-4" />}
              {toast.type === 'warning' && <AlertCircle className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium block">{toast.message}</span>
              {toast.link && (
                <a
                  href={toast.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline hover:no-underline mt-1 block"
                >
                  {toast.link.text}
                </a>
              )}
            </div>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 ml-2 text-white hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* JIRA Task Creation Modal */}
      {showJiraModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">JIRA-Task erstellen</h3>
            
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">{selectedTask.title}</h4>
              {selectedTask.description && (
                <p className="text-sm text-gray-600 mb-2">{selectedTask.description}</p>
              )}
              <p className="text-xs text-gray-500">{selectedTask.url}</p>
            </div>

            <div className="space-y-4">
              {/* Assignee Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zuweisen an
                </label>
                <select
                  value={jiraTaskForm.assignee}
                  onChange={(e) => setJiraTaskForm({ ...jiraTaskForm, assignee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Nicht zuweisen</option>
                  {jiraData.users.map(user => (
                    <option key={user.accountId} value={user.accountId}>
                      {user.displayName} ({user.emailAddress})
                    </option>
                  ))}
                </select>
              </div>

              {/* Board Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Board
                </label>
                <select
                  value={jiraTaskForm.board}
                  onChange={async (e) => {
                    const boardId = e.target.value;
                    setJiraTaskForm({ ...jiraTaskForm, board: boardId, sprint: '' });
                    if (boardId) {
                      const settingsResponse = await fetch(`/api/settings?key=jira_config_project_${params.id}`);
                      const settingsData = await settingsResponse.json();
                      await loadSprintsForBoard(settingsData.setting.value, boardId);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Board auswählen</option>
                  {jiraData.boards.map(board => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sprint Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sprint
                </label>
                <select
                  value={jiraTaskForm.sprint}
                  onChange={(e) => setJiraTaskForm({ ...jiraTaskForm, sprint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!jiraTaskForm.board}
                >
                  <option value="">Kein Sprint (Backlog)</option>
                  {jiraData.sprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name} ({sprint.state})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={createJiraTaskWithOptions}
                disabled={creatingJira === selectedTask.id}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-medium"
              >
                {creatingJira === selectedTask.id ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Erstelle...
                  </>
                ) : (
                  'JIRA-Task erstellen'
                )}
              </button>
              <button
                onClick={() => setShowJiraModal(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium"
                disabled={creatingJira === selectedTask.id}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Startseite
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-gray-600">
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">{project.domain}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    Erstellt am {new Date(project.created_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Widget Status */}
            <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              project.widget_installed 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {project.widget_installed ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Widget installiert
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  Widget nicht installiert
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Widget Installation - only show if not installed */}
          {!project.widget_installed && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Code className="h-5 w-5 text-blue-600" />
                Widget Installation
              </h2>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between gap-4">
                  <code className="text-sm text-gray-800 break-all flex-1 font-mono">
                    {snippetCode}
                  </code>
                  <button
                    onClick={copySnippet}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Kopiert!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Kopieren
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  ✅ Fügen Sie diesen Code vor dem schließenden <code>&lt;/body&gt;</code> Tag ein
                </p>
                <p>
                  ✅ Das Widget erscheint als Button am rechten Bildschirmrand (mittig)
                </p>
                <p>
                  ✅ Nutzer können Screenshots machen und Kommentare hinterlassen
                </p>
              </div>

              {project.widget_last_ping && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ Letzter Widget-Ping: {new Date(project.widget_last_ping).toLocaleString('de-DE')}
                  </p>
                </div>
              )}
              </div>
            </div>
          )}

          {/* Tasks */}
          <div className={project.widget_installed ? "lg:col-span-2" : "lg:col-span-2"}>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                Tasks ({tasks.length})
              </h2>
              
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Noch keine Tasks vorhanden</p>
                  <p className="text-sm mt-2">
                    Tasks werden automatisch erstellt, wenn Nutzer Feedback über das Widget senden.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Open Tasks - prominent display */}
                  {tasks.filter(task => !task.jira_key).length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Offene Tasks</h3>
                      {tasks.filter(task => !task.jira_key).map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                        <span>{new Date(task.created_at).toLocaleString('de-DE')}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          {task.status === 'open' ? 'Offen' : task.status === 'in_progress' ? 'In Bearbeitung' : 'Abgeschlossen'}
                        </span>
                      </div>
                      <div className="mb-2">
                        {editingTask === task.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Task-Titel"
                            />
                            <textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                              rows="3"
                              placeholder="Beschreibung (optional)"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => saveTask(task.id)}
                                className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                              >
                                <Save className="h-3 w-3" />
                                Speichern
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                              >
                                <X className="h-3 w-3" />
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <h3 className="font-medium text-gray-900 flex-1">{task.title}</h3>
                            {!task.jira_key && (
                              <button
                                onClick={() => startEditing(task)}
                                className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded"
                                title="Bearbeiten"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {!editingTask || editingTask !== task.id ? (
                        task.description && (
                          <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                        )
                      ) : null}
                      
                      <div className="text-xs text-gray-500 space-y-2">
                        <div className="flex items-center justify-between">
                          {task.url && (
                            <a 
                              href={task.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Seite öffnen
                            </a>
                          )}
                          {!task.jira_key && (
                            <button
                              onClick={() => openJiraModal(task)}
                              disabled={creatingJira === task.id}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-xs"
                              title="JIRA-Task erstellen"
                            >
                              {creatingJira === task.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  Erstelle...
                                </>
                              ) : (
                                <>
                                  <JiraIcon className="h-3 w-3" />
                                  JIRA-Task
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        {task.url && (
                          <div className="break-all text-gray-600 bg-gray-50 p-2 rounded border text-xs font-mono">
                            {task.url}
                          </div>
                        )}
                      </div>
                      
                      {task.screenshot && (
                        <div className="mt-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={task.screenshot.startsWith('http') ? task.screenshot : getScreenshotUrl(task.screenshot)} 
                            alt="Task Screenshot" 
                            className="max-w-full h-auto rounded border"
                            style={{ maxHeight: '200px' }}
                          />
                        </div>
                      )}
                    </div>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* JIRA Tasks - compact display at top */}
            {tasks.filter(task => task.jira_key).length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">JIRA Tasks ({tasks.filter(task => task.jira_key).length})</h3>
                <div className="space-y-2">
                  {tasks.filter(task => task.jira_key).map((task) => (
                    <div key={task.id} className="bg-gray-50 rounded p-3 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <a
                          href={`${jiraConfig.serverUrl}/browse/${task.jira_key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium hover:bg-blue-200"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {task.jira_key}
                        </a>
                        {jiraStatuses[task.id] && (
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            jiraStatuses[task.id].category === 'Done' ? 'bg-green-100 text-green-700' :
                            jiraStatuses[task.id].category === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {jiraStatuses[task.id].name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 font-medium mb-1">{task.title}</p>
                      <p className="text-xs text-gray-500">{new Date(task.created_at).toLocaleDateString('de-DE')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Project Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Projekt Statistiken</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gesamt Tasks:</span>
                  <span className="font-medium">{tasks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Offene Tasks:</span>
                  <span className="font-medium text-red-600">
                    {tasks.filter(t => !t.jira_key && t.status === 'open').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">JIRA Tasks:</span>
                  <span className="font-medium text-blue-600">
                    {tasks.filter(t => t.jira_key).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Widget Status - only show when installed */}
            {project.widget_installed && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Code className="h-4 w-4 text-green-600" />
                  Widget Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">Widget installiert</span>
                  </div>
                  {project.widget_last_ping && (
                    <div className="text-xs text-gray-600">
                      Letzter Ping: {new Date(project.widget_last_ping).toLocaleString('de-DE')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* JIRA Settings */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">JIRA Integration</h3>
                <button
                  onClick={() => setShowJiraSettings(!showJiraSettings)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="JIRA-Einstellungen"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
              
              {showJiraSettings ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Server URL
                    </label>
                    <input
                      type="text"
                      value={jiraConfig.serverUrl}
                      onChange={(e) => setJiraConfig({ ...jiraConfig, serverUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://company.atlassian.net"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Benutzername
                    </label>
                    <input
                      type="text"
                      value={jiraConfig.username}
                      onChange={(e) => setJiraConfig({ ...jiraConfig, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="user@company.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Token
                    </label>
                    <input
                      type="password"
                      value={jiraConfig.apiToken}
                      onChange={(e) => setJiraConfig({ ...jiraConfig, apiToken: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="API Token"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Projekt-Key
                    </label>
                    <input
                      type="text"
                      value={jiraConfig.projectKey}
                      onChange={(e) => setJiraConfig({ ...jiraConfig, projectKey: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="PROJ"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issue Type
                    </label>
                    <select
                      value={jiraConfig.issueType}
                      onChange={(e) => setJiraConfig({ ...jiraConfig, issueType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Task">Task</option>
                      <option value="Bug">Bug</option>
                      <option value="Story">Story</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={saveJiraSettings}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                      Speichern
                    </button>
                    <button
                      onClick={() => setShowJiraSettings(false)}
                      className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600 text-sm mb-4">
                    Konfigurieren Sie JIRA um Tasks automatisch zu erstellen.
                  </p>
                  <div className="text-xs text-gray-500">
                    {jiraConfig.serverUrl ? (
                      <span className="text-green-600">✓ Konfiguriert</span>
                    ) : (
                      <span className="text-gray-400">Nicht konfiguriert</span>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}