'use client';

import { ExternalLink as JiraIcon } from 'lucide-react';

export default function JiraModal({
  isOpen,
  task,
  taskData,
  onTaskDataChange,
  jiraUsers,
  jiraSprints,
  jiraBoardColumns,
  isCreating,
  onCreateTask,
  onClose,
  userRole
}) {
  if (!isOpen || !task || userRole !== 'admin') return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[65] p-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          JIRA-Task erstellen
          <span className="text-xs text-gray-500 ml-2">
            (Task ID: {task.id})
          </span>
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titel
            </label>
            <input
              type="text"
              value={taskData.title}
              onChange={(e) => onTaskDataChange({ ...taskData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Task-Titel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beschreibung
            </label>
            <textarea
              value={taskData.description}
              onChange={(e) => onTaskDataChange({ ...taskData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows="4"
              placeholder="Beschreibung des Tasks"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zugewiesen an
            </label>
            <select
              value={taskData.assignee}
              onChange={(e) => onTaskDataChange({ ...taskData, assignee: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Nicht zugewiesen</option>
              {jiraUsers.map(user => (
                <option key={user.accountId} value={user.accountId}>
                  {user.displayName} ({user.emailAddress})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sprint
            </label>
            <select
              value={taskData.sprint}
              onChange={(e) => onTaskDataChange({ ...taskData, sprint: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Kein Sprint</option>
              {jiraSprints.map(sprint => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name} ({sprint.state})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Board-Spalte
            </label>
            <select
              value={taskData.column}
              onChange={(e) => onTaskDataChange({ ...taskData, column: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Standard (To Do)</option>
              {jiraBoardColumns.map(column => (
                <option key={column.id} value={column.statusId || column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Labels (kommagetrennt)
            </label>
            <input
              type="text"
              value={taskData.labels}
              onChange={(e) => onTaskDataChange({ ...taskData, labels: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="label1, label2, label3"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeMetadata"
              checked={taskData.includeMetadata !== false}
              onChange={(e) => onTaskDataChange({ ...taskData, includeMetadata: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="includeMetadata" className="ml-2 block text-sm text-gray-700">
              Technische Metadaten als Kommentar anhängen
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCreateTask}
            disabled={!taskData.title || isCreating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Erstelle...
              </>
            ) : (
              <>
                <JiraIcon className="h-4 w-4" />
                Erstellen
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}