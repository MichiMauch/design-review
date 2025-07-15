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
  const [jiraConfigOpen, setJiraConfigOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTask, setDeletingTask] = useState(null);
  const [showTaskDeleteConfirm, setShowTaskDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [jiraConfig, setJiraConfig] = useState({
    serverUrl: '',
    username: '',
    apiToken: '',
    projectKey: '',
    issueType: 'Task'
  });
  const [jiraTaskData, setJiraTaskData] = useState({
    title: '',
    description: '',
    assignee: '',
    sprint: '',
    labels: ''
  });
  const [jiraUsers, setJiraUsers] = useState([]);
  const [jiraSprintsOptions, setJiraSprintsOptions] = useState([]);
  const [loadingJiraData, setLoadingJiraData] = useState(false);
  const [jiraStatuses, setJiraStatuses] = useState({});
  const [jiraTaskSprints, setJiraTaskSprints] = useState({});
  const [toast, setToast] = useState(null);

  const snippetCode = project ? 
    `<script src="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/widget.js" data-project-id="${project.name}" defer></script>` :
    '';

  // Load JIRA config from localStorage on component mount
  useEffect(() => {
    const savedJiraConfig = localStorage.getItem('jiraConfig');
    if (savedJiraConfig) {
      try {
        setJiraConfig(JSON.parse(savedJiraConfig));
      } catch (error) {
        console.error('Error loading JIRA config from localStorage:', error);
      }
    }
  }, []);

  // Load project and tasks when component mounts or params change
  useEffect(() => {
    if (params.id) {
      loadProject();
      loadTasks();
      checkWidgetStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Load JIRA statuses when tasks or jiraConfig changes
  useEffect(() => {
    if (tasks.length > 0 && jiraConfig.serverUrl) {
      loadJiraStatuses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, jiraConfig]);

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

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Gerade eben';
    } else if (diffMins < 60) {
      return `vor ${diffMins} Min`;
    } else if (diffHours < 24) {
      return `vor ${diffHours} Std`;
    } else if (diffDays < 7) {
      return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    } else {
      // For older dates, show in German timezone
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Berlin'
      });
    }
  };

  const getJiraStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    
    const statusName = status.name?.toLowerCase() || '';
    const category = status.category?.toLowerCase() || '';
    
    // Status-spezifische Farben
    if (statusName.includes('done') || statusName.includes('resolved') || statusName.includes('closed') || category === 'done') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (statusName.includes('progress') || statusName.includes('development') || statusName.includes('review') || category === 'in progress') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (statusName.includes('testing') || statusName.includes('qa')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (statusName.includes('blocked') || statusName.includes('impediment')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (statusName.includes('ready') || statusName.includes('todo') || statusName.includes('backlog')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    
    // Fallback nach Kategorie
    switch (category) {
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      case 'in progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const showToast = (message, type = 'success', link = null) => {
    setToast({ message, type, link });
    setTimeout(() => setToast(null), 8000); // Longer for links
  };

  // Delete project function
  const deleteProject = async () => {
    if (!project) return;
    
    setDeletingProject(true);
    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast('Projekt erfolgreich gelöscht!', 'success');
        router.push('/projects');
      } else {
        showToast('Fehler beim Löschen des Projekts', 'error');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      showToast('Fehler beim Löschen des Projekts', 'error');
    } finally {
      setDeletingProject(false);
      setShowDeleteConfirm(false);
    }
  };

  // Show task delete confirmation
  const openTaskDeleteModal = (task) => {
    setTaskToDelete(task);
    setShowTaskDeleteConfirm(true);
  };


  // Delete task function
  const deleteTask = async () => {
    if (!taskToDelete) return;
    
    setDeletingTask(taskToDelete.id);
    try {
      const response = await fetch(`/api/projects/${params.id}/tasks/${taskToDelete.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast('Task erfolgreich gelöscht!', 'success');
        // Reload tasks after deletion
        loadTasks();
      } else {
        showToast('Fehler beim Löschen der Task', 'error');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      showToast('Fehler beim Löschen der Task', 'error');
    } finally {
      setDeletingTask(null);
      setTaskToDelete(null);
      setShowTaskDeleteConfirm(false);
    }
  };

  const saveJiraConfig = async () => {
    try {
      // Save JIRA config to localStorage
      localStorage.setItem('jiraConfig', JSON.stringify(jiraConfig));
      showToast('JIRA-Konfiguration gespeichert!', 'success');
      setJiraConfigOpen(false);
    } catch (error) {
      console.error('Error saving JIRA config:', error);
      showToast('Fehler beim Speichern der JIRA-Konfiguration', 'error');
    }
  };

  const testJiraConnection = async () => {
    try {
      showToast('Teste JIRA-Verbindung...', 'info');
      
      // Test the JIRA connection
      const response = await fetch('/api/jira', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'testConnection',
          serverUrl: jiraConfig.serverUrl,
          username: jiraConfig.username,
          apiToken: jiraConfig.apiToken,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        showToast('JIRA-Verbindung erfolgreich!', 'success');
      } else {
        showToast(`JIRA-Verbindung fehlgeschlagen: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error testing JIRA connection:', error);
      showToast('Fehler beim Testen der JIRA-Verbindung', 'error');
    }
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
          return { taskId: task.id, status: data.status, sprint: data.sprint };
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
    const sprintMap = {};
    results.filter(Boolean).forEach(result => {
      statusMap[result.taskId] = result.status;
      if (result.sprint) {
        sprintMap[result.taskId] = result.sprint;
      }
    });
    
    console.log('Final JIRA status map:', statusMap);
    console.log('Final JIRA sprint map:', sprintMap);
    setJiraStatuses(statusMap);
    setJiraTaskSprints(sprintMap);
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
      // Check if JIRA is configured in localStorage
      if (!jiraConfig.serverUrl || !jiraConfig.username || !jiraConfig.apiToken || !jiraConfig.projectKey) {
        showToast('Bitte konfigurieren Sie zuerst die JIRA-Einstellungen für dieses Projekt.', 'error');
        setJiraConfigOpen(true);
        return;
      }

      setSelectedTask(task);
      setJiraTaskData({
        title: task.title,
        description: task.description || '',
        assignee: '',
        sprint: '',
        labels: ''
      });
      
      // Load JIRA users and sprints before showing modal
      setLoadingJiraData(true);
      await Promise.all([
        loadJiraUsers(),
        loadJiraSprints()
      ]);
      setLoadingJiraData(false);
      
      setShowJiraModal(true);
      
    } catch (error) {
      console.error('Error opening JIRA modal:', error);
      setLoadingJiraData(false);
      showToast('Fehler beim Laden der JIRA-Daten', 'error');
    }
  };

  const loadJiraUsers = async () => {
    try {
      const params = new URLSearchParams({
        action: 'getUsers',
        serverUrl: jiraConfig.serverUrl,
        username: jiraConfig.username,
        apiToken: jiraConfig.apiToken,
        projectKey: jiraConfig.projectKey
      });

      const response = await fetch(`/api/jira?${params}`, {
        method: 'GET',
      });

      const result = await response.json();
      if (result.success && result.users) {
        setJiraUsers(result.users);
      }
    } catch (error) {
      console.error('Error loading JIRA users:', error);
    }
  };

  const loadJiraSprints = async () => {
    try {
      // First get boards for the project
      const boardsParams = new URLSearchParams({
        action: 'getBoards',
        serverUrl: jiraConfig.serverUrl,
        username: jiraConfig.username,
        apiToken: jiraConfig.apiToken,
        projectKey: jiraConfig.projectKey
      });

      const boardsResponse = await fetch(`/api/jira?${boardsParams}`, {
        method: 'GET',
      });

      const boardsResult = await boardsResponse.json();
      if (boardsResult.success && boardsResult.boards && boardsResult.boards.length > 0) {
        const boardId = boardsResult.boards[0].id; // Use first board
        
        // Now get sprints for this board
        const sprintsParams = new URLSearchParams({
          action: 'getSprints',
          serverUrl: jiraConfig.serverUrl,
          username: jiraConfig.username,
          apiToken: jiraConfig.apiToken,
          boardId: boardId
        });

        const sprintsResponse = await fetch(`/api/jira?${sprintsParams}`, {
          method: 'GET',
        });

        const sprintsResult = await sprintsResponse.json();
        if (sprintsResult.success && sprintsResult.sprints) {
          setJiraSprintsOptions(sprintsResult.sprints);
        }
      }
    } catch (error) {
      console.error('Error loading JIRA sprints:', error);
    }
  };

  const createJiraTask = async () => {
    if (!selectedTask) return;
    
    setCreatingJira(selectedTask.id);
    try {
      const response = await fetch('/api/jira', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },          body: JSON.stringify({
            action: 'createTicket',
            feedback: {
              title: jiraTaskData.title || selectedTask.title,
              description: jiraTaskData.description || selectedTask.description || '',
              url: selectedTask.url,
              selected_area: selectedTask.selected_area,
              screenshot: selectedTask.screenshot ? (
                selectedTask.screenshot.startsWith('http') 
                  ? selectedTask.screenshot 
                  : getScreenshotUrl(selectedTask.screenshot)
              ) : null
            },
          jiraConfig: {
            ...jiraConfig,
            defaultAssignee: jiraTaskData.assignee,
            selectedSprint: jiraTaskData.sprint,
            defaultLabels: jiraTaskData.labels ? jiraTaskData.labels.split(',').map(l => l.trim()) : []
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Update task with JIRA key
        const updateResponse = await fetch(`/api/projects/${params.id}/tasks/${selectedTask.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jira_key: result.jiraKey || result.ticket?.key,
            jira_url: result.jiraUrl || result.ticket?.url
          })
        });

        if (updateResponse.ok) {
          showToast(`JIRA-Task erfolgreich erstellt: ${result.jiraKey || result.ticket?.key}`, 'success');
          setShowJiraModal(false);
          loadTasks(); // Refresh tasks
        } else {
          showToast('Task erstellt, aber Update fehlgeschlagen', 'error');
        }
      } else {
        showToast(`Fehler beim Erstellen: ${result.error}`, 'error');
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
                  <a 
                    href={project.domain.startsWith('http') ? project.domain : `https://${project.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {project.domain}
                  </a>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    Erstellt am {formatTime(project.created_at)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
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
              
            {/* Delete Project Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm"
              title="Projekt löschen"
            >
              <X className="h-4 w-4" />
              Löschen
            </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {/* Widget Installation - only show if not installed */}
            {!project.widget_installed && (
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
                    ✅ Nutzer können Elemente auswählen und Feedback hinterlassen
                  </p>
                  <p>
                    ✅ Keine Browser-Berechtigungen erforderlich (DOM-basiert)
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
            )}

            {/* Tasks */}
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
                    {project.widget_installed 
                      ? "Tasks werden automatisch erstellt, wenn Nutzer Feedback über das Widget senden."
                      : "Installieren Sie zuerst das Widget, damit Nutzer Feedback senden können."
                    }
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
                        <span>{formatTime(task.created_at)}</span>
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
                            <div className="flex items-center gap-1 ml-2">
                              {!task.jira_key && (
                                <button
                                  onClick={() => startEditing(task)}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                  title="Bearbeiten"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => openTaskDeleteModal(task)}
                                disabled={deletingTask === task.id}
                                className="p-1 text-red-400 hover:text-red-600 rounded disabled:opacity-50"
                                title="Task löschen"
                              >
                                {deletingTask === task.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </button>
                            </div>
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
                              disabled={creatingJira === task.id || loadingJiraData}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-xs"
                              title="JIRA-Task erstellen"
                            >
                              {creatingJira === task.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  Erstelle...
                                </>
                              ) : loadingJiraData ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  Lade...
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
                      
                      {/* Selected Area Information */}
                      {task.selected_area && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                            <span className="text-sm font-medium text-blue-800">Ausgewählter Bereich</span>
                          </div>
                          {(() => {
                            try {
                              const areaData = typeof task.selected_area === 'string' 
                                ? JSON.parse(task.selected_area) 
                                : task.selected_area;
                              
                              const areaSize = Math.round(areaData.width) * Math.round(areaData.height);
                              const isLargeArea = areaSize > 50000; // > 50k pixels
                              const isSmallElement = areaData.width < 100 && areaData.height < 100;
                              
                              return (
                                <div className="space-y-2">
                                  <div className="text-xs text-blue-700 space-y-1">
                                    <div>📍 Position: {Math.round(areaData.x)}px von links, {Math.round(areaData.y)}px von oben</div>
                                    <div>📏 Größe: {Math.round(areaData.width)} × {Math.round(areaData.height)} px 
                                      {isLargeArea && <span className="text-blue-600"> (großer Bereich)</span>}
                                      {isSmallElement && <span className="text-blue-600"> (kleines Element)</span>}
                                    </div>
                                  </div>
                                  
                                  {task.url && (
                                    <div className="pt-2 border-t border-blue-200">
                                      <a
                                        href={`${task.url}#feedback-highlight`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                      >
                                        🔗 Seite öffnen und Bereich anzeigen
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                      <div className="text-xs text-blue-600 mt-1">
                                        💡 Tipp: Entwickler können mit diesen Koordinaten den exakten Bereich im Browser-DevTools finden
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            } catch {
                              return <div className="text-xs text-blue-700">Bereichs-Daten verfügbar</div>;
                            }
                          })()}
                        </div>
                      )}
                      
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
          <div className="lg:col-span-1 space-y-6">
            {/* JIRA Tasks */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">JIRA Tasks ({tasks.filter(task => task.jira_key).length})</h3>
              {tasks.filter(task => task.jira_key).length > 0 ? (
                <div className="space-y-2">
                  {tasks.filter(task => task.jira_key).map((task) => (
                    <div key={task.id} className="bg-gray-50 rounded p-3 border border-gray-100">
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-full max-w-xs">
                          <div className="mb-1">
                            <a
                              href={`${jiraConfig.serverUrl}/browse/${task.jira_key}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium hover:bg-blue-200"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {task.jira_key}
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {jiraStatuses[task.id] && (
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${getJiraStatusColor(jiraStatuses[task.id])}`}>
                              {jiraStatuses[task.id].name}
                            </span>
                          )}
                        </div>
                      </div>
                      {jiraTaskSprints[task.id] && (
                        <div className="flex items-start justify-between mb-2">
                          <div className="w-full max-w-xs">
                            <div className="mb-1">
                              <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                                {jiraTaskSprints[task.id].name}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                          </div>
                        </div>
                      )}
                      <p className="text-sm text-gray-700 font-medium mb-1">{task.title}</p>
                      <p className="text-xs text-gray-500">{formatTime(task.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <div className="text-sm">Noch keine JIRA Tasks erstellt</div>
                  <div className="text-xs mt-1">Tasks können über den &quot;JIRA-Task&quot; Button erstellt werden</div>
                </div>
              )}
            </div>

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

            {/* Widget Status */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Code className="h-4 w-4 text-gray-600" />
                Widget Status
              </h3>
              <div className="space-y-3">
                {project.widget_installed ? (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">Widget installiert</span>
                    </div>
                    {project.widget_last_ping && (
                      <div className="text-xs text-gray-600">
                        Letzter Ping: {new Date(project.widget_last_ping).toLocaleString('de-DE')}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700 font-medium">Widget nicht installiert</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Installieren Sie das Widget mit dem Code-Snippet oben
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* JIRA Integration */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">JIRA Integration</h3>
                <button
                  onClick={() => setJiraConfigOpen(!jiraConfigOpen)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="JIRA-Einstellungen"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
                
              {jiraConfigOpen ? (
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
                      onClick={saveJiraConfig}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                      <Save className="h-3 w-3" />
                      Speichern
                    </button>
                    <button
                      onClick={testJiraConnection}
                      className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Testen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  <p>JIRA-Integration konfiguriert</p>
                  <p className="text-xs mt-1">Klicken Sie auf das Einstellungs-Icon zum Bearbeiten</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Projekt löschen</h3>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  Sind Sie sicher, dass Sie das Projekt <strong>{project.name}</strong> löschen möchten?
                </p>
                <p className="text-sm text-red-600">
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle Tasks und Daten werden dauerhaft gelöscht.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={deleteProject}
                  disabled={deletingProject}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  {deletingProject ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Lösche...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Projekt löschen
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingProject}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task Delete Confirmation Modal */}
        {showTaskDeleteConfirm && taskToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Task löschen</h3>
              
              <p className="text-gray-600 mb-6">
                Sind Sie sicher, dass Sie die Task <strong>&quot;{taskToDelete.title}&quot;</strong> löschen möchten? 
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={deleteTask}
                  disabled={deletingTask === taskToDelete.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  {deletingTask === taskToDelete.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Lösche...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Task löschen
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowTaskDeleteConfirm(false);
                    setTaskToDelete(null);
                  }}
                  disabled={deletingTask === taskToDelete.id}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* JIRA Modal */}
        {showJiraModal && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">JIRA-Task erstellen</h3>
              
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
                  onClick={createJiraTask}
                  disabled={!jiraTaskData.title || creatingJira}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  {creatingJira ? (
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
                  onClick={() => setShowJiraModal(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
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