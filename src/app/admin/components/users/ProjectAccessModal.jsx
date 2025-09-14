import LoadingSpinner from '../shared/LoadingSpinner';

export default function ProjectAccessModal({
  user,
  projects,
  loading,
  onToggleAccess,
  onClose
}) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Projekt-Zugriffe verwalten - {user.name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Schließen</span>
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-80">
          {loading ? (
            <LoadingSpinner fullScreen={false} />
          ) : (
            <div className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Keine Projekte verfügbar
                </p>
              ) : (
                projects.map(project => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {project.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {project.domain}
                      </p>
                    </div>

                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={project.has_access === 1}
                        onChange={() => onToggleAccess(
                          user.id,
                          project.id,
                          project.has_access === 1
                        )}
                        className="sr-only"
                      />
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        project.has_access === 1 ? 'bg-blue-600' : 'bg-gray-200'
                      }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          project.has_access === 1 ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {project.has_access === 1 ? 'Zugriff' : 'Kein Zugriff'}
                      </span>
                    </label>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}