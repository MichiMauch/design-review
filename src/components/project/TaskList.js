'use client';

import { memo, useState, useCallback } from 'react';
import { AlertCircle, Edit3, X, MessageSquare, Calendar, Eye, ChevronUp, ChevronDown } from 'lucide-react';

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

  // Sorting state
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Sorting functions
  const handleSort = useCallback((column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  const getSortIcon = useCallback((column) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }, [sortBy, sortOrder]);

  const getSortedTasks = useCallback((tasks) => {
    return [...tasks].sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'status':
          aVal = a.status || 'open';
          bVal = b.status || 'open';
          break;
        case 'created_at':
          aVal = new Date(a.created_at || 0);
          bVal = new Date(b.created_at || 0);
          break;
        case 'comments':
          aVal = getCommentCount ? getCommentCount(a.id) : 0;
          bVal = getCommentCount ? getCommentCount(b.id) : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortBy, sortOrder, getCommentCount]);

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

  const sortedTasks = getSortedTasks(filteredTasks);

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-red-500" />
        Tasks - Sortierbare Tabelle ({sortedTasks.length})
      </h3>

      <div className="bg-white rounded-lg shadow overflow-hidden max-w-full">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '100px'}}>
                  Screenshot
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '40%'}}>
                  Titel
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{width: '120px'}}
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{width: '100px'}}
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Datum
                    {getSortIcon('created_at')}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  style={{width: '80px'}}
                  onClick={() => handleSort('comments')}
                >
                  <div className="flex items-center gap-1">
                    Kommentare
                    {getSortIcon('comments')}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '120px'}}>
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTasks.map((task, index) => {
                const isEvenRow = index % 2 === 0;
                const statusInfo = getStatusInfo(task.status);

                return (
                  <tr
                    key={task.id}
                    className={`${isEvenRow ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer`}
                    onClick={() => onOpenTaskModal(task)}
                  >
                    {/* Screenshot */}
                    <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                      {(task.screenshot_display || task.screenshot) ? (
                        <img
                          src={getScreenshotUrl ? getScreenshotUrl(task.screenshot) : '#'}
                          alt="Preview"
                          className="w-20 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => onOpenTaskModal && onOpenTaskModal(task)}
                        />
                      ) : (
                        <div className="w-20 h-16 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-gray-400 text-sm">📷</span>
                        </div>
                      )}
                    </td>

                    {/* Titel */}
                    <td className="px-4 py-4">
                      <div className="truncate">
                        <h4 className="font-medium text-gray-900 text-sm truncate" title={task.title || 'Ohne Titel'}>
                          {task.title || 'Ohne Titel'}
                        </h4>
                      </div>
                    </td>

                    {/* Status - Display only, not editable */}
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full border font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>

                    {/* Datum */}
                    <td className="px-4 py-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="hidden sm:inline">
                          {task.created_at ? new Date(task.created_at).toLocaleDateString('de-DE') : 'Unbekannt'}
                        </span>
                        <span className="sm:hidden">
                          {task.created_at ? new Date(task.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : '?'}
                        </span>
                      </div>
                    </td>

                    {/* Kommentare */}
                    <td className="px-4 py-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>{getCommentCount ? getCommentCount(task.id) : '0'}</span>
                      </div>
                    </td>

                    {/* Aktionen */}
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenTaskModal && onOpenTaskModal(task)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Details anzeigen"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => onStartEditing && onStartEditing(task)}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          title="Task bearbeiten"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => onOpenDeleteModal && onOpenDeleteModal(task)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Task löschen"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default memo(TaskList);