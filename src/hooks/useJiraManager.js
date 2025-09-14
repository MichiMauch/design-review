import { useState, useCallback } from 'react';

export function useJiraManager({ combinedJiraConfig, jiraConfig, showToast }) {
  const [jiraUsers, setJiraUsers] = useState([]);
  const [jiraSprintsOptions, setJiraSprintsOptions] = useState([]);
  const [jiraBoardId, setJiraBoardId] = useState(null);
  const [jiraBoardColumns, setJiraBoardColumns] = useState([]);
  const [loadingJiraModal, setLoadingJiraModal] = useState(null);
  const [creatingJira, setCreatingJira] = useState(null);
  const [jiraStatuses, setJiraStatuses] = useState({});
  const [jiraTaskSprints, setJiraTaskSprints] = useState({});

  const loadJiraUsers = useCallback(async () => {
    if (!combinedJiraConfig?.serverUrl) return;

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
    } catch (error) {
      console.error('Error loading JIRA users:', error);
    }
  }, [combinedJiraConfig]);

  const loadJiraBoards = useCallback(async () => {
    if (!combinedJiraConfig?.serverUrl) return null;

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
    } catch (error) {
      console.error('Error loading JIRA boards:', error);
    }
    return null;
  }, [combinedJiraConfig]);

  const loadJiraSprints = useCallback(async (boardId) => {
    if (!boardId || !combinedJiraConfig?.serverUrl) return;

    try {
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
    } catch (error) {
      console.error('Error loading JIRA sprints:', error);
    }
  }, [combinedJiraConfig]);

  const loadJiraBoardColumns = useCallback(async (boardId) => {
    if (!boardId || !combinedJiraConfig?.serverUrl) return;

    try {
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
    } catch (error) {
      console.error('Error loading JIRA board columns:', error);
    }
  }, [combinedJiraConfig]);

  const loadJiraStatuses = useCallback(async (tasks, projectId) => {
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
          const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
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
        } catch (error) {
          console.error('Error unlinking JIRA task:', error);
        }
        return null;
      });

      const unlinkedTasks = await Promise.all(unlinkPromises);
      const successfullyUnlinked = unlinkedTasks.filter(Boolean);

      if (successfullyUnlinked.length > 0) {
        showToast(`${successfullyUnlinked.length} JIRA-Verknüpfung(en) aufgehoben - Tasks wurden nicht gelöscht`, 'info');

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

        return successfullyUnlinked; // Return unlinked tasks for parent to update state
      }
    }

    setJiraStatuses(statusMap);
    setJiraTaskSprints(sprintMap);

    return null; // No unlinked tasks
  }, [combinedJiraConfig, showToast]);

  const createJiraTask = useCallback(async (selectedTask, jiraTaskData, projectId, getScreenshotUrl, tasks, setTasks, setSelectedTask) => {
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
        },
        body: JSON.stringify({
          action: 'createTicket',
          feedback: {
            title: jiraTaskData.title || currentTask.title,
            description: jiraTaskData.description || currentTask.description || '',
            url: currentTask.url,
            selected_area: currentTask.selected_area,
            screenshot: screenshotUrl,
            id: currentTask.id, // Add task ID for proper filename generation
            projectId: projectId // Add project ID for Direct R2 Access
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
        const updateResponse = await fetch(`/api/projects/${projectId}/tasks/${selectedTask.id}`, {
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

          // Load JIRA statuses for the new task
          if (combinedJiraConfig?.serverUrl) {
            setTimeout(() => {
              loadJiraStatuses(tasks, projectId);
            }, 500);
          }

          return { success: true, jiraKey, jiraUrl };
        } else {
          showToast('Task erstellt, aber Update fehlgeschlagen', 'error');
          return { success: false, error: 'Update failed' };
        }
      } else {
        showToast(`Fehler beim Erstellen: ${result.error}`, 'error');
        return { success: false, error: result.error };
      }
    } catch (error) {
      showToast('Fehler beim Erstellen des JIRA-Tasks', 'error');
      return { success: false, error: error.message };
    } finally {
      setCreatingJira(null);
    }
  }, [combinedJiraConfig, jiraConfig, jiraBoardId, loadJiraStatuses, showToast]);

  const loadJiraModalData = useCallback(async () => {
    // First load boards to get board ID
    const boardId = await loadJiraBoards();

    // Then load users, sprints, and columns in parallel
    await Promise.all([
      loadJiraUsers(),
      loadJiraSprints(boardId),
      loadJiraBoardColumns(boardId)
    ]);
  }, [loadJiraBoards, loadJiraUsers, loadJiraSprints, loadJiraBoardColumns]);

  return {
    // State
    jiraUsers,
    jiraSprintsOptions,
    jiraBoardId,
    jiraBoardColumns,
    loadingJiraModal,
    creatingJira,
    jiraStatuses,
    jiraTaskSprints,
    setLoadingJiraModal,

    // Functions
    loadJiraUsers,
    loadJiraBoards,
    loadJiraSprints,
    loadJiraBoardColumns,
    loadJiraStatuses,
    createJiraTask,
    loadJiraModalData
  };
}