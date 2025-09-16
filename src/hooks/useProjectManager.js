import { useState, useCallback, useEffect } from 'react';
import { downloadExcel } from '@/utils/excelExport';

export function useProjectManager({ projectId, showToast, router }) {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [combinedJiraConfig, setCombinedJiraConfig] = useState(null);
  const [jiraConfig, setJiraConfig] = useState({
    projectKey: '',
    issueType: 'Task'
  });
  const [loadingJiraConfig, setLoadingJiraConfig] = useState(false);
  const [lastAnalyzedTasks, setLastAnalyzedTasks] = useState(new Set());

  const loadProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Project not found');
      }
      const projectData = await response.json();
      setProject(projectData);

      // Load combined JIRA config immediately after project is set (non-blocking)
      try {
        await loadCombinedJiraConfigWithRetry(projectData.id);
      } catch (jiraError) {
        // JIRA config loading should not block project loading
        console.warn('JIRA config loading failed but project will continue loading:', jiraError.message);
      }
      return projectData;
    } catch (error) {
      router.push('/projects');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, router]);

  const loadTasks = useCallback(async (silent = false) => {
    try {
      // Loading tasks from API
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (response.ok) {
        const tasksData = await response.json();

        // Update tracking set first
        const analyzedTaskIds = new Set(
          tasksData
            .filter(task => task.ai_analyzed_at)
            .map(task => task.id)
        );

        // Check for newly analyzed tasks (only if we have previous data to compare)
        if (!silent && lastAnalyzedTasks.size > 0) {
          const newlyAnalyzed = tasksData.filter(task =>
            task.ai_analyzed_at && !lastAnalyzedTasks.has(task.id)
          );

          // Show notifications for newly analyzed tasks
          newlyAnalyzed.forEach(task => {
            const sentiment = task.ai_sentiment;
            const category = task.ai_category;
            const priority = task.ai_priority;

            let toastType = 'success';
            let message = `AI-Analyse abgeschlossen für "${task.title.substring(0, 30)}${task.title.length > 30 ? '...' : ''}"`;

            if (sentiment === 'negative' && priority === 'high') {
              toastType = 'error';
              message = `⚠️ Kritisches Feedback erkannt: "${task.title.substring(0, 30)}${task.title.length > 30 ? '...' : ''}" (${category})`;
            } else if (priority === 'high') {
              toastType = 'warning';
              message = `⚡ Hochpriorisiertes Feedback: "${task.title.substring(0, 30)}${task.title.length > 30 ? '...' : ''}" (${category})`;
            } else if (sentiment === 'positive') {
              message = `✅ Positives Feedback analysiert: "${task.title.substring(0, 30)}${task.title.length > 30 ? '...' : ''}" (${category})`;
            }

            showToast(message, toastType);
          });
        }

        // Always update the tracking set
        setLastAnalyzedTasks(analyzedTaskIds);

        // Tasks loaded successfully
        setTasks(tasksData);
        return tasksData;
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
    return [];
  }, [projectId, lastAnalyzedTasks, showToast]);

  const loadUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        return userData.user;
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
    return null;
  }, []);

  const checkWidgetStatus = useCallback(async () => {
    if (!project) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/widget-status`);
      if (response.ok) {
        const status = await response.json();
        setProject(prev => ({
          ...prev,
          widget_installed: status.installed,
          widget_last_ping: status.last_ping
        }));
        return status;
      }
    } catch (error) {
      console.error('Error checking widget status:', error);
    }
    return null;
  }, [project, projectId]);

  const loadJiraSettings = useCallback(async () => {
    try {
      // First try to load from settings API
      const response = await fetch(`/api/settings?key=jira_config_project_${projectId}`);
      const data = await response.json();

      if (data.success && data.setting) {
        setJiraConfig(data.setting.value);
        return data.setting.value;
      } else {
        // Load project-specific JIRA configuration
        const projectResponse = await fetch(`/api/projects/${projectId}`);
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          const jiraConfigFromProject = {
            projectKey: projectData.jira_project_key || '',
            issueType: projectData.jira_issue_type || 'Task'
          };
          setJiraConfig(jiraConfigFromProject);
          return jiraConfigFromProject;
        }
      }
    } catch (error) {
      console.error('Error loading JIRA settings:', error);
    }
    return null;
  }, [projectId]);

  const loadCombinedJiraConfigWithRetry = useCallback(async (projectId, retries = 3) => {
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
            return result.config; // Success, exit retry loop
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
    return null;
  }, []);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Erst Projekt und JIRA-Settings laden
      await Promise.all([
        loadProject(),
        loadJiraSettings(),
        checkWidgetStatus()
      ]);

      // Dann Tasks laden (silent refresh)
      await loadTasks(true);

      showToast('Daten aktualisiert', 'success');
    } catch {
      showToast('Fehler beim Aktualisieren der Daten', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadProject, loadJiraSettings, checkWidgetStatus, loadTasks, showToast]);

  const handleExcelExport = useCallback(async (loadTaskScreenshot) => {
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
  }, [tasks, project?.name, showToast]);

  // Initialize project data on mount
  useEffect(() => {
    if (projectId) {
      loadProject();
      loadTasks(true); // Silent initial load
      loadJiraSettings();
      loadUser();
    }
  }, [projectId]); // Only depend on projectId, not the functions

  // Set up widget status polling
  useEffect(() => {
    if (!projectId) return;

    // Check widget installation status every 10 seconds, refresh tasks every 3 seconds
    const widgetInterval = setInterval(() => {
      checkWidgetStatus();
    }, 10000);

    const tasksInterval = setInterval(async () => {
      await loadTasks(); // Refresh tasks more frequently to catch AI analysis updates
    }, 3000);

    return () => {
      clearInterval(widgetInterval);
      clearInterval(tasksInterval);
    };
  }, [projectId]); // Only depend on projectId, not the functions

  // Load JIRA config from localStorage on component mount
  useEffect(() => {
    const savedJiraConfig = localStorage.getItem('jiraConfig');
    if (savedJiraConfig) {
      try {
        setJiraConfig(JSON.parse(savedJiraConfig));
      } catch (error) {
        console.error('Error parsing saved JIRA config:', error);
      }
    }
  }, []);

  return {
    // State
    project,
    setProject,
    tasks,
    setTasks,
    isLoading,
    isRefreshing,
    user,
    exportingExcel,
    combinedJiraConfig,
    setCombinedJiraConfig,
    jiraConfig,
    setJiraConfig,
    loadingJiraConfig,

    // Functions
    loadProject,
    loadTasks,
    loadUser,
    checkWidgetStatus,
    loadJiraSettings,
    loadCombinedJiraConfigWithRetry,
    refreshData,
    handleExcelExport
  };
}