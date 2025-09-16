import { useState, useEffect } from 'react';
import { User, Shield, Mail, Calendar, Search, UserPlus, UserMinus, AlertTriangle } from 'lucide-react';
import { formatDate, getRoleBadgeClass } from '../../../app/admin/services/utils';

const UserRow = ({ user, onRemoveAccess, isRemoving, currentUser }) => {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const canRemove = currentUser?.role === 'admin' && user.id !== currentUser.id;

  const handleRemove = () => {
    onRemoveAccess(user.id);
    setShowRemoveConfirm(false);
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center space-x-4">
        {/* Avatar */}
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center text-white font-medium
          ${user.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'}
        `}>
          {user.initials}
        </div>

        {/* User Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-gray-900">{user.name || user.email}</h4>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
              {user.role}
            </span>
            {user.id === currentUser?.id && (
              <span className="text-xs text-blue-600 font-medium">(Sie)</span>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
            <div className="flex items-center">
              <Mail className="w-3 h-3 mr-1" />
              {user.email}
            </div>
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              Zugriff seit {formatDate(user.access_granted_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {canRemove && (
        <div className="flex items-center space-x-2">
          {!showRemoveConfirm ? (
            <button
              onClick={() => setShowRemoveConfirm(true)}
              className="flex items-center px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Zugriff entfernen"
            >
              <UserMinus className="w-4 h-4 mr-1" />
              Entfernen
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className="flex items-center px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 rounded-md transition-colors"
              >
                {isRemoving ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Entfernen...
                  </>
                ) : (
                  <>
                    <UserMinus className="w-4 h-4 mr-1" />
                    Bestätigen
                  </>
                )}
              </button>
              <button
                onClick={() => setShowRemoveConfirm(false)}
                disabled={isRemoving}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function ProjectUserManager({
  projectId,
  users = [],
  loading = false,
  onAddUser = null,
  onRemoveUser = null,
  currentUser = null,
  refreshUsers = null
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [addingUser, setAddingUser] = useState(null);
  const [removingUser, setRemovingUser] = useState(null);

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Load available users (those without access to this project)
  const loadAvailableUsers = async () => {
    if (!currentUser?.role === 'admin') return;

    setLoadingAvailable(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Filter out users who already have access
          const userEmails = new Set(users.map(u => u.email));
          const available = data.users.filter(u => !userEmails.has(u.email));
          setAvailableUsers(available);
        }
      }
    } catch (error) {
      console.error('Error loading available users:', error);
    } finally {
      setLoadingAvailable(false);
    }
  };

  useEffect(() => {
    if (showAddUser) {
      loadAvailableUsers();
    }
  }, [showAddUser, users]);

  const handleAddUser = async (userId) => {
    setAddingUser(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/project-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });

      if (response.ok) {
        setShowAddUser(false);
        if (refreshUsers) refreshUsers();
        if (onAddUser) onAddUser(userId);
      }
    } catch (error) {
      console.error('Error adding user access:', error);
    } finally {
      setAddingUser(null);
    }
  };

  const handleRemoveUser = async (userId) => {
    setRemovingUser(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/project-access?projectId=${projectId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        if (refreshUsers) refreshUsers();
        if (onRemoveUser) onRemoveUser(userId);
      }
    } catch (error) {
      console.error('Error removing user access:', error);
    } finally {
      setRemovingUser(null);
    }
  };

  const canManageUsers = currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Projekt-Zugriffe</h3>
          <p className="text-sm text-gray-500 mt-1">
            Benutzer mit Zugriff auf dieses Projekt verwalten
          </p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Benutzer hinzufügen
          </button>
        )}
      </div>

      {/* Search */}
      {users.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Benutzer suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Lade Benutzer...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-8">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Keine Benutzer gefunden' : 'Keine Benutzer mit Zugriff'}
          </h4>
          <p className="text-gray-600">
            {searchTerm
              ? 'Versuchen Sie einen anderen Suchbegriff.'
              : 'Fügen Sie Benutzer hinzu, um ihnen Zugriff auf dieses Projekt zu gewähren.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              onRemoveAccess={handleRemoveUser}
              isRemoving={removingUser === user.id}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddUser(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Benutzer hinzufügen
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Wählen Sie einen Benutzer aus, um Zugriff zu gewähren
                  </p>
                </div>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Modal schließen"
                >
                  <span className="sr-only">Schließen</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {loadingAvailable ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <span className="text-gray-600 font-medium">Lade verfügbare Benutzer...</span>
                  <span className="text-sm text-gray-500 mt-1">Bitte warten Sie einen Moment</span>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Keine verfügbaren Benutzer</h4>
                  <p className="text-gray-600 max-w-sm mx-auto">
                    Alle Benutzer haben bereits Zugriff auf dieses Projekt oder es sind keine weiteren Benutzer im System vorhanden.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 mb-4">
                    {availableUsers.length} verfügbare{availableUsers.length === 1 ? 'r' : ''} Benutzer
                  </div>
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="group flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-200 hover:bg-blue-50 transition-all duration-200"
                    >
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center text-white font-medium shadow-sm
                          ${user.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'}
                        `}>
                          {(user.name || user.email).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 truncate">{user.name || user.email}</h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                              {user.role}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>

                      {/* Add Button */}
                      <div className="ml-4 flex-shrink-0">
                        <button
                          onClick={() => handleAddUser(user.id)}
                          disabled={addingUser === user.id}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium text-sm shadow-sm"
                        >
                          {addingUser === user.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Hinzufügen...
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Hinzufügen
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowAddUser(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}