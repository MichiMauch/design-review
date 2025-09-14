'use client';

import { Download } from 'lucide-react';

export default function ProjectSidebar({
  tasks,
  onExcelExport,
  exportingExcel,
  viewMode
}) {
  if (viewMode !== 'list') return null;

  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Project Stats */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Projekt Statistiken
        </h3>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
            <div className="text-sm text-gray-600">Gesamt Tasks</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <div className="text-lg font-bold text-red-600">
                {tasks.filter(t => t.status === 'open').length}
              </div>
              <div className="text-xs text-red-600">Offen</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <div className="text-lg font-bold text-blue-600">
                {tasks.filter(t => t.jira_key).length}
              </div>
              <div className="text-xs text-blue-600">Mit JIRA</div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Actions */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Projekt-Aktionen</h3>
        <button
          onClick={onExcelExport}
          disabled={exportingExcel || tasks.length === 0}
          className="w-full px-3 py-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded border border-green-200 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Excel-Export aller Tasks"
        >
          {exportingExcel ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
              Exportiere...
            </>
          ) : (
            <>
              <Download className="h-3 w-3" />
              Excel Export ({tasks.length} Tasks)
            </>
          )}
        </button>
      </div>
    </div>
  );
}