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
  const [viewMode, setViewMode] = useState('board');
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});

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

  const updateTaskStatus = useCallback(async (taskId, newStatus) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Update local state
        setTasks(tasks =>
          tasks.map(task =>
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        );
        showToast('Status erfolgreich aktualisiert', 'success');
      } else {
        showToast('Fehler beim Aktualisieren des Status', 'error');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      showToast('Fehler beim Aktualisieren des Status', 'error');
    }
  }, [projectId, setTasks, showToast]);

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

    // Drag & Drop state
    draggedTask,
    setDraggedTask,
    dragOverColumn,
    setDragOverColumn,

    // Comment state
    commentCounts,
    setCommentCounts,

    // Computed values
    getFilteredTasks,

    // Functions
    getScreenshotUrl,
    getCommentCount,
    loadTaskScreenshot,
    openScreenshotLightbox,
    closeLightbox,
    startEditing,
    cancelEditing,
    saveTask,
    updateTaskStatus,
    openTaskDeleteModal,
    deleteTask,
    closeTaskDeleteModal
  };
}