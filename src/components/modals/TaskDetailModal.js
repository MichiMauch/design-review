'use client';

import { X, ExternalLink, MessageSquare } from 'lucide-react';
import { ExternalLink as JiraIcon } from 'lucide-react';
import { TASK_STATUSES } from '../../constants/taskStatuses';
import { formatTime, getStatusInfo } from '../../utils/projectUtils';

export default function TaskDetailModal({
  task,
  comments,
  loadingComments,
  newComment,
  onNewCommentChange,
  addingComment,
  onAddComment,
  onDeleteComment,
  onUpdateStatus,
  onOpenJiraModal,
  onOpenDeleteModal,
  onOpenScreenshotLightbox,
  onClose,
  getScreenshotUrl,
  user,
  creatingJira,
  loadingJiraModal,
  loadingJiraConfig
}) {
  if (!task) return null;

  const handleStatusChange = (status) => {
    onUpdateStatus(task.id, status);
  };

  const handleAddComment = () => {
    onAddComment(task.id, newComment);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Modal Header */}
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Task Details
            </h3>
            <button
              onClick={onClose}
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
                {task.title}
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  {task.description}
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={task.status || 'open'}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusInfo(task.status).color}`}
              >
                {TASK_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Screenshot */}
            {(task.screenshot_display || task.screenshot) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Screenshot</label>
                <div className="border rounded-lg p-2 bg-gray-50">
                  <img
                    src={getScreenshotUrl(task.screenshot)}
                    alt="Task Screenshot"
                    className="w-full h-48 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onOpenScreenshotLightbox(getScreenshotUrl(task.screenshot))}
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5TY3JlZW5zaG90IG5pY2h0IGdlZnVuZGVuPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                </div>
              </div>
            )}

            {/* URL */}
            {task.url && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={task.url}
                    readOnly
                    className="flex-1 p-3 bg-gray-50 rounded-lg text-sm"
                  />
                  <a
                    href={task.url}
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

            {/* JIRA Integration */}
            {task.jira_key && task.jira_url && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">JIRA Ticket</label>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <JiraIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-blue-900">{task.jira_key}</div>
                        <div className="text-xs text-blue-700">JIRA Ticket verknüpft</div>
                      </div>
                    </div>
                    <a
                      href={task.jira_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      In JIRA öffnen
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Created Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Erstellt</label>
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                {formatTime(task.created_at)}
              </div>
            </div>

            {/* Comments Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Kommentare ({comments.length})
              </label>

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                  {comments.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Noch keine Kommentare</p>
                    </div>
                  ) : (
                    comments.map((comment, index) => (
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
                            onClick={() => onDeleteComment(task.id, comment.id)}
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
                  onChange={(e) => onNewCommentChange(e.target.value)}
                  placeholder="Kommentar hinzufügen..."
                  className="flex-1 px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={handleAddComment}
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
                  onClick={() => onOpenJiraModal(task)}
                  disabled={creatingJira === task.id || loadingJiraModal === task.id || loadingJiraConfig}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm"
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
                  ) : loadingJiraConfig ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Konfiguration...
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
                onClick={() => onOpenDeleteModal(task)}
                className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                <X className="h-3 w-3" />
                Löschen
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}