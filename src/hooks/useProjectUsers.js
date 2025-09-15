import { useState, useCallback, useEffect } from 'react';

export function useProjectUsers(projectId) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadUsers = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/users`);
      const data = await response.json();

      if (response.ok && data.success) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Fehler beim Laden der Benutzer');
      }
    } catch (err) {
      console.error('Error loading project users:', err);
      setError('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load users when projectId changes
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const refreshUsers = useCallback(() => {
    loadUsers();
  }, [loadUsers]);

  const addUser = useCallback(async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/project-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });

      if (response.ok) {
        // Reload users to get the updated list
        await loadUsers();
        return true;
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Hinzufügen des Benutzers');
      }
    } catch (err) {
      console.error('Error adding user access:', err);
      setError(err.message);
      return false;
    }
  }, [projectId, loadUsers]);

  const removeUser = useCallback(async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/project-access?projectId=${projectId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Reload users to get the updated list
        await loadUsers();
        return true;
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Entfernen des Benutzers');
      }
    } catch (err) {
      console.error('Error removing user access:', err);
      setError(err.message);
      return false;
    }
  }, [projectId, loadUsers]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    users,
    loading,
    error,
    refreshUsers,
    addUser,
    removeUser,
    clearError
  };
}