import { useState, useEffect } from 'react';
import { X, User, FolderOpen, Trash2, Save, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { getRoleBadgeClass, formatDate } from '../../services/utils';

export default function UserDetailModal({
  user,
  projects,
  loadingProjects,
  onUpdateUser,
  onToggleProjectAccess,
  onDeleteUser,
  onClose,
  updating,
  deleting
}) {
  const [activeTab, setActiveTab] = useState('info');
  const [editForm, setEditForm] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name,
        email: user.email,
        role: user.role
      });
    }
  }, [user]);

  if (!user) return null;

  const handleSave = () => {
    onUpdateUser(user.id, editForm);
  };

  const handleDelete = () => {
    onDeleteUser(user.id);
    setShowDeleteConfirm(false);
  };

  const tabs = [
    { id: 'info', label: 'Benutzer Info', icon: User },
    { id: 'projects', label: 'Projekte', icon: FolderOpen },
    { id: 'danger', label: 'Löschen', icon: Trash2 }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Benutzer verwalten
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {user.name} ({user.email})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Vollständiger Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-Mail
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rolle
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Aktuelle Informationen</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Aktuelle Rolle:</span>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Erstellt am:</span>
                    <div className="mt-1 text-gray-900">
                      {user.created_at ? formatDate(user.created_at) : 'Unbekannt'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div>
              {loadingProjects ? (
                <LoadingSpinner fullScreen={false} />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-gray-900">
                      Projekt-Zugriffe
                    </h4>
                    <span className="text-sm text-gray-500">
                      {projects.filter(p => p.has_access === 1).length} von {projects.length} Projekten
                    </span>
                  </div>

                  {projects.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Keine Projekte verfügbar
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {projects.map(project => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">
                              {project.name}
                            </h5>
                            <p className="text-sm text-gray-500">
                              {project.domain}
                            </p>
                          </div>

                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={project.has_access === 1}
                              onChange={() => onToggleProjectAccess(
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
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800">
                      Benutzer löschen
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      Das Löschen eines Benutzers kann nicht rückgängig gemacht werden.
                      Alle Daten und Zugriffe gehen verloren.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  Benutzer-Informationen
                </h5>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Name:</span> {user.name}</div>
                  <div><span className="text-gray-500">E-Mail:</span> {user.email}</div>
                  <div><span className="text-gray-500">Rolle:</span> {user.role}</div>
                  <div>
                    <span className="text-gray-500">Projekte:</span> {' '}
                    {projects.filter(p => p.has_access === 1).length} zugewiesene Projekte
                  </div>
                </div>
              </div>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  Benutzer löschen
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 font-medium">
                    Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg"
                    >
                      {deleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Lösche...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Ja, löschen
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'info' && (
          <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
            <button
              onClick={handleSave}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg"
            >
              {updating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Speichere...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Speichern
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
            >
              Schließen
            </button>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Fertig
            </button>
          </div>
        )}
      </div>
    </div>
  );
}