'use client';

import { useState, useEffect, memo } from 'react';
import TaskDetailModal from '../modals/TaskDetailModal';

function TaskModalContainer({
  selectedTask,
  onClose,
  project,
  onUpdateStatus,
  onOpenJiraModal,
  onOpenDeleteModal,
  onOpenScreenshotLightbox,
  getScreenshotUrl,
  user,
  creatingJira,
  loadingJiraModal,
  loadingJiraConfig,
  showToast
}) {
  const [taskComments, setTaskComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [addingComment, setAddingComment] = useState(false);

  // Load comments when task modal is opened
  useEffect(() => {
    if (selectedTask?.id && project?.id) {
      loadTaskComments(selectedTask.id);
    } else {
      setTaskComments([]);
      setNewComment('');
    }
  }, [selectedTask?.id, project?.id]);

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
        showToast('Kommentar gelöscht', 'success');
      } else {
        showToast('Fehler beim Löschen des Kommentars', 'error');
      }
    } catch {
      showToast('Fehler beim Löschen des Kommentars', 'error');
    }
  };

  const handleUpdateStatus = (taskId, status) => {
    onUpdateStatus(taskId, status);
    // Also update the selected task status locally for immediate UI feedback
    if (selectedTask && selectedTask.id === taskId) {
      // This will be handled by the parent component updating the selectedTask prop
    }
  };

  if (!selectedTask) return null;

  return (
    <TaskDetailModal
      task={selectedTask}
      comments={taskComments}
      loadingComments={loadingComments}
      newComment={newComment}
      onNewCommentChange={setNewComment}
      addingComment={addingComment}
      onAddComment={addTaskComment}
      onDeleteComment={deleteTaskComment}
      onUpdateStatus={handleUpdateStatus}
      onOpenJiraModal={onOpenJiraModal}
      onOpenDeleteModal={onOpenDeleteModal}
      onOpenScreenshotLightbox={onOpenScreenshotLightbox}
      onClose={onClose}
      getScreenshotUrl={getScreenshotUrl}
      user={user}
      creatingJira={creatingJira}
      loadingJiraModal={loadingJiraModal}
      loadingJiraConfig={loadingJiraConfig}
    />
  );
}

export default memo(TaskModalContainer);