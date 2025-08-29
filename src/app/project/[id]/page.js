'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Copy, 
  CheckCircle, 
  ExternalLink, 
  Code, 
  MessageSquare, 
  ArrowLeft,
  AlertCircle,
  Globe,
  Calendar,
  Edit3,
  Save,
  X,
  ExternalLink as JiraIcon,
  Settings,
  RefreshCw,
  Download,
  List,
  Columns
} from 'lucide-react';
import Link from 'next/link';
import { downloadExcel } from '@/utils/excelExport';

// Task status definitions
const TASK_STATUSES = [
  { value: 'open', label: 'Offen', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'problem', label: 'Problem', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'netnode', label: 'NETNODE', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'tbd', label: 'TBD', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'warning', label: 'Warnung', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'ignore', label: 'Ignorieren', color: 'bg-gray-100 text-gray-500 border-gray-200' },
  { value: 'done', label: 'Erledigt', color: 'bg-green-100 text-green-800 border-green-200' }
];

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
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
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
  const [jiraBoardId, setJiraBoardId] = useState(null);
  const [loadingJiraModal, setLoadingJiraModal] = useState(null); // stores task.id when loading modal data
  const [jiraStatuses, setJiraStatuses] = useState({});
  const [jiraTaskSprints, setJiraTaskSprints] = useState({});
  const [toast, setToast] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [loadingScreenshots, setLoadingScreenshots] = useState({});
  const [exportingExcel, setExportingExcel] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('board');
  const [selectedTaskForModal, setSelectedTaskForModal] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [commentCounts, setCommentCounts] = useState({});
  const [user, setUser] = useState(null);

  const snippetCode = project ? 
    `<script src="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/widget-new.js" data-project-id="${project.name}" defer></script>` :
    '';

  // Helper function to get screenshot URL
  const getScreenshotUrl = (screenshot) => {
    if (!screenshot) return null;
    if (screenshot.startsWith('data:')) return screenshot;
    if (screenshot.startsWith('http')) return screenshot;
    // For filename-only screenshots, construct the correct R2 URL
    return `https://pub-cac1d67ee1dc4cb6814dff593983d703.r2.dev/screenshots/${screenshot}`;
  };

  // Load screenshot for a specific task
  const loadTaskScreenshot = async (taskId) => {
    if (loadingScreenshots[taskId]) return;
    
    setLoadingScreenshots(prev => ({ ...prev, [taskId]: true }));
    
    try {
      const response = await fetch(`/api/projects/${params.id}/tasks/${taskId}/screenshot?format=json`);
      if (response.ok) {
        const data = await response.json();
        // Update the task in the tasks array with the screenshot URL
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId 
              ? { ...task, screenshot_display: data.screenshot_url }
              : task
          )
        );
      }
    } catch (error) {
      console.error('Error loading screenshot:', error);
    } finally {
      setLoadingScreenshots(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // Open screenshot in lightbox
  const openScreenshotLightbox = (screenshotUrl) => {
    setLightboxImage(screenshotUrl);
  };

  // Close lightbox
  const closeLightbox = () => {
    setLightboxImage(null);
  };

  // Handle ESC key to close lightbox
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
      }
    };

    if (lightboxImage) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [lightboxImage]);


  // Load JIRA config from localStorage on component mount
  useEffect(() => {
    const savedJiraConfig = localStorage.getItem('jiraConfig');
    if (savedJiraConfig) {
      try {
        setJiraConfig(JSON.parse(savedJiraConfig));
      } catch {
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
    } catch {
      router.push('/projects');
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
        
        // Lade JIRA-Statuses für neue Tasks
        setTimeout(() => {
          if (tasksData.some(task => task.jira_key) && jiraConfig.serverUrl) {
            loadJiraStatuses();
          }
        }, 100);
      }
    } catch {
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
    } catch {
    }
  };

  useEffect(() => {
    loadProject();
    loadTasks();
    loadJiraSettings();

    // Check widget installation status and refresh tasks every 10 seconds
    checkWidgetStatus();
    const interval = setInterval(async () => {
      checkWidgetStatus();
      await loadTasks(); // Refresh tasks to catch new JIRA conversions
    }, 10000);
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

  // Load comments when task modal is opened
  useEffect(() => {
    if (selectedTaskForModal?.id && project?.id) {
      loadTaskComments(selectedTaskForModal.id);
    } else {
      setTaskComments([]);
      setNewComment('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskForModal?.id, project?.id]);

  // Load comment counts when tasks change
  useEffect(() => {
    if (tasks.length > 0 && project?.id) {
      loadCommentCounts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length, project?.id]);

  // Load current user on component mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadJiraSettings = async () => {
    try {
      // First try to load from settings API
      const response = await fetch(`/api/settings?key=jira_config_project_${params.id}`);
      const data = await response.json();
      
      if (data.success && data.setting) {
        setJiraConfig(data.setting.value);
      } else {
        // If not found in settings, try to load from project configuration
        const projectResponse = await fetch(`/api/projects/${params.id}`);
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          if (projectData.jira_server_url) {
            const jiraConfigFromProject = {
              serverUrl: projectData.jira_server_url,
              username: projectData.jira_username,
              apiToken: projectData.jira_api_token,
              projectKey: projectData.jira_project_key,
              issueType: 'Task'
            };
            setJiraConfig(jiraConfigFromProject);
          }
        }
      }
    } catch {
    }
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippetCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  };


  // Filter tasks based on status
  const getFilteredTasks = (tasksToFilter) => {
    if (statusFilter === 'all') {
      return tasksToFilter;
    }
    return tasksToFilter.filter(task => task.status === statusFilter);
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Unbekannt';
    
    // Handle different date formats from database
    let date;
    if (dateString.includes('T')) {
      // ISO format with timezone (e.g., "2025-08-29T12:53:20+02:00")
      date = new Date(dateString);
    } else {
      // SQLite datetime format (e.g., "2025-08-29 10:43:38") - treat as local time
      // JavaScript interprets "YYYY-MM-DD HH:mm:ss" as UTC, but we need local time
      // Solution: Add timezone offset to compensate
      const tempDate = new Date(dateString.replace(' ', 'T'));
      const timezoneOffset = tempDate.getTimezoneOffset() * 60000; // in milliseconds
      date = new Date(tempDate.getTime() - timezoneOffset);
    }
    
    // Verify date is valid
    if (isNaN(date.getTime())) {
      return 'Ungültige Zeit';
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Debug logging
    console.log('Time debug:', {
      original: dateString,
      parsed: date.toLocaleString('de-DE'),
      now: now.toLocaleString('de-DE'),
      diffMins,
      diffHours
    });

    if (diffMs < 60000) { // Less than 1 minute
      return 'Gerade eben';
    } else if (diffMins < 60) {
      return `vor ${diffMins} Min`;
    } else if (diffHours < 24) {
      return `vor ${diffHours} Std`;
    } else if (diffDays < 7) {
      return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    } else {
      // For older dates, show in local timezone
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  // Comment management functions
  const loadTaskComments = async (taskId) => {
    if (!taskId) return;
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/tasks/${taskId}/comments`);
      const result = await response.json();
      if (result.success) {
        setTaskComments(result.comments);
      } else {
        showToast('Fehler beim Laden der Kommentare', 'error');
      }
    } catch {
      showToast('Fehler beim Laden der Kommentare', 'error');
    } finally {
      setLoadingComments(false);
    }
  };

  const addTaskComment = async (taskId, commentText) => {
    if (!commentText.trim()) return;
    setAddingComment(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_text: commentText, author: 'Benutzer' })
      });
      const result = await response.json();
      if (result.success) {
        setTaskComments(prev => [...prev, result.comment]);
        setCommentCounts(prev => ({
          ...prev,
          [taskId]: (prev[taskId] || 0) + 1
        }));
        setNewComment('');
        showToast('Kommentar hinzugefügt', 'success');
      } else {
        showToast('Fehler beim Hinzufügen des Kommentars', 'error');
      }
    } catch {
      showToast('Fehler beim Hinzufügen des Kommentars', 'error');
    } finally {
      setAddingComment(false);
    }
  };

  const deleteTaskComment = async (taskId, commentId) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/tasks/${taskId}/comments?commentId=${commentId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        setTaskComments(prev => prev.filter(comment => comment.id !== commentId));
        setCommentCounts(prev => ({
          ...prev,
          [taskId]: Math.max(0, (prev[taskId] || 0) - 1)
        }));
        showToast('Kommentar gelöscht', 'success');
      } else {
        showToast('Fehler beim Löschen des Kommentars', 'error');
      }
    } catch {
      showToast('Fehler beim Löschen des Kommentars', 'error');
    }
  };

  const loadCommentCounts = async () => {
    if (!project?.id || tasks.length === 0) return;
    try {
      const counts = {};
      await Promise.all(tasks.map(async (task) => {
        const response = await fetch(`/api/projects/${project.id}/tasks/${task.id}/comments`);
        const result = await response.json();
        if (result.success) {
          counts[task.id] = result.comments.length;
        }
      }));
      setCommentCounts(counts);
    } catch {
      // Silently fail - comment counts are not critical
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

  // Manual refresh function
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Erst Projekt und JIRA-Settings laden
      await Promise.all([
        loadProject(),
        loadJiraSettings(),
        checkWidgetStatus()
      ]);
      
      // Dann Tasks laden
      await loadTasks();
      
      showToast('Daten aktualisiert', 'success');
    } catch {
      showToast('Fehler beim Aktualisieren der Daten', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Delete project function
  const deleteProject = async () => {
    if (!project) return;
    
    // Prüfe Sicherheitsabfrage
    const expectedText = `Ich will dieses Projekt: ${project.name} löschen`;
    if (deleteConfirmText.trim() !== expectedText) {
      showToast('Sicherheitsabfrage nicht korrekt. Projekt wird nicht gelöscht.', 'warning');
      return;
    }
    
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
    } catch {
      showToast('Fehler beim Löschen des Projekts', 'error');
    } finally {
      setDeletingProject(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  // Close delete modal and reset
  const closeDeleteModal = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
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
    } catch {
      showToast('Fehler beim Löschen der Task', 'error');
    } finally {
      setDeletingTask(null);
      setTaskToDelete(null);
      setShowTaskDeleteConfirm(false);
    }
  };

  const handleExcelExport = async () => {
    setExportingExcel(true);
    try {
      // First, identify non-JIRA tasks without loaded screenshots
      const nonJiraTasks = tasks.filter(t => !t.jira_key);
      const tasksNeedingScreenshots = nonJiraTasks.filter(t => 
        !t.screenshot_display && !t.screenshot_url && !t.screenshot
      );
      
      // Load screenshots if needed
      if (tasksNeedingScreenshots.length > 0) {
        showToast(`Lade Screenshots für ${tasksNeedingScreenshots.length} Tasks...`, 'info');
        
        // Load screenshots in parallel
        await Promise.all(
          tasksNeedingScreenshots.map(task => loadTaskScreenshot(task.id))
        );
        
        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Now export with loaded screenshots and fetch R2 URLs
      const result = await downloadExcel(tasks, project.name);
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Fehler beim Exportieren: ' + error.message, 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const saveJiraConfig = async () => {
    try {
      // Save JIRA config to localStorage
      localStorage.setItem('jiraConfig', JSON.stringify(jiraConfig));
      
      // Also save to database for widget access
      const projectUpdateData = {
        name: project.name,
        domain: project.domain,
        jira_server_url: jiraConfig.serverUrl,
        jira_username: jiraConfig.username,
        jira_api_token: jiraConfig.apiToken,
        jira_project_key: jiraConfig.projectKey,
        jira_auto_create: false
      };
      
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectUpdateData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save JIRA config to database');
      }
      
      showToast('JIRA-Konfiguration gespeichert!', 'success');
      setJiraConfigOpen(false);
    } catch {
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
    } catch {
      showToast('Fehler beim Testen der JIRA-Verbindung', 'error');
    }
  };

  const loadJiraStatuses = async () => {
    const tasksWithJira = tasks.filter(task => task.jira_key);
    if (tasksWithJira.length === 0 || !jiraConfig.serverUrl || !jiraConfig.username || !jiraConfig.apiToken) {
      return;
    }


    const statusPromises = tasksWithJira.map(async (task) => {
      try {
        const url = `/api/jira/status?issueKey=${encodeURIComponent(task.jira_key)}&serverUrl=${encodeURIComponent(jiraConfig.serverUrl)}&username=${encodeURIComponent(jiraConfig.username)}&apiToken=${encodeURIComponent(jiraConfig.apiToken)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        
        if (data.success) {
          return { taskId: task.id, status: data.status, sprint: data.sprint, exists: true };
        } else {
          // JIRA-Issue nicht gefunden - markiere zum Löschen
          return { taskId: task.id, exists: false, jiraKey: task.jira_key };
        }
      } catch {
        // Bei technischem Fehler nicht löschen, nur loggen
        return { taskId: task.id, exists: true, error: true };
      }
    });

    const results = await Promise.all(statusPromises);
    const statusMap = {};
    const sprintMap = {};
    const tasksToDelete = [];

    results.forEach(result => {
      if (result.exists && !result.error) {
        statusMap[result.taskId] = result.status;
        if (result.sprint) {
          sprintMap[result.taskId] = result.sprint;
        }
      } else if (result.exists === false) {
        // Task für Löschung vormerken
        tasksToDelete.push(result.taskId);
      }
    });

    // Nicht existierende JIRA Tasks automatisch löschen
    if (tasksToDelete.length > 0) {
      
      const deletePromises = tasksToDelete.map(async (taskId) => {
        try {
          const response = await fetch(`/api/projects/${params.id}/tasks/${taskId}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            return taskId;
          }
        } catch {
        }
        return null;
      });

      const deletedTasks = await Promise.all(deletePromises);
      const successfullyDeleted = deletedTasks.filter(Boolean);
      
      if (successfullyDeleted.length > 0) {
        showToast(`${successfullyDeleted.length} nicht existierende JIRA Task(s) automatisch gelöscht`, 'info');
        // Tasks neu laden nach dem Löschen
        setTimeout(() => loadTasks(), 1000);
      }
    }
    
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

  const getStatusInfo = (statusValue) => {
    return TASK_STATUSES.find(status => status.value === statusValue) || TASK_STATUSES[0];
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await fetch(`/api/projects/${params.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Update local state
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        ));
        showToast('Status erfolgreich aktualisiert', 'success');
      } else {
        showToast('Fehler beim Aktualisieren des Status', 'error');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      showToast('Fehler beim Aktualisieren des Status', 'error');
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, statusValue) => {
    e.preventDefault();
    setDragOverColumn(statusValue);
  };

  const handleDragLeave = (e) => {
    // Only remove highlight if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e, statusValue) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedTask && draggedTask.status !== statusValue) {
      // Optimistically update UI
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === draggedTask.id ? { ...task, status: statusValue } : task
        )
      );
      
      // Update status on server
      await updateTaskStatus(draggedTask.id, statusValue);
    }
    
    setDraggedTask(null);
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
        showToast('Fehler beim Speichern: ' + (errorData.details || 'Unbekannter Fehler'), 'error');
      }
    } catch {
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

      // Load screenshot if not already loaded
      if (!task.screenshot_display && !task.screenshot_url) {
        await loadTaskScreenshot(task.id);
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
      setLoadingJiraModal(task.id);
      await Promise.all([
        loadJiraUsers(),
        loadJiraSprints()
      ]);
      setLoadingJiraModal(null);
      
      setShowJiraModal(true);
      
    } catch {
      setLoadingJiraModal(null);
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
    } catch {
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
        setJiraBoardId(boardId); // Save board ID for later use
        
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
    } catch {
    }
  };

  const createJiraTask = async () => {
    if (!selectedTask) return;
    
    // Get the current task from state to ensure we have the latest screenshot URL
    const currentTask = tasks.find(t => t.id === selectedTask.id) || selectedTask;
    
    setCreatingJira(selectedTask.id);
    try {
      const response = await fetch('/api/jira', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },          body: JSON.stringify({
            action: 'createTicket',
            feedback: {
              title: jiraTaskData.title || currentTask.title,
              description: jiraTaskData.description || currentTask.description || '',
              url: currentTask.url,
              selected_area: currentTask.selected_area,
              screenshot: currentTask.screenshot_display || currentTask.screenshot_url || (currentTask.screenshot ? (
                currentTask.screenshot.startsWith('http') 
                  ? currentTask.screenshot 
                  : getScreenshotUrl(currentTask.screenshot)
              ) : null)
            },
          jiraConfig: {
            ...jiraConfig,
            defaultAssignee: jiraTaskData.assignee,
            selectedSprint: jiraTaskData.sprint,
            selectedBoardId: jiraBoardId,
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
    } catch {
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
          <Link href="/projects" className="text-blue-600 hover:text-blue-700">
            Zurück zur Projektübersicht
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
            href="/projects"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Projektübersicht
          </Link>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                  <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-sm font-medium ${
                    project.widget_installed 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}>
                    {project.widget_installed ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Widget aktiv
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        Widget ausstehend
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <a 
                      href={project.domain.startsWith('http') ? project.domain : `https://${project.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {project.domain}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      Erstellt {formatTime(project.created_at)}
                    </span>
                  </div>
                  {project.widget_last_ping && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm">
                        Letzter Ping: {formatTime(project.widget_last_ping)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          </div>
        </div>

        <div className={`grid gap-6 ${viewMode === 'board' ? 'grid-cols-1' : 'lg:grid-cols-4'}`}>
          {/* Main Content Area */}
          <div className={viewMode === 'board' ? '' : 'lg:col-span-3'}>
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
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div></div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={refreshData}
                    disabled={isRefreshing}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
                    title="Tasks aktualisieren"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Lädt...' : 'Aktualisieren'}
                  </button>
                  
                  {/* View Mode Toggle */}
                  <div className="flex items-center border border-gray-200 rounded-lg">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex items-center gap-1 px-3 py-1 text-sm transition-colors ${
                        viewMode === 'list' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <List className="h-4 w-4" />
                      Liste
                    </button>
                    <button
                      onClick={() => setViewMode('board')}
                      className={`flex items-center gap-1 px-3 py-1 text-sm transition-colors border-l border-gray-200 ${
                        viewMode === 'board' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <Columns className="h-4 w-4" />
                      Board
                    </button>
                  </div>
                  
                  {/* Status Filter - nur in Liste-Ansicht */}
                  {viewMode === 'list' && (
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Alle Status</option>
                      {TASK_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              
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
              ) : viewMode === 'list' ? (
                <div className="space-y-4">
                  {/* Non-JIRA Tasks */}
                  {getFilteredTasks(tasks.filter(t => !t.jira_key)).length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        Tasks ({getFilteredTasks(tasks.filter(t => !t.jira_key)).length})
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        {getFilteredTasks(tasks.filter(t => !t.jira_key)).map((task) => (
                          <div key={task.id} className="bg-white border border-red-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
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
                                      rows="2"
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
                                  <>
                                    <h4 className="font-medium text-gray-900 mb-1" style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden'
                                    }}>{task.title}</h4>
                                    {task.description && (
                                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <select
                                  value={task.status || 'open'}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateTaskStatus(task.id, e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusInfo(task.status).color}`}
                                >
                                  {TASK_STATUSES.map(status => (
                                    <option key={status.value} value={status.value}>
                                      {status.label}
                                    </option>
                                  ))}
                                </select>
                                {!editingTask && (
                                  <>
                                    <button
                                      onClick={() => startEditing(task)}
                                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                      title="Bearbeiten"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
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
                                    <button
                                      onClick={() => setSelectedTaskForModal(task)}
                                      className="relative p-1 text-gray-400 hover:text-blue-600 rounded"
                                      title="Kommentare anzeigen"
                                    >
                                      <MessageSquare className="h-4 w-4" />
                                      {commentCounts[task.id] > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                                          {commentCounts[task.id]}
                                        </span>
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                              <span>{formatTime(task.created_at)}</span>
                              {task.url && (
                                <a 
                                  href={task.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Seite
                                </a>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div 
                                className="w-20 h-20 bg-gray-100 rounded-lg border overflow-hidden relative group cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const imageUrl = getScreenshotUrl(task.screenshot) || task.screenshot_display;
                                  if (imageUrl) {
                                    openScreenshotLightbox(imageUrl);
                                  }
                                }}
                              >
                                {task.screenshot_display || task.screenshot ? (
                                  <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                      src={getScreenshotUrl(task.screenshot) || task.screenshot_display} 
                                      alt="Task Screenshot" 
                                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                                      <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        🔍
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    {loadingScreenshots[task.id] ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                                    ) : (
                                      <button 
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          loadTaskScreenshot(task.id);
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 p-1 transition-colors"
                                        title="Screenshot laden"
                                      >
                                        📷 Laden
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              {user?.role === 'admin' && (
                                <button
                                  onClick={() => openJiraModal(task)}
                                  disabled={creatingJira === task.id || loadingJiraModal === task.id}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm ml-auto"
                                  title="JIRA-Task erstellen"
                                >
                                  {creatingJira === task.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                      Erstelle...
                                    </>
                                  ) : loadingJiraModal === task.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                      Lade...
                                    </>
                                  ) : (
                                    <>
                                      <JiraIcon className="h-3 w-3" />
                                      JIRA
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* JIRA Tasks */}
                  {user?.role === 'admin' && tasks.filter(t => t.jira_key).length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <JiraIcon className="h-5 w-5 text-blue-500" />
                        JIRA Tasks ({tasks.filter(t => t.jira_key).length})
                      </h3>
                      <div className="space-y-3">
                        {tasks.filter(t => t.jira_key).map((task) => (
                          <div key={task.id} className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                                {task.description && (
                                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                {jiraStatuses[task.id] ? (
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={task.jira_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getJiraStatusColor(jiraStatuses[task.id])}`}
                                      title={`Status: ${jiraStatuses[task.id]?.name || 'Unbekannt'}`}
                                    >
                                      <JiraIcon className="h-3 w-3" />
                                      {jiraStatuses[task.id]?.name || 'Unbekannt'}
                                    </a>
                                    {jiraStatuses[task.id]?.assignee && (
                                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                                        <span>👤</span>
                                        <span>{jiraStatuses[task.id].assignee.displayName}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={task.jira_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
                                      title="JIRA Status wird geladen..."
                                    >
                                      <JiraIcon className="h-3 w-3" />
                                      Lade Status...
                                    </a>
                                  </div>
                                )}
                                <button
                                  onClick={() => setSelectedTaskForModal(task)}
                                  className="relative p-1 text-gray-400 hover:text-blue-600 rounded"
                                  title="Kommentare anzeigen"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  {commentCounts[task.id] > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                                      {commentCounts[task.id]}
                                    </span>
                                  )}
                                </button>
                                <button
                                  onClick={() => openTaskDeleteModal(task)}
                                  disabled={deletingTask === task.id}
                                  className="p-1 text-red-400 hover:text-red-600 rounded disabled:opacity-50"
                                  title="Task aus Projekt entfernen"
                                >
                                  {deletingTask === task.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-4">
                                  <span>Erstellt {formatTime(task.created_at)}</span>
                                  {task.jira_key && (
                                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{task.jira_key}</span>
                                  )}
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
                                </div>
                                {jiraTaskSprints[task.id] && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                    <Calendar className="h-3 w-3" />
                                    {jiraTaskSprints[task.id].name}
                                  </span>
                                )}
                              </div>
                              
                              {/* JIRA Status Details */}
                              {jiraStatuses[task.id] && (
                                <div className="flex items-center gap-4 text-xs">
                                  {jiraStatuses[task.id].priority && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-500">Priorität:</span>
                                      <span className={`font-medium ${
                                        jiraStatuses[task.id].priority.name?.toLowerCase().includes('high') ? 'text-red-600' :
                                        jiraStatuses[task.id].priority.name?.toLowerCase().includes('medium') ? 'text-yellow-600' :
                                        'text-green-600'
                                      }`}>
                                        {jiraStatuses[task.id].priority.name}
                                      </span>
                                    </div>
                                  )}
                                  {jiraStatuses[task.id].updated && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-500">Zuletzt aktualisiert:</span>
                                      <span className="text-gray-700">{formatTime(jiraStatuses[task.id].updated)}</span>
                                    </div>
                                  )}
                                  {jiraStatuses[task.id].resolution && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-gray-500">Lösung:</span>
                                      <span className="text-green-700 font-medium">{jiraStatuses[task.id].resolution.name}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* Board View */
                <div className="flex gap-4 h-[calc(100vh-200px)] overflow-x-auto pb-4">
                  {TASK_STATUSES.map(status => {
                    const statusTasks = tasks.filter(t => !t.jira_key && (t.status || 'open') === status.value);
                    return (
                      <div 
                        key={status.value} 
                        className={`flex flex-col min-w-80 w-80 transition-all ${
                          dragOverColumn === status.value 
                            ? 'ring-2 ring-blue-400 ring-opacity-75 bg-blue-50' 
                            : ''
                        }`}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, status.value)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, status.value)}
                      >
                        <div className={`p-3 rounded-t-lg border-b-2 ${status.color} font-medium text-sm`}>
                          <div className="flex items-center justify-between">
                            <span>{status.label}</span>
                            <span className="bg-white bg-opacity-50 px-2 py-1 rounded text-xs">
                              {statusTasks.length}
                            </span>
                          </div>
                        </div>
                        <div className={`flex-1 rounded-b-lg p-3 overflow-y-auto transition-all ${
                          dragOverColumn === status.value 
                            ? 'bg-blue-50' 
                            : 'bg-gray-100'
                        }`}>
                          <div className="space-y-2">
                            {statusTasks.length === 0 && dragOverColumn === status.value && (
                              <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center text-blue-500">
                                <span className="text-sm">Task hier ablegen</span>
                              </div>
                            )}
                            {statusTasks.map(task => (
                              <div 
                                key={task.id}
                                draggable
                                className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all cursor-grab active:cursor-grabbing border border-gray-200"
                                onClick={() => {
                                  // Prevent modal opening during drag
                                  if (!draggedTask) {
                                    setSelectedTaskForModal(task);
                                  }
                                }}
                                onDragStart={(e) => handleDragStart(e, task)}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm text-gray-900" style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                  }}>
                                    {task.title}
                                  </h4>
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{formatTime(task.created_at)}</span>
                                    <div className="flex items-center gap-1">
                                      {task.screenshot_display || task.screenshot ? (
                                        <div className="w-4 h-4 bg-gray-200 rounded text-center text-xs">
                                          📷
                                        </div>
                                      ) : null}
                                      {commentCounts[task.id] > 0 && (
                                        <div className="relative">
                                          <MessageSquare className="h-3 w-3 text-blue-500" />
                                          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-3 w-3 flex items-center justify-center font-bold text-xs leading-none">
                                            {commentCounts[task.id]}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar - nur in List-Ansicht */}
          {viewMode === 'list' && (
            <div className="lg:col-span-1 space-y-6">
            

            {/* Project Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Projekt Statistiken
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
                  <div className="text-sm text-gray-600">Gesamt Tasks</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-red-600">
                      {tasks.filter(t => !t.jira_key && t.status === 'open').length}
                    </div>
                    <div className="text-xs text-red-600">Offen</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {tasks.filter(t => t.jira_key).length}
                    </div>
                    <div className="text-xs text-blue-600">JIRA</div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-gray-600" />
                  System Status
                </h3>
                <button
                  onClick={() => setJiraConfigOpen(!jiraConfigOpen)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="JIRA-Einstellungen"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Widget Status */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Widget</span>
                    {project.widget_installed ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Aktiv</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Ausstehend</span>
                      </div>
                    )}
                  </div>
                  {project.widget_last_ping && (
                    <div className="text-xs text-gray-500 pl-4">
                      Letzter Ping: {formatTime(project.widget_last_ping)}
                    </div>
                  )}
                </div>

                {/* JIRA Status */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">JIRA Integration</span>
                    {jiraConfig.serverUrl && jiraConfig.username && jiraConfig.apiToken && jiraConfig.projectKey ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Konfiguriert</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Nicht konfiguriert</span>
                      </div>
                    )}
                  </div>
                  {jiraConfig.serverUrl && (
                    <div className="text-xs text-gray-500 pl-4">
                      {jiraConfig.projectKey ? `Projekt: ${jiraConfig.projectKey}` : 'Konfiguration unvollständig'}
                    </div>
                  )}
                </div>

                {/* Overall Status */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    {project.widget_installed && jiraConfig.serverUrl && jiraConfig.projectKey ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-700">System bereit</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-medium text-yellow-700">Setup unvollständig</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
                
              {jiraConfigOpen && (
                <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
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
              )}
            </div>

            {/* Project Actions */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Projekt-Aktionen</h3>
              <div className="space-y-2">
                <button
                  onClick={handleExcelExport}
                  disabled={exportingExcel || tasks.filter(t => !t.jira_key).length === 0}
                  className="w-full px-3 py-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded border border-green-200 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Excel-Export der Nicht-JIRA Tasks"
                >
                  {exportingExcel ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                      Exportiere...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3" />
                      Excel Export ({tasks.filter(t => !t.jira_key).length} Tasks)
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-3 py-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-red-200 transition-colors flex items-center justify-center gap-1"
                  title="Projekt löschen"
                >
                  <X className="h-3 w-3" />
                  Projekt löschen
                </button>
              </div>
            </div>
            </div>
          )}
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
                      <X className="h-4 w-4" />
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
        {user?.role === 'admin' && showJiraModal && selectedTask && (
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
                  disabled={!jiraTaskData.title || creatingJira === selectedTask?.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  {creatingJira === selectedTask?.id ? (
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

        {/* Screenshot Lightbox Modal */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={closeLightbox}
          >
            <div className="relative max-w-4xl max-h-[90vh] p-4">
              <button
                onClick={closeLightbox}
                className="absolute top-2 right-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 z-10"
                title="Schließen (ESC)"
              >
                <X className="h-6 w-6" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage}
                alt="Screenshot"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5TY3JlZW5zaG90IG5pY2h0IGdlZnVuZGVuPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
            </div>
          </div>
        )}

        {/* Task Detail Modal */}
        {selectedTaskForModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Task Details
                  </h3>
                  <button
                    onClick={() => setSelectedTaskForModal(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Task Content */}
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {selectedTaskForModal.title}
                    </div>
                  </div>

                  {/* Description */}
                  {selectedTaskForModal.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        {selectedTaskForModal.description}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={selectedTaskForModal.status || 'open'}
                      onChange={(e) => {
                        updateTaskStatus(selectedTaskForModal.id, e.target.value);
                        setSelectedTaskForModal({...selectedTaskForModal, status: e.target.value});
                      }}
                      className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusInfo(selectedTaskForModal.status).color}`}
                    >
                      {TASK_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Screenshot */}
                  {(selectedTaskForModal.screenshot_display || selectedTaskForModal.screenshot) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Screenshot</label>
                      <div className="border rounded-lg p-2 bg-gray-50">
                        <img
                          src={getScreenshotUrl(selectedTaskForModal.screenshot) || selectedTaskForModal.screenshot_display}
                          alt="Task Screenshot"
                          className="w-full h-48 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openScreenshotLightbox(getScreenshotUrl(selectedTaskForModal.screenshot) || selectedTaskForModal.screenshot_display)}
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5TY3JlZW5zaG90IG5pY2h0IGdlZnVuZGVuPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* URL */}
                  {selectedTaskForModal.url && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={selectedTaskForModal.url}
                          readOnly
                          className="flex-1 p-3 bg-gray-50 rounded-lg text-sm"
                        />
                        <a
                          href={selectedTaskForModal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Öffnen
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Created Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Erstellt</label>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm">
                      {formatTime(selectedTaskForModal.created_at)}
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Kommentare ({taskComments.length})
                    </label>
                    
                    {/* Comments List */}
                    {loadingComments ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                        {taskComments.length === 0 ? (
                          <div className="text-center py-6 text-gray-500">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Noch keine Kommentare</p>
                          </div>
                        ) : (
                          taskComments.map((comment, index) => (
                            <div key={comment.id} className="bg-gray-50 rounded-lg p-3 border">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2 flex-1">
                                  <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-900 mb-1">
                                      {comment.comment_text}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      {comment.author && (
                                        <span>von {comment.author}</span>
                                      )}
                                      <span>•</span>
                                      <span>{formatTime(comment.created_at)}</span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => deleteTaskComment(selectedTaskForModal.id, comment.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors ml-2"
                                  title="Kommentar löschen"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Add Comment Form */}
                    <div className="flex gap-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Kommentar hinzufügen..."
                        className="flex-1 px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            addTaskComment(selectedTaskForModal.id, newComment);
                          }
                        }}
                      />
                      <button
                        onClick={() => addTaskComment(selectedTaskForModal.id, newComment)}
                        disabled={!newComment.trim() || addingComment}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm flex items-center gap-1"
                      >
                        {addingComment ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        ) : (
                          <MessageSquare className="h-3 w-3" />
                        )}
                        {addingComment ? 'Sende...' : 'Senden'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => openJiraModal(selectedTaskForModal)}
                        disabled={creatingJira === selectedTaskForModal.id || loadingJiraModal === selectedTaskForModal.id}
                        className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm"
                      >
                        {creatingJira === selectedTaskForModal.id || loadingJiraModal === selectedTaskForModal.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            {loadingJiraModal === selectedTaskForModal.id ? 'Lade...' : 'Erstelle...'}
                          </>
                        ) : (
                          <>
                            <JiraIcon className="h-3 w-3" />
                            JIRA Task
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openTaskDeleteModal(selectedTaskForModal)}
                      className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                    >
                      <X className="h-3 w-3" />
                      Löschen
                    </button>
                    <button
                      onClick={() => setSelectedTaskForModal(null)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}