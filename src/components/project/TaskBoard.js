'use client';

import { Edit3, Save, X, ExternalLink, MessageSquare, Calendar, ExternalLink as JiraIcon } from 'lucide-react';
import { TASK_STATUSES } from '../../constants/taskStatuses';
import { formatTime } from '../../utils/projectUtils';

export default function TaskBoard({
  tasks,
  editingTask,
  editForm,
  onEditFormChange,
  onStartEditing,
  onSaveTask,
  onCancelEditing,
  onUpdateStatus,
  onOpenTaskModal,
  onOpenDeleteModal,
  onOpenJiraModal,
  getScreenshotUrl,
  getCommentCount,
  user,
  creatingJira,
  loadingJiraModal,
  loadingJiraConfig,
  viewMode,
  draggedTask,
  setDraggedTask,
  dragOverColumn,
  setDragOverColumn
}) {
  if (viewMode !== 'board') return null;

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    setDragOverColumn(status.value);
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== status.value) {
      onUpdateStatus(draggedTask.id, status.value);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Noch keine Tasks vorhanden</p>
        <p className="text-sm mt-2">
          Tasks werden automatisch erstellt, wenn das Widget installiert und verwendet wird.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {TASK_STATUSES.map(status => {
        // Robust filtering - handle undefined, null, empty string
        const statusTasks = tasks.filter(t => {
          const taskStatus = t.status || 'open'; // Default to 'open' for undefined/null
          return taskStatus === status.value;
        });

        // Debug logging for board filter
        if (status.value === 'open') {
          console.log(`Board filter for "${status.value}":`, {
            totalTasks: tasks.length,
            statusTasks: statusTasks.length,
            tasksWithUndefinedStatus: tasks.filter(t => !t.status).length,
            tasksWithEmptyStatus: tasks.filter(t => t.status === '').length,
            allTaskStatuses: tasks.map(t => ({
              id: t.id,
              title: t.title?.substring(0, 30),
              status: t.status
            }))
          });
        }

        return (
          <div
            key={status.value}
            className={`flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4 ${
              dragOverColumn === status.value ? 'bg-blue-50 border-2 border-blue-300' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className={`flex items-center gap-2 mb-4 p-2 rounded-lg ${status.color}`}>
              <h3 className="font-semibold text-sm">{status.label}</h3>
              <span className="text-xs">({statusTasks.length})</span>
            </div>

            <div className="space-y-3">
              {statusTasks.map(task => (
                <TaskBoardCard
                  key={task.id}
                  task={task}
                  isEditing={editingTask === task.id}
                  editForm={editForm}
                  onEditFormChange={onEditFormChange}
                  onStartEditing={onStartEditing}
                  onSaveTask={onSaveTask}
                  onCancelEditing={onCancelEditing}
                  onOpenTaskModal={onOpenTaskModal}
                  onOpenDeleteModal={onOpenDeleteModal}
                  onOpenJiraModal={onOpenJiraModal}
                  getScreenshotUrl={getScreenshotUrl}
                  getCommentCount={getCommentCount}
                  user={user}
                  creatingJira={creatingJira}
                  loadingJiraModal={loadingJiraModal}
                  loadingJiraConfig={loadingJiraConfig}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isDragged={draggedTask?.id === task.id}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskBoardCard({
  task,
  isEditing,
  editForm,
  onEditFormChange,
  onStartEditing,
  onSaveTask,
  onCancelEditing,
  onOpenTaskModal,
  onOpenDeleteModal,
  onOpenJiraModal,
  getScreenshotUrl,
  getCommentCount,
  user,
  creatingJira,
  loadingJiraModal,
  loadingJiraConfig,
  onDragStart,
  onDragEnd,
  isDragged
}) {
  return (
    <div
      className={`bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-move border ${
        isDragged ? 'opacity-50 rotate-3 scale-105' : ''
      }`}
      draggable={!isEditing}
      onDragStart={() => onDragStart(task)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => onEditFormChange({ ...editForm, title: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Task-Titel"
              />
              <textarea
                value={editForm.description}
                onChange={(e) => onEditFormChange({ ...editForm, description: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows="2"
                placeholder="Beschreibung (optional)"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onSaveTask(task.id)}
                  className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                >
                  <Save className="h-3 w-3" />
                  Speichern
                </button>
                <button
                  onClick={onCancelEditing}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs"
                >
                  <X className="h-3 w-3" />
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <>
              <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                {task.title}
              </h4>
              {task.description && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {task.description}
                </p>
              )}
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartEditing(task);
              }}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Task bearbeiten"
            >
              <Edit3 className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDeleteModal(task);
              }}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Task löschen"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {!isEditing && (
        <>
          {/* Screenshot */}
          {(task.screenshot_display || task.screenshot) && (
            <div className="mb-2">
              <img
                src={getScreenshotUrl(task.screenshot)}
                alt="Task Screenshot"
                className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTaskModal(task);
                }}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5TY3JlZW5zaG90IG5pY2h0IGdlZnVuZGVuPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
            </div>
          )}

          {/* URL */}
          {task.url && (
            <div className="mb-2">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-500 truncate flex-1">{task.url}</span>
                <a
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-blue-600 hover:text-blue-800"
                  onClick={(e) => e.stopPropagation()}
                  title="URL öffnen"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatTime(task.created_at)}
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {getCommentCount(task.id)}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {task.jira_key && task.jira_url && (
                <a
                  href={task.jira_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="JIRA Ticket öffnen"
                >
                  <JiraIcon className="h-3 w-3" />
                  {task.jira_key}
                </a>
              )}

              {user?.role === 'admin' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenJiraModal(task);
                  }}
                  disabled={creatingJira === task.id || loadingJiraModal === task.id || loadingJiraConfig}
                  className="flex items-center gap-1 px-1 py-0.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-xs transition-colors"
                  title="JIRA Task erstellen"
                >
                  {creatingJira === task.id ? (
                    <>
                      <div className="animate-spin rounded-full h-2 w-2 border-b-2 border-white"></div>
                      Erstelle...
                    </>
                  ) : loadingJiraModal === task.id ? (
                    <>
                      <div className="animate-spin rounded-full h-2 w-2 border-b-2 border-white"></div>
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

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTaskModal(task);
                }}
                className="flex items-center gap-1 px-1 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs transition-colors"
                title="Task Details anzeigen"
              >
                Details
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}