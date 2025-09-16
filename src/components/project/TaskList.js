'use client';

import { memo } from 'react';
import { AlertCircle, Edit3, Save, X, ExternalLink, MessageSquare, Calendar, ExternalLink as JiraIcon } from 'lucide-react';
import { formatTime } from '../../utils/projectUtils';

function TaskList({
  filteredTasks,
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
  projectStatuses = []
}) {
  if (viewMode !== 'list') return null;

  // Status info function
  const getStatusInfo = (status) => {
    const statusConfig = projectStatuses.find(s => s.value === status) || {
      label: status || 'Open',
      color: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return statusConfig;
  };

  if (filteredTasks.length === 0) {
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
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-red-500" />
        Tasks ({filteredTasks.length})
      </h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isEditing={editingTask === task.id}
            editForm={editForm}
            onEditFormChange={onEditFormChange}
            onStartEditing={onStartEditing}
            onSaveTask={onSaveTask}
            onCancelEditing={onCancelEditing}
            onUpdateStatus={onUpdateStatus}
            onOpenTaskModal={onOpenTaskModal}
            onOpenDeleteModal={onOpenDeleteModal}
            onOpenJiraModal={onOpenJiraModal}
            getScreenshotUrl={getScreenshotUrl}
            getCommentCount={getCommentCount}
            user={user}
            creatingJira={creatingJira}
            loadingJiraModal={loadingJiraModal}
            loadingJiraConfig={loadingJiraConfig}
            getStatusInfo={getStatusInfo}
            projectStatuses={projectStatuses}
          />
        ))}
      </div>
    </div>
  );
}

const TaskCard = memo(function TaskCard({
  task,
  isEditing,
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
  getStatusInfo,
  projectStatuses
}) {
  const statusInfo = getStatusInfo(task.status);

  return (
    <div className="bg-white border border-red-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => onEditFormChange({ ...editForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Task-Titel"
              />
              <textarea
                value={editForm.description}
                onChange={(e) => onEditFormChange({ ...editForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows="2"
                placeholder="Beschreibung (optional)"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSaveTask(task.id)}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                >
                  <Save className="h-3 w-3" />
                  Speichern
                </button>
                <button
                  onClick={onCancelEditing}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                >
                  <X className="h-3 w-3" />
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 mb-1">
                <h4 className="font-medium text-gray-900 flex-1" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {task.title}
                </h4>
              </div>
              {task.description && (
                <p className="text-sm text-gray-600 mb-2" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {task.description}
                </p>
              )}

              {/* AI Analysis Badges - not shown in list view */}
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onStartEditing(task)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Task bearbeiten"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onOpenDeleteModal(task)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Task löschen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {!isEditing && (
        <>
          {/* Status */}
          <div className="mb-3">
            <select
              value={task.status || 'open'}
              onChange={(e) => onUpdateStatus(task.id, e.target.value)}
              className={`w-full px-3 py-1 text-xs rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusInfo.color}`}
            >
              {projectStatuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Screenshot */}
          {(task.screenshot_display || task.screenshot) && (
            <div className="mb-3">
              <img
                src={getScreenshotUrl(task.screenshot)}
                alt="Task Screenshot"
                className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onOpenTaskModal(task)}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5TY3JlZW5zaG90IG5pY2h0IGdlZnVuZGVuPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
            </div>
          )}

          {/* URL */}
          {task.url && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 truncate flex-1">{task.url}</span>
                <a
                  href={task.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-blue-600 hover:text-blue-800"
                  title="URL öffnen"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-3 text-xs text-gray-500">
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
                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200 transition-colors"
                  title="JIRA Ticket öffnen"
                >
                  <JiraIcon className="h-3 w-3" />
                  {task.jira_key}
                </a>
              )}

              {user?.role === 'admin' && (
                <button
                  onClick={() => onOpenJiraModal(task)}
                  disabled={creatingJira === task.id || loadingJiraModal === task.id || loadingJiraConfig}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-xs transition-colors"
                  title="JIRA Task erstellen"
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

              <button
                onClick={() => onOpenTaskModal(task)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs transition-colors"
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
});

export default memo(TaskList);