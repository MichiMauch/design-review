'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSettings } from '../../admin/hooks/useSettings';
import { useToast } from '../../../hooks/useToast';
import Toast from '../../../components/ui/Toast';
import ProjectHeader from '../../../components/project/ProjectHeader';
import WidgetInstallation from '../../../components/project/WidgetInstallation';
import ProjectSidebar from '../../../components/project/ProjectSidebar';
import TaskControls from '../../../components/project/TaskControls';
import DeleteTaskModal from '../../../components/modals/DeleteTaskModal';
import JiraModal from '../../../components/modals/JiraModal';
import ScreenshotLightbox from '../../../components/modals/ScreenshotLightbox';
import TaskDetailModal from '../../../components/modals/TaskDetailModal';
import TaskList from '../../../components/project/TaskList';
import TaskBoard from '../../../components/project/TaskBoard';
import { MessageSquare, X } from 'lucide-react';
import { downloadExcel } from '@/utils/excelExport';
// Removed unused imports

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { getR2Url } = useSettings();
  const { toast, showToast, hideToast } = useToast();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [creatingJira, setCreatingJira] = useState(null);
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingTask, setDeletingTask] = useState(null);
  const [showTaskDeleteConfirm, setShowTaskDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [jiraConfig, setJiraConfig] = useState({
    projectKey: '',
    issueType: 'Task'
  });
  const [combinedJiraConfig, setCombinedJiraConfig] = useState(null);
  const [loadingJiraConfig, setLoadingJiraConfig] = useState(false);
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
  const [jiraBoardId, setJiraBoardId] = useState(null);
  const [jiraBoardColumns, setJiraBoardColumns] = useState([]);
  const [loadingJiraModal, setLoadingJiraModal] = useState(null); // stores task.id when loading modal data
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


  // Helper function to get screenshot URL
  const getScreenshotUrl = (screenshot) => {
    if (!screenshot) return null;
    // Simple: just combine settings URL with filename
    return `${getR2Url()}${screenshot}`;
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
      loadProject(); // Now includes combined JIRA config loading
      loadTasks();
      checkWidgetStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Load JIRA statuses when tasks or combinedJiraConfig changes
  useEffect(() => {
    if (tasks.length > 0 && combinedJiraConfig?.serverUrl) {
      loadJiraStatuses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, combinedJiraConfig]);

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      if (!response.ok) {
        throw new Error('Project not found');
      }
      const projectData = await response.json();
      setProject(projectData);

      // Load combined JIRA config immediately after project is set
      await loadCombinedJiraConfigWithRetry(projectData.id);
    } catch {
      router.push('/projects');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      console.log('Loading tasks from API...');
      const response = await fetch(`/api/projects/${params.id}/tasks`);
      if (response.ok) {
        const tasksData = await response.json();
        console.log('Tasks loaded from API:', {
          totalTasks: tasksData.length,
          tasksWithJira: tasksData.filter(t => t.jira_key).length,
          taskStatuses: tasksData.map(t => ({ id: t.id, status: t.status, jira_key: t.jira_key }))
        });
        setTasks(tasksData);
        
        // Lade JIRA-Statuses für neue Tasks
        setTimeout(() => {
          if (tasksData.some(task => task.jira_key) && combinedJiraConfig?.serverUrl) {
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
    // Load JIRA statuses when tasks or combinedJiraConfig change
    if (tasks.length > 0 && combinedJiraConfig?.serverUrl) {
      loadJiraStatuses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, combinedJiraConfig]);

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
        // Load project-specific JIRA configuration
        const projectResponse = await fetch(`/api/projects/${params.id}`);
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          const jiraConfigFromProject = {
            projectKey: projectData.jira_project_key || '',
            issueType: projectData.jira_issue_type || 'Task'
          };
          setJiraConfig(jiraConfigFromProject);
        }
      }
    } catch {
    }
  };


  const loadCombinedJiraConfigWithRetry = async (projectId, retries = 3) => {
    setLoadingJiraConfig(true);

    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Loading combined JIRA config for project ${projectId} (attempt ${i + 1}/${retries})`);

        const response = await fetch(`/api/jira/config/${projectId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setCombinedJiraConfig(result.config);
            console.log('Combined JIRA config loaded successfully:', {
              serverUrl: result.config.serverUrl ? '✓ configured' : '✗ missing',
              username: result.config.username ? '✓ configured' : '✗ missing',
              apiToken: result.config.apiToken ? '✓ configured' : '✗ missing',
              projectKey: result.config.projectKey ? '✓ configured' : '✗ missing',
              isConfigured: result.isConfigured
            });
            setLoadingJiraConfig(false);
            return; // Success, exit retry loop
          } else {
            console.error('API returned error:', result.error);
          }
        } else {
          console.error('HTTP error:', response.status, response.statusText);
        }
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
      }

      // Wait before retry (except on last attempt)
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }

    console.error('Failed to load combined JIRA config after all retries');
    setLoadingJiraConfig(false);
  };



  // Filter tasks based on status
  const getFilteredTasks = (tasksToFilter) => {
    if (statusFilter === 'all') {
      return tasksToFilter;
    }
    return tasksToFilter.filter(task => task.status === statusFilter);
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

  const getCommentCount = (taskId) => {
    return commentCounts[taskId] || 0;
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
      // Close task detail modal if the deleted task was open
      if (selectedTaskForModal && taskToDelete && selectedTaskForModal.id === taskToDelete.id) {
        setSelectedTaskForModal(null);
      }
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



  const loadJiraStatuses = async () => {
    const tasksWithJira = tasks.filter(task => task.jira_key);
    if (tasksWithJira.length === 0 || !combinedJiraConfig?.serverUrl || !combinedJiraConfig?.username || !combinedJiraConfig?.apiToken) {
      return;
    }

    const statusPromises = tasksWithJira.map(async (task) => {
      try {
        const url = `/api/jira/status?issueKey=${encodeURIComponent(task.jira_key)}&serverUrl=${encodeURIComponent(combinedJiraConfig.serverUrl)}&username=${encodeURIComponent(combinedJiraConfig.username)}&apiToken=${encodeURIComponent(combinedJiraConfig.apiToken)}`;
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

    // JIRA-Verknüpfung für nicht existierende JIRA Tasks entfernen (NICHT die Tasks löschen!)
    if (tasksToDelete.length > 0) {
      
      const unlinkPromises = tasksToDelete.map(async (taskId) => {
        try {
          const response = await fetch(`/api/projects/${params.id}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              jira_key: null,
              jira_url: null
            })
          });
          if (response.ok) {
            return taskId;
          }
        } catch {
        }
        return null;
      });

      const unlinkedTasks = await Promise.all(unlinkPromises);
      const successfullyUnlinked = unlinkedTasks.filter(Boolean);
      
      if (successfullyUnlinked.length > 0) {
        showToast(`${successfullyUnlinked.length} JIRA-Verknüpfung(en) aufgehoben - Tasks wurden nicht gelöscht`, 'info');
        
        // Update local state instead of reloading all tasks
        setTasks(prevTasks => 
          prevTasks.map(task => 
            successfullyUnlinked.includes(task.id) 
              ? { ...task, jira_key: null, jira_url: null }
              : task
          )
        );
        
        // Remove from JIRA status maps
        setJiraStatuses(prev => {
          const newMap = { ...prev };
          successfullyUnlinked.forEach(taskId => {
            delete newMap[taskId];
          });
          return newMap;
        });
        
        setJiraTaskSprints(prev => {
          const newMap = { ...prev };
          successfullyUnlinked.forEach(taskId => {
            delete newMap[taskId];
          });
          return newMap;
        });
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
      console.log('Opening JIRA modal for task:', task.id);
      console.log('Combined JIRA config state:', {
        exists: !!combinedJiraConfig,
        serverUrl: combinedJiraConfig?.serverUrl ? '✓ configured' : '✗ missing',
        username: combinedJiraConfig?.username ? '✓ configured' : '✗ missing',
        apiToken: combinedJiraConfig?.apiToken ? '✓ configured' : '✗ missing',
        projectKey: combinedJiraConfig?.projectKey ? '✓ configured' : '✗ missing'
      });

      // Check if combined JIRA config is still loading
      if (!combinedJiraConfig) {
        console.log('Combined JIRA config not yet loaded, waiting...');
        showToast('JIRA-Konfiguration wird geladen, bitte warten...', 'info');

        // Try to load it again
        if (project?.id) {
          await loadCombinedJiraConfigWithRetry(project.id);
        }

        // Check again after retry
        if (!combinedJiraConfig) {
          showToast('JIRA-Konfiguration konnte nicht geladen werden. Bitte prüfen Sie die Einstellungen.', 'error');
          setJiraConfigOpen(true);
          return;
        }
      }

      // Check if JIRA is fully configured
      const isFullyConfigured =
        combinedJiraConfig?.serverUrl &&
        combinedJiraConfig?.username &&
        combinedJiraConfig?.apiToken &&
        combinedJiraConfig?.projectKey;

      if (!isFullyConfigured) {
        console.log('JIRA configuration incomplete');
        showToast('JIRA ist nicht vollständig konfiguriert. Bitte prüfen Sie die Admin-Einstellungen und Projekt-Einstellungen.', 'error');
        setJiraConfigOpen(true);
        return;
      }

      console.log('JIRA configuration validated successfully');

      // Always set the task immediately - no race conditions
      setSelectedTask(task);
      
      // Load screenshot if not already loaded
      let taskWithScreenshot = task;
      const hasScreenshot = task.screenshot_url || task.screenshot;
      
      console.log('Screenshot loading check for task:', {
        taskId: task.id,
        hasScreenshot: hasScreenshot,
        screenshot_display: !!task.screenshot_display,
        screenshot_url: !!task.screenshot_url,
        screenshot: !!task.screenshot
      });
      
      if (!hasScreenshot) {
        console.log('Loading and validating screenshot for task:', task.id);
        
        // Use direct API call instead of loadTaskScreenshot to avoid race conditions
        try {
          const response = await fetch(`/api/projects/${params.id}/tasks/${task.id}/screenshot?format=json`);
          if (response.ok) {
            const data = await response.json();
            console.log('Screenshot loaded from API:', {
              taskId: task.id,
              screenshot_url: data.screenshot_url,
              hasUrl: !!data.screenshot_url,
              urlLength: data.screenshot_url ? data.screenshot_url.length : 0
            });
            
            if (data.screenshot_url && data.screenshot_url.trim() !== '') {
              console.log('Screenshot URL found, proceeding without validation:', {
                taskId: task.id,
                url: data.screenshot_url,
                urlLength: data.screenshot_url.length
              });
              
              taskWithScreenshot = { ...task, screenshot_display: data.screenshot_url };
              setSelectedTask(taskWithScreenshot);
              // Also update the tasks array to keep it in sync
              setTasks(prevTasks => 
                prevTasks.map(t => 
                  t.id === task.id 
                    ? { ...t, screenshot_display: data.screenshot_url }
                    : t
                )
              );
            } else {
              console.log('No valid screenshot URL returned for task:', task.id);
            }
          } else {
            console.warn('Screenshot API response not OK:', {
              taskId: task.id,
              status: response.status,
              statusText: response.statusText
            });
          }
        } catch (error) {
          console.error('Failed to load screenshot for task:', {
            taskId: task.id,
            error: error.message,
            stack: error.stack
          });
          showToast(`Screenshot konnte nicht geladen werden für Task ${task.id}. JIRA-Task wird ohne Bild erstellt.`, 'warning');
        }
      } else {
        console.log('Screenshot already available, validating existing URL for task:', {
          taskId: task.id,
          url: task.screenshot_display || taskWithScreenshot?.screenshot_display
        });
        
        // Log existing screenshot URL without validation
        const existingUrl = task.screenshot_display || taskWithScreenshot?.screenshot_display;
        if (existingUrl) {
          console.log('Screenshot already available for task:', {
            taskId: task.id,
            url: existingUrl,
            urlLength: existingUrl.length
          });
        }
      }
      
      // Always use the original task parameter to avoid state confusion
      setJiraTaskData({
        title: task.title,
        description: task.description || '',
        assignee: '',
        sprint: '',
        labels: '',
        column: ''
      });
      
      // Load JIRA data before showing modal
      setLoadingJiraModal(task.id);
      
      // First load boards to get board ID
      const boardId = await loadJiraBoards();
      
      // Then load users, sprints, and columns in parallel
      await Promise.all([
        loadJiraUsers(),
        loadJiraSprints(boardId),
        loadJiraBoardColumns(boardId)
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
        serverUrl: combinedJiraConfig.serverUrl,
        username: combinedJiraConfig.username,
        apiToken: combinedJiraConfig.apiToken,
        projectKey: combinedJiraConfig.projectKey
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

  const loadJiraBoards = async () => {
    try {
      const boardsParams = new URLSearchParams({
        action: 'getBoards',
        serverUrl: combinedJiraConfig.serverUrl,
        username: combinedJiraConfig.username,
        apiToken: combinedJiraConfig.apiToken,
        projectKey: combinedJiraConfig.projectKey
      });

      const boardsResponse = await fetch(`/api/jira?${boardsParams}`, {
        method: 'GET',
      });

      const boardsResult = await boardsResponse.json();
      if (boardsResult.success && boardsResult.boards && boardsResult.boards.length > 0) {
        const boardId = boardsResult.boards[0].id; // Use first board
        setJiraBoardId(boardId); // Save board ID for later use
        return boardId;
      }
    } catch {
    }
    return null;
  };

  const loadJiraSprints = async (boardId) => {
    try {
      if (!boardId) return;
      
      // Get sprints for this board
      const sprintsParams = new URLSearchParams({
        action: 'getSprints',
        serverUrl: combinedJiraConfig.serverUrl,
        username: combinedJiraConfig.username,
        apiToken: combinedJiraConfig.apiToken,
        boardId: boardId
      });

      const sprintsResponse = await fetch(`/api/jira?${sprintsParams}`, {
        method: 'GET',
      });

      const sprintsResult = await sprintsResponse.json();
      if (sprintsResult.success && sprintsResult.sprints) {
        setJiraSprintsOptions(sprintsResult.sprints);
      }
    } catch {
    }
  };

  const loadJiraBoardColumns = async (boardId) => {
    try {
      if (!boardId) return;
      
      const columnsParams = new URLSearchParams({
        action: 'getBoardColumns',
        serverUrl: combinedJiraConfig.serverUrl,
        username: combinedJiraConfig.username,
        apiToken: combinedJiraConfig.apiToken,
        boardId: boardId
      });

      const columnsResponse = await fetch(`/api/jira?${columnsParams}`, {
        method: 'GET'
      });

      if (columnsResponse.ok) {
        const columnsData = await columnsResponse.json();
        if (columnsData.success && columnsData.columns) {
          // Flatten the columns structure to get statuses
          const columnOptions = [];
          columnsData.columns.forEach(column => {
            if (column.statuses && column.statuses.length > 0) {
              // Use the first status of each column as the target status
              columnOptions.push({
                id: column.statuses[0].id,
                name: column.name,
                statusId: column.statuses[0].id,
                statusName: column.statuses[0].name,
                statusCategory: column.statuses[0].category
              });
            }
          });
          setJiraBoardColumns(columnOptions);
        }
      }
    } catch {
    }
  };

  const createJiraTask = async () => {
    if (!selectedTask) return;
    
    // Get the most current task data (prioritize selectedTask which was set correctly)
    const currentTask = selectedTask;
    
    // Also get task from tasks array for any updates that might have happened
    const taskFromState = tasks.find(t => t.id === selectedTask.id);
    
    // Ensure we have the latest screenshot data by checking both sources
    let screenshotUrl = null;
    
    // Check selectedTask first (most reliable)
    if (currentTask.screenshot_display) {
      screenshotUrl = currentTask.screenshot_display;
    } else if (currentTask.screenshot_url) {
      screenshotUrl = currentTask.screenshot_url;
    } 
    // Fallback to task from state
    else if (taskFromState?.screenshot_display) {
      screenshotUrl = taskFromState.screenshot_display;
    } else if (taskFromState?.screenshot_url) {
      screenshotUrl = taskFromState.screenshot_url;
    }
    // Finally check original screenshot field
    else if (currentTask.screenshot) {
      if (currentTask.screenshot.startsWith('http') || currentTask.screenshot.startsWith('data:')) {
        screenshotUrl = currentTask.screenshot;
      } else {
        screenshotUrl = getScreenshotUrl(currentTask.screenshot);
      }
    }
    
    // Final screenshot URL verification and debug logs
    console.log('Creating JIRA task for:', {
      taskId: currentTask.id,
      title: currentTask.title,
      hasScreenshot: !!screenshotUrl,
      screenshotType: screenshotUrl ? (screenshotUrl.startsWith('data:') ? 'base64' : 'url') : 'none',
      screenshotUrl: screenshotUrl ? screenshotUrl.substring(0, 100) + '...' : null,
      currentTaskScreenshots: {
        screenshot_display: currentTask.screenshot_display ? 'available' : 'missing',
        screenshot_url: currentTask.screenshot_url ? 'available' : 'missing',
        screenshot: currentTask.screenshot ? 'available' : 'missing'
      },
      taskFromStateScreenshots: taskFromState ? {
        screenshot_display: taskFromState.screenshot_display ? 'available' : 'missing',
        screenshot_url: taskFromState.screenshot_url ? 'available' : 'missing',
        screenshot: taskFromState.screenshot ? 'available' : 'missing'
      } : 'no taskFromState'
    });

    // Validate screenshot URL before sending
    if (screenshotUrl) {
      if (!screenshotUrl.startsWith('data:') && !screenshotUrl.startsWith('http')) {
        console.warn('Invalid screenshot URL format:', screenshotUrl);
        showToast('Warnung: Screenshot-Format ungültig, wird möglicherweise nicht hochgeladen', 'warning');
      } else {
        console.log('Screenshot URL validated and ready for JIRA upload');
      }
    } else {
      console.warn('No screenshot will be uploaded to JIRA - no valid screenshot URL found');
    }
    
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
              screenshot: screenshotUrl,
              id: currentTask.id, // Add task ID for proper filename generation
              projectId: params.id // Add project ID for Direct R2 Access
            },
          jiraConfig: {
            ...jiraConfig,
            defaultAssignee: jiraTaskData.assignee,
            selectedSprint: jiraTaskData.sprint,
            selectedBoardId: jiraBoardId,
            selectedColumn: jiraTaskData.column,
            defaultLabels: jiraTaskData.labels ? jiraTaskData.labels.split(',').map(l => l.trim()) : []
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('JIRA task creation result:', {
          success: result.success,
          jiraKey: result.jiraKey || result.ticket?.key,
          jiraUrl: result.jiraUrl || result.ticket?.url,
          screenshotUploaded: screenshotUrl ? 'attempted' : 'not_provided'
        });
        
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
          const jiraKey = result.jiraKey || result.ticket?.key;
          const jiraUrl = result.jiraUrl || result.ticket?.url;
          
          console.log('JIRA task created successfully, updating task locally:', {
            totalTasks: tasks.length,
            taskId: currentTask.id,
            jiraKey: jiraKey
          });
          
          // Update the task locally instead of reloading all tasks
          setTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === currentTask.id 
                ? { ...task, jira_key: jiraKey, jira_url: jiraUrl }
                : task
            )
          );
          
          // Also update selectedTask if it matches
          if (selectedTask && selectedTask.id === currentTask.id) {
            setSelectedTask(prev => ({ ...prev, jira_key: jiraKey, jira_url: jiraUrl }));
          }
          
          showToast(`JIRA-Task erfolgreich erstellt: ${jiraKey}`, 'success');
          setShowJiraModal(false);
          
          // Load JIRA statuses for the new task
          if (combinedJiraConfig?.serverUrl) {
            setTimeout(() => {
              loadJiraStatuses();
            }, 500);
          }
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
      <Toast toast={toast} onClose={hideToast} />

      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <ProjectHeader
          project={project}
          combinedJiraConfig={combinedJiraConfig}
          jiraConfig={jiraConfig}
        />

        <div className={`grid gap-6 ${viewMode === 'board' ? 'grid-cols-1' : 'lg:grid-cols-4'}`}>
          {/* Main Content Area */}
          <div className={viewMode === 'board' ? '' : 'lg:col-span-3'}>
            <WidgetInstallation project={project} />

            {/* Tasks */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <TaskControls
                isRefreshing={isRefreshing}
                onRefresh={refreshData}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
              
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
                <TaskList
                  tasks={tasks}
                  getFilteredTasks={getFilteredTasks}
                  editingTask={editingTask}
                  editForm={editForm}
                  onEditFormChange={setEditForm}
                  onStartEditing={startEditing}
                  onSaveTask={saveTask}
                  onCancelEditing={cancelEditing}
                  onUpdateStatus={updateTaskStatus}
                  onOpenTaskModal={setSelectedTaskForModal}
                  onOpenDeleteModal={openTaskDeleteModal}
                  onOpenJiraModal={openJiraModal}
                  getScreenshotUrl={getScreenshotUrl}
                  getCommentCount={getCommentCount}
                  user={user}
                  creatingJira={creatingJira}
                  loadingJiraModal={loadingJiraModal}
                  loadingJiraConfig={loadingJiraConfig}
                  viewMode={viewMode}
                />
              ) : (
                <TaskBoard
                  tasks={tasks}
                  editingTask={editingTask}
                  editForm={editForm}
                  onEditFormChange={setEditForm}
                  onStartEditing={startEditing}
                  onSaveTask={saveTask}
                  onCancelEditing={cancelEditing}
                  onUpdateStatus={updateTaskStatus}
                  onOpenTaskModal={setSelectedTaskForModal}
                  onOpenDeleteModal={openTaskDeleteModal}
                  onOpenJiraModal={openJiraModal}
                  getScreenshotUrl={getScreenshotUrl}
                  getCommentCount={getCommentCount}
                  user={user}
                  creatingJira={creatingJira}
                  loadingJiraModal={loadingJiraModal}
                  loadingJiraConfig={loadingJiraConfig}
                  viewMode={viewMode}
                  draggedTask={draggedTask}
                  setDraggedTask={setDraggedTask}
                  dragOverColumn={dragOverColumn}
                  setDragOverColumn={setDragOverColumn}
                />
              )}
            </div>
          </div>
          
          <ProjectSidebar
            tasks={tasks}
            onExcelExport={handleExcelExport}
            exportingExcel={exportingExcel}
            viewMode={viewMode}
          />
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[62] p-4">
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

        <DeleteTaskModal
          isOpen={showTaskDeleteConfirm}
          task={taskToDelete}
          isDeleting={deletingTask === taskToDelete?.id}
          onConfirm={deleteTask}
          onCancel={() => {
            setShowTaskDeleteConfirm(false);
            setTaskToDelete(null);
          }}
        />

        <JiraModal
          isOpen={showJiraModal}
          task={selectedTask}
          taskData={jiraTaskData}
          onTaskDataChange={setJiraTaskData}
          jiraUsers={jiraUsers}
          jiraSprints={jiraSprintsOptions}
          jiraBoardColumns={jiraBoardColumns}
          isCreating={creatingJira === selectedTask?.id}
          onCreateTask={createJiraTask}
          onClose={() => setShowJiraModal(false)}
          userRole={user?.role}
        />

        <ScreenshotLightbox
          imageUrl={lightboxImage}
          onClose={closeLightbox}
        />

        <TaskDetailModal
          task={selectedTaskForModal}
          comments={taskComments}
          loadingComments={loadingComments}
          newComment={newComment}
          onNewCommentChange={setNewComment}
          addingComment={addingComment}
          onAddComment={addTaskComment}
          onDeleteComment={deleteTaskComment}
          onUpdateStatus={(taskId, status) => {
            updateTaskStatus(taskId, status);
            setSelectedTaskForModal({...selectedTaskForModal, status});
          }}
          onOpenJiraModal={openJiraModal}
          onOpenDeleteModal={openTaskDeleteModal}
          onOpenScreenshotLightbox={openScreenshotLightbox}
          onClose={() => setSelectedTaskForModal(null)}
          getScreenshotUrl={getScreenshotUrl}
          user={user}
          creatingJira={creatingJira}
          loadingJiraModal={loadingJiraModal}
          loadingJiraConfig={loadingJiraConfig}
        />
      </div>
    </div>
  );
}