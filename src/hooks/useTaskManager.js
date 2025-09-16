import { useState, useCallback, useEffect, useMemo } from 'react';

export function useTaskManager({
  projectId,
  tasks,
  setTasks,
  showToast,
  getR2Url
}) {
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [selectedTaskForModal, setSelectedTaskForModal] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [showTaskDeleteConfirm, setShowTaskDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [loadingScreenshots, setLoadingScreenshots] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('dashboard');
  const [updatingTaskStatus, setUpdatingTaskStatus] = useState(null);
  const [updatingTaskCategory, setUpdatingTaskCategory] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Helper function to get screenshot URL
  const getScreenshotUrl = useCallback((screenshot) => {
    if (!screenshot) return null;
    // Simple: just combine settings URL with filename
    return `${getR2Url()}${screenshot}`;
  }, [getR2Url]);

  // Filter tasks based on status
  const getFilteredTasks = useMemo(() => {
    if (statusFilter === 'all') {
      return tasks;
    }
    return tasks.filter(task => task.status === statusFilter);
  }, [tasks, statusFilter]);

  // Update comment counts when comments change
  useEffect(() => {
    const counts = {};
    comments.forEach(comment => {
      counts[comment.task_id] = (counts[comment.task_id] || 0) + 1;
    });
    setCommentCounts(counts);
  }, [comments]);

  const getCommentCount = useCallback((taskId) => {
    return commentCounts[taskId] || 0;
  }, [commentCounts]);

  // Load screenshot for a specific task
  const loadTaskScreenshot = useCallback(async (taskId) => {
    if (loadingScreenshots[taskId]) return;

    setLoadingScreenshots(prev => ({ ...prev, [taskId]: true }));

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}/screenshot?format=json`);
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
  }, [projectId, setTasks, loadingScreenshots]);

  // Screenshot lightbox functions
  const openScreenshotLightbox = useCallback((screenshotUrl) => {
    setLightboxImage(screenshotUrl);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  // Task editing functions
  const startEditing = useCallback((task) => {
    setEditingTask(task.id);
    setEditForm({
      title: task.title,
      description: task.description || ''
    });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingTask(null);
    setEditForm({ title: '', description: '' });
  }, []);

  const saveTask = useCallback(async (taskId) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
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
        setTasks(tasks =>
          tasks.map(task =>
            task.id === taskId
              ? { ...task, title: editForm.title, description: editForm.description }
              : task
          )
        );
        setEditingTask(null);
        setEditForm({ title: '', description: '' });
        showToast('Task erfolgreich gespeichert!', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast('Fehler beim Speichern: ' + (errorData.details || 'Unbekannter Fehler'), 'error');
      }
    } catch (error) {
      console.error('Error saving task:', error);
      showToast('Fehler beim Speichern der Task', 'error');
    }
  }, [projectId, editForm, setTasks, showToast]);

  // Update AI Category when dragged between categories
  const updateTaskAICategory = useCallback(async (taskId, category) => {
    if (updatingTaskCategory === taskId) {
      return;
    }

    setUpdatingTaskCategory(taskId);

    // Optimistic update
    setTasks(currentTasks =>
      currentTasks.map(task =>
        task.id === taskId ? { ...task, ai_category: category } : task
      )
    );

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_category: category })
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      const { success } = await response.json();
      if (!success) {
        throw new Error('Update failed');
      }

      showToast('Task-Kategorie aktualisiert', 'success');
    } catch (error) {
      console.error('Error updating task category:', error);
      // Revert on error - fetch fresh data
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (response.ok) {
        const updatedTasks = await response.json();
        setTasks(updatedTasks);
      }
      showToast('Fehler beim Aktualisieren der Kategorie', 'error');
    } finally {
      setUpdatingTaskCategory(null);
    }
  }, [projectId, setTasks, showToast, updatingTaskCategory]);

  // Update Sentiment Category when dragged between categories
  const updateTaskSentimentCategory = useCallback(async (taskId, sentiment) => {
    if (updatingTaskCategory === taskId) {
      return;
    }

    setUpdatingTaskCategory(taskId);

    // Optimistic update
    setTasks(currentTasks =>
      currentTasks.map(task =>
        task.id === taskId ? { ...task, sentiment_category: sentiment } : task
      )
    );

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentiment_category: sentiment })
      });

      if (!response.ok) {
        throw new Error('Failed to update sentiment category');
      }

      const { success } = await response.json();
      if (!success) {
        throw new Error('Sentiment update failed');
      }

      showToast('Task-Sentiment aktualisiert', 'success');
    } catch (error) {
      console.error('Error updating task sentiment:', error);
      // Revert on error - fetch fresh data
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (response.ok) {
        const updatedTasks = await response.json();
        setTasks(updatedTasks);
      }
      showToast('Fehler beim Aktualisieren des Sentiments', 'error');
    } finally {
      setUpdatingTaskCategory(null);
    }
  }, [projectId, setTasks, showToast, updatingTaskCategory]);

  const updateTaskStatus = useCallback(async (taskId, newStatus, optimistic = false) => {
    // Prevent multiple simultaneous updates
    if (updatingTaskStatus === taskId) {
      return;
    }

    // Store original status for potential revert
    let originalStatus = null;

    // Always do optimistic update immediately for smooth UX
    setTasks(currentTasks => {
      const task = currentTasks.find(t => t.id === taskId);
      if (task) {
        originalStatus = task.status;
        // Optimistic update - immediately update UI
        return currentTasks.map(t =>
          t.id === taskId ? { ...t, status: newStatus } : t
        );
      }
      return currentTasks;
    });

    // If this is just an optimistic update, don't make the API call
    if (optimistic) {
      return;
    }

    setUpdatingTaskStatus(taskId);

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        showToast('Status erfolgreich aktualisiert', 'success');
      } else {
        // Revert on error
        if (originalStatus !== null) {
          setTasks(tasks =>
            tasks.map(task =>
              task.id === taskId ? { ...task, status: originalStatus } : task
            )
          );
        }
        showToast('Fehler beim Aktualisieren des Status', 'error');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      // Revert on error
      if (originalStatus !== null) {
        setTasks(tasks =>
          tasks.map(task =>
            task.id === taskId ? { ...task, status: originalStatus } : task
          )
        );
      }
      showToast('Fehler beim Aktualisieren des Status', 'error');
    } finally {
      setUpdatingTaskStatus(null);
    }
  }, [projectId, setTasks, showToast, updatingTaskStatus]);

  const updateStatusAndPosition = useCallback(async (taskId, newStatus, newSortOrder, targetIndex) => {
    // Prevent multiple simultaneous updates
    if (updatingTaskStatus === taskId) {
      return;
    }

    // Store original tasks for potential revert
    let originalTasks = null;

    // Optimistic update - complete reordering of both source and destination columns
    setTasks(currentTasks => {
      originalTasks = currentTasks; // Store complete state for revert

      const taskIndex = currentTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return currentTasks;

      const movedTask = currentTasks[taskIndex];
      const oldStatus = movedTask.status || 'open';

      // Create updated task with new status and position
      const updatedTask = {
        ...movedTask,
        status: newStatus,
        sort_order: newSortOrder
      };

      // Remove task from original position
      let newTasks = currentTasks.filter(t => t.id !== taskId);

      // If moving between different statuses, update both columns
      if (oldStatus !== newStatus) {
        // Get destination column tasks (excluding the moved task)
        const destinationTasks = newTasks
          .filter(t => (t.status || 'open') === newStatus)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        // Insert task at correct position in destination column
        destinationTasks.splice(targetIndex, 0, updatedTask);

        // Re-sort destination column with clean spacing
        const reorderedDestination = destinationTasks.map((task, index) => ({
          ...task,
          sort_order: (index + 1) * 10
        }));

        // Merge back with other tasks
        const otherTasks = newTasks.filter(t => (t.status || 'open') !== newStatus);
        newTasks = [...otherTasks, ...reorderedDestination];
      } else {
        // Same column reordering - just add the updated task back
        newTasks.push(updatedTask);
      }

      return newTasks;
    });

    setUpdatingTaskStatus(taskId);

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          sort_order: newSortOrder
        })
      });

      if (!response.ok) {
        // Revert on error - restore complete original state
        if (originalTasks) {
          setTasks(originalTasks);
        }
        console.error('Failed to update task status and position');
      }
    } catch (error) {
      console.error('Error updating task status and position:', error);
      // Revert on error - restore complete original state
      if (originalTasks) {
        setTasks(originalTasks);
      }
    } finally {
      setUpdatingTaskStatus(null);
    }
  }, [projectId, setTasks, updatingTaskStatus]);

  const reorderTasks = useCallback(async (status, taskOrder) => {
    try {
      // Store original state for potential revert
      let originalTasks = null;

      // Optimistic update - reorder tasks immediately in UI
      setTasks(prevTasks => {
        originalTasks = prevTasks; // Store for potential revert
        const otherTasks = prevTasks.filter(t => (t.status || 'open') !== status);
        const reorderedTasks = taskOrder.map((taskId, index) => {
          const task = prevTasks.find(t => t.id === taskId);
          return { ...task, sort_order: (index + 1) * 10 };
        });
        return [...otherTasks, ...reorderedTasks];
      });

      // Send to backend
      const response = await fetch(`/api/projects/${projectId}/tasks/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, taskOrder })
      });

      if (!response.ok) {
        // Revert on error
        if (originalTasks) {
          setTasks(originalTasks);
        }
        console.error('Failed to reorder tasks');
      }
    } catch (error) {
      console.error('Error reordering tasks:', error);
    }
  }, [projectId, setTasks]);

  // Task deletion functions
  const openTaskDeleteModal = useCallback((task) => {
    setTaskToDelete(task);
    setShowTaskDeleteConfirm(true);
  }, []);

  const deleteTask = useCallback(async () => {
    if (!taskToDelete) return;

    setDeletingTask(taskToDelete.id);
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskToDelete.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast('Task erfolgreich gelöscht!', 'success');
        // Update tasks in state instead of reloading
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskToDelete.id));
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
      // Close task detail modal if the deleted task was open
      if (selectedTaskForModal && taskToDelete && selectedTaskForModal.id === taskToDelete.id) {
        setSelectedTaskForModal(null);
      }
    }
  }, [taskToDelete, projectId, selectedTaskForModal, setTasks, showToast]);

  const closeTaskDeleteModal = useCallback(() => {
    setShowTaskDeleteConfirm(false);
    setTaskToDelete(null);
  }, []);

  // Drag & drop state management
  const onDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const onDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Load all comments for project tasks
  const loadProjectComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/comments`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.comments) {
          setComments(data.comments);
        }
      }
    } catch (error) {
      console.error('Error loading project comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [projectId]);

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
  }, [lightboxImage, closeLightbox]);

  return {
    // Task editing state
    editingTask,
    editForm,
    setEditForm,

    // Task modal state
    selectedTaskForModal,
    setSelectedTaskForModal,

    // Task deletion state
    deletingTask,
    showTaskDeleteConfirm,
    taskToDelete,

    // Screenshot state
    lightboxImage,
    loadingScreenshots,

    // Filter & view state
    statusFilter,
    setStatusFilter,
    viewMode,
    setViewMode,

    // Update state
    updatingTaskStatus,
    updatingTaskCategory,

    // Comment state
    commentCounts,
    setCommentCounts,
    comments,
    setComments,
    loadingComments,

    // Drag state
    isDragging,
    onDragStart,
    onDragEnd,

    // Computed values
    getFilteredTasks,

    // Functions
    getScreenshotUrl,
    getCommentCount,
    loadTaskScreenshot,
    loadProjectComments,
    openScreenshotLightbox,
    closeLightbox,
    startEditing,
    cancelEditing,
    saveTask,
    updateTaskStatus,
    updateTaskAICategory,
    updateTaskSentimentCategory,
    updateStatusAndPosition,
    reorderTasks,
    openTaskDeleteModal,
    deleteTask,
    closeTaskDeleteModal
  };
}