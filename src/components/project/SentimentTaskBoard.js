'use client';

import { memo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Frown,
  Meh,
  Smile,
  Clock,
  MessageSquare,
  Calendar,
  ExternalLink,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { AIBadgeSet } from '../ai/AIBadges';
import { formatTime } from '../../utils/projectUtils';

// Sentiment Category definitions with colors, icons and emojis
const SENTIMENT_CATEGORIES = [
  {
    value: 'critical',
    label: 'Kritisch',
    emoji: '😠',
    icon: Frown,
    color: 'red',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    headerClass: 'bg-gradient-to-r from-red-100 to-red-50 border-b-2 border-red-200',
    iconClass: 'text-red-600',
    description: 'Negative Stimmung + hohe Priorität'
  },
  {
    value: 'negative',
    label: 'Negativ',
    emoji: '😟',
    icon: Frown,
    color: 'orange',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    headerClass: 'bg-gradient-to-r from-orange-100 to-orange-50 border-b-2 border-orange-200',
    iconClass: 'text-orange-600',
    description: 'Negative Stimmung'
  },
  {
    value: 'neutral',
    label: 'Neutral',
    emoji: '😐',
    icon: Meh,
    color: 'gray',
    bgClass: 'bg-gray-50',
    borderClass: 'border-gray-200',
    headerClass: 'bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200',
    iconClass: 'text-gray-600',
    description: 'Neutrale Stimmung'
  },
  {
    value: 'positive',
    label: 'Positiv',
    emoji: '😊',
    icon: Smile,
    color: 'green',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    headerClass: 'bg-gradient-to-r from-green-100 to-green-50 border-b-2 border-green-200',
    iconClass: 'text-green-600',
    description: 'Positive Stimmung'
  },
  {
    value: 'unanalyzed',
    label: 'Nicht analysiert',
    emoji: '⏳',
    icon: Clock,
    color: 'blue',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    headerClass: 'bg-gradient-to-r from-blue-100 to-blue-50 border-b-2 border-blue-200',
    iconClass: 'text-blue-600',
    description: 'Noch nicht von AI analysiert'
  }
];

function SentimentTaskBoard({
  tasks,
  editingTask,
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
  viewMode,
  updatingTaskSentiment,
  onDragStart,
  onDragEnd
}) {
  if (viewMode !== 'sentiment-board') return null;

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

    // Moving between different sentiment categories
    if (destination.droppableId !== source.droppableId) {
      // For sentiment board, we don't actually change the sentiment via drag & drop
      // as sentiment is determined by AI analysis. This is just for visual organization.
      console.log('Sentiment categories are determined by AI analysis and cannot be manually changed');
    }
  };

  // Group tasks by sentiment category
  const getTasksByCategory = (category) => {
    switch (category) {
      case 'critical':
        // Negative sentiment with high priority
        return tasks.filter(task =>
          task.ai_sentiment === 'negative' && task.ai_priority === 'high'
        );

      case 'negative':
        // Negative sentiment with medium/low priority or no priority
        return tasks.filter(task =>
          task.ai_sentiment === 'negative' && (!task.ai_priority || task.ai_priority !== 'high')
        );

      case 'neutral':
        return tasks.filter(task => task.ai_sentiment === 'neutral');

      case 'positive':
        return tasks.filter(task => task.ai_sentiment === 'positive');

      case 'unanalyzed':
        return tasks.filter(task => !task.ai_sentiment || !task.ai_analyzed_at);

      default:
        return [];
    }
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {SENTIMENT_CATEGORIES.map((category) => {
          const categoryTasks = getTasksByCategory(category.value);

          return (
            <div key={category.value} className="flex-shrink-0 w-80">
              <div
                className={`bg-white rounded-xl shadow-sm border-2 ${category.borderClass} overflow-hidden h-full flex flex-col`}
                style={{ minHeight: '400px' }}
              >
                {/* Category Header */}
                <div className={`${category.headerClass} p-3 sticky top-0 z-10`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category.emoji}</span>
                      <div>
                        <h3 className="font-semibold text-sm text-gray-800">
                          {category.label}
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {category.description}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-white/70 rounded-full text-xs font-medium text-gray-700">
                      {categoryTasks.length}
                    </span>
                  </div>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={category.value}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 p-3 space-y-2 transition-all duration-300 ${
                        snapshot.draggingOverWith
                          ? `${category.bgClass} ring-2 ring-${category.color}-400`
                          : ''
                      }`}
                      style={{ minHeight: '200px' }}
                    >
                      {categoryTasks
                        .sort((a, b) => {
                          // Sort by created date (newest first)
                          return new Date(b.created_at) - new Date(a.created_at);
                        })
                        .map((task, index) => (
                          <Draggable
                            key={`sentiment-task-${task.id}`}
                            draggableId={String(task.id)}
                            index={index}
                            isDragDisabled={editingTask === task.id || updatingTaskSentiment === task.id}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <SentimentTaskCard
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
                                  isUpdatingSentiment={updatingTaskSentiment === task.id}
                                  categoryColor={category.color}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}

                      {/* Empty State */}
                      {categoryTasks.length === 0 && !snapshot.draggingOverWith && (
                        <div className="text-center py-8 text-gray-400">
                          <span className="text-2xl mb-2 block">{category.emoji}</span>
                          <p className="text-xs">Keine Tasks</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

// Task Card Component for Sentiment Board - using same design as TaskBoardCard
const SentimentTaskCard = memo(function SentimentTaskCard({
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
  isUpdatingSentiment
}) {
  // JIRA Icon component (same as in TaskBoard)
  const JiraIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.96 4.35 4.35 4.35V2.7a.7.7 0 0 0-.7-.7h-9.78zm0 9.53c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.96 4.35 4.35 4.35v-9.7a.7.7 0 0 0-.7-.7H11.53zm-9.53 0c0 2.4 1.97 4.35 4.35 4.35H8.13v1.7c0 2.4 1.96 4.35 4.35 4.35v-9.7a.7.7 0 0 0-.7-.7H2z"/>
    </svg>
  );

  return (
    <div
      className={`bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-all border ${
        isDragging ? 'opacity-50 shadow-lg transform rotate-2 scale-105' :
        isUpdatingSentiment ? 'opacity-75 border-blue-300 bg-blue-50' : 'cursor-move'
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
});

export default memo(SentimentTaskBoard);