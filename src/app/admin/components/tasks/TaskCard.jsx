import { Globe, Calendar, User } from 'lucide-react';
import { formatDate, truncateUrl, getStatusBadgeClass } from '../../services/utils';

export default function TaskCard({ task, r2Url }) {
  const parseSelectedArea = (selectedArea) => {
    try {
      const area = JSON.parse(selectedArea);
      return `Position: ${Math.round(area.x)}, ${Math.round(area.y)} | Größe: ${Math.round(area.width)}×${Math.round(area.height)}px`;
    } catch {
      return 'Bereich-Info nicht verfügbar';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {task.project_name || `Projekt ${task.project_id}`}
              </span>
              <span className="text-sm text-gray-500">
                #{task.id}
              </span>
              {task.status && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(task.status)}`}>
                  {task.status}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <span title={task.url}>
                  {truncateUrl(task.url)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(task.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Details */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Task Details:
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">{task.title}</h5>
              {task.description && (
                <p className="text-gray-800 whitespace-pre-wrap">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          {/* Screenshot */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Screenshot:
            </h4>
            {task.screenshot ? (
              <div className="bg-gray-50 rounded-lg p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    task.screenshot && !task.screenshot.startsWith('http') && !task.screenshot.startsWith('data:')
                      ? `${r2Url || 'https://pub-cac1d67ee1dc4cb6814dff593983d703.r2.dev/screenshots/'}${task.screenshot}`
                      : task.screenshot
                  }
                  alt="Task Screenshot"
                  className="w-full h-auto rounded border max-h-64 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="text-center text-gray-500 hidden">
                  Screenshot konnte nicht geladen werden
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                Kein Screenshot verfügbar
                {task.selected_area && (
                  <div className="mt-2 text-sm">
                    <strong>Markierter Bereich:</strong>
                    <br />
                    {parseSelectedArea(task.selected_area)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* User Agent Info */}
        {task.user_agent && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span className="font-medium">Browser:</span>
              <span className="truncate">{task.user_agent}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}