'use client';

import { memo } from 'react';
import { Edit3, Save, X, ExternalLink, MessageSquare, Calendar, ExternalLink as JiraIcon } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatTime } from '../../utils/projectUtils';
import { AIBadgeSet } from '../ai/AIBadges';

function TaskBoard({
  tasks,
  editingTask,
  editForm,
  onEditFormChange,
  onStartEditing,
  onSaveTask,
  onCancelEditing,
  onUpdateStatusAndPosition,
  onReorderTasks,
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
  updatingTaskStatus,
  projectStatuses = [],
  onDragStart,
  onDragEnd
}) {
  if (viewMode !== 'board') return null;

  const handleDragStart = () => {
    onDragStart?.();
  };

  const handleDragEnd = (result) => {
    onDragEnd?.();

    if (!result.destination) return;

    const { draggableId, destination, source } = result;
    const taskId = parseInt(draggableId);

    // Check if it's the same position (no change)
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Case 1: Moving between different columns (status change + position)
    if (destination.droppableId !== source.droppableId) {
      const newStatus = destination.droppableId;

      // Get tasks in the destination column to calculate correct position
      const destinationTasks = tasks
        .filter(t => (t.status || 'open') === newStatus)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      // Calculate the sort_order for the new position with 10-step spacing
      let newSortOrder = 10;
      if (destination.index === 0) {
        // Dropping at the beginning - ensure there's space
        newSortOrder = destinationTasks.length > 0 ? Math.max(10, (destinationTasks[0].sort_order || 10) - 10) : 10;
      } else if (destination.index >= destinationTasks.length) {
        // Dropping at the end - add with 10-step spacing
        newSortOrder = destinationTasks.length > 0 ? (destinationTasks[destinationTasks.length - 1].sort_order || (destinationTasks.length * 10)) + 10 : 10;
      } else {
        // Dropping between existing tasks - calculate midpoint with safety checks
        const beforeTask = destinationTasks[destination.index - 1];
        const afterTask = destinationTasks[destination.index];
        const beforeOrder = beforeTask ? (beforeTask.sort_order || (destination.index * 10)) : 0;
        const afterOrder = afterTask ? (afterTask.sort_order || ((destination.index + 1) * 10)) : (destination.index + 1) * 10;

        // Ensure sufficient gap, otherwise use safe fallback
        const midPoint = Math.floor((beforeOrder + afterOrder) / 2);
        if (midPoint > beforeOrder && midPoint < afterOrder) {
          newSortOrder = midPoint;
        } else {
          // Fallback: use afterOrder minus small offset to maintain order
          newSortOrder = afterOrder - 1;
        }
      }

      // Call combined status + position update
      onUpdateStatusAndPosition?.(taskId, newStatus, newSortOrder, destination.index);
    }

    // Case 2: Reordering within same column (sort order change only)
    else if (destination.index !== source.index) {
      // Get tasks in the current column
      const columnTasks = tasks
        .filter(t => (t.status || 'open') === destination.droppableId)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      // Reorder array
      const reorderedTasks = Array.from(columnTasks);
      const [movedTask] = reorderedTasks.splice(source.index, 1);
      reorderedTasks.splice(destination.index, 0, movedTask);

      // Call reorder function
      onReorderTasks?.(destination.droppableId, reorderedTasks.map(t => t.id));
    }
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

  // Use project statuses or fallback to empty if loading
  const statusesToShow = projectStatuses.length > 0 ? projectStatuses : [];

  if (statusesToShow.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <p>Status werden geladen...</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusesToShow.map(status => {
          // Robust filtering - handle undefined, null, empty string
          const statusTasks = tasks.filter(t => {
            const taskStatus = t.status || 'open'; // Default to 'open' for undefined/null
            return taskStatus === status.value;
          });

          return (
            <div key={status.value} className="flex-shrink-0 w-80">
              <div className="bg-gray-50 rounded-lg p-4 h-full flex flex-col">
                {/* Header außerhalb des Droppable */}
                <div className={`flex items-center gap-2 mb-4 p-2 rounded-lg ${status.color}`}>
                  <h3 className="font-semibold text-sm">{status.label}</h3>
                  <span className="text-xs">({statusTasks.length})</span>
                </div>

                {/* Droppable füllt verfügbare Höhe */}
                <Droppable droppableId={status.value}>
                  {(provided, snapshot) => {
                    // Clean drag & drop without debug logging

                    return (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 space-y-3 p-3 rounded-lg transition-all duration-300 border-2 ${
                          snapshot.draggingOverWith
                            ? 'bg-blue-100 border-blue-500 border-dashed shadow-lg ring-4 ring-blue-300'
                            : 'border-gray-200 border-solid'
                        }`}
                        style={{ minHeight: '200px' }}
                      >
                      {statusTasks
                        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                        .map((task, index) => (
                        <Draggable
                          key={`task-${task.id}`}
                          draggableId={String(task.id)}
                          index={index}
                          isDragDisabled={editingTask === task.id || updatingTaskStatus === task.id}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <TaskBoardCard
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
                                isDragging={snapshot.isDragging}
                                isUpdatingStatus={updatingTaskStatus === task.id}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      </div>
                    );
                  }}
                </Droppable>
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

// Optimized memo comparison for TaskBoardCard
const areEqual = (prevProps, nextProps) => {
  // Check if the task object changed
  if (prevProps.task.id !== nextProps.task.id) return false;
  if (prevProps.task.title !== nextProps.task.title) return false;
  if (prevProps.task.description !== nextProps.task.description) return false;
  if (prevProps.task.status !== nextProps.task.status) return false;
  if (prevProps.task.screenshot !== nextProps.task.screenshot) return false;
  if (prevProps.task.url !== nextProps.task.url) return false;
  if (prevProps.task.jira_key !== nextProps.task.jira_key) return false;

  // Check AI analysis fields
  if (prevProps.task.ai_sentiment !== nextProps.task.ai_sentiment) return false;
  if (prevProps.task.ai_confidence !== nextProps.task.ai_confidence) return false;
  if (prevProps.task.ai_category !== nextProps.task.ai_category) return false;
  if (prevProps.task.ai_priority !== nextProps.task.ai_priority) return false;
  if (prevProps.task.ai_analyzed_at !== nextProps.task.ai_analyzed_at) return false;

  // Check editing state
  if (prevProps.isEditing !== nextProps.isEditing) return false;

  // Check dragging state
  if (prevProps.isDragging !== nextProps.isDragging) return false;

  // Check updating state
  if (prevProps.isUpdatingStatus !== nextProps.isUpdatingStatus) return false;

  // Check loading states
  if (prevProps.creatingJira !== nextProps.creatingJira) return false;
  if (prevProps.loadingJiraModal !== nextProps.loadingJiraModal) return false;

  // If editing, check edit form
  if (prevProps.isEditing) {
    if (prevProps.editForm.title !== nextProps.editForm.title) return false;
    if (prevProps.editForm.description !== nextProps.editForm.description) return false;
  }

  return true;
};

const TaskBoardCard = memo(function TaskBoardCard({
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
  isDragging,
  isUpdatingStatus
}) {
  return (
    <div
      className={`bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-all border ${
        isDragging ? 'opacity-50 shadow-lg transform rotate-2 scale-105' :
        isUpdatingStatus ? 'opacity-75 border-blue-300 bg-blue-50' : 'cursor-move'
      } ${isEditing ? 'cursor-default' : 'cursor-move'}`}
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

              {/* AI Analysis Badges */}
              <div className="mb-2">
                <AIBadgeSet
                  sentiment={task.ai_sentiment}
                  confidence={task.ai_confidence}
                  category={task.ai_category}
                  priority={task.ai_priority}
                  analyzed={!!task.ai_analyzed_at}
                  compact={true}
                  className="flex-wrap gap-1"
                />
              </div>
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
}, areEqual);

// Memo comparison function for TaskBoard
const areTaskBoardEqual = (prevProps, nextProps) => {
  // Always allow re-renders for task changes to support optimistic updates
  if (prevProps.tasks !== nextProps.tasks) return false;

  // Compare other essential props
  if (prevProps.viewMode !== nextProps.viewMode) return false;
  if (prevProps.editingTask !== nextProps.editingTask) return false;
  if (prevProps.updatingTaskStatus !== nextProps.updatingTaskStatus) return false;
  if (prevProps.projectStatuses?.length !== nextProps.projectStatuses?.length) return false;
  if (prevProps.isDragging !== nextProps.isDragging) return false;

  return true;
};

export default memo(TaskBoard, areTaskBoardEqual);