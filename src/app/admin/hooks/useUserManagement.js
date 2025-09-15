import { useState, useCallback } from 'react';
import { usersApi } from '../services/adminApi';
import toast from 'react-hot-toast';

export function useUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProjects, setUserProjects] = useState([]);
  const [loadingUserProjects, setLoadingUserProjects] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usersApi.fetchUsers();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (newUser) => {
    if (!newUser.email.trim() || !newUser.name.trim()) {
      toast.error('E-Mail und Name sind erforderlich');
      return false;
    }

    setIsCreatingUser(true);
    try {
      const data = await usersApi.createUser(newUser);
      if (data.success) {
        toast.success('Benutzer erfolgreich erstellt!');
        await loadUsers();
        return true;
      }
    } catch (error) {
      toast.error(`Fehler: ${error.message}`);
      return false;
    } finally {
      setIsCreatingUser(false);
    }
  }, [loadUsers]);

  const openUserDetail = useCallback(async (user) => {
    setSelectedUser(user);
    setLoadingUserProjects(true);

    try {
      const data = await usersApi.getUserProjects(user.id);
      if (data.success) {
        setUserProjects(data.projects);
      }
    } catch (error) {
      console.error('Error loading user projects:', error);
      toast.error('Fehler beim Laden der Projekt-Zugriffe');
    } finally {
      setLoadingUserProjects(false);
    }
  }, []);

  const closeUserDetail = useCallback(() => {
    setSelectedUser(null);
    setUserProjects([]);
  }, []);

  const updateUser = useCallback(async (userId, formData) => {
    setUpdating(true);
    try {
      const data = await usersApi.updateUser(userId, formData);
      if (data.success) {
        toast.success('Benutzer erfolgreich aktualisiert!');
        await loadUsers();

        if (selectedUser) {
          setSelectedUser({ ...selectedUser, ...formData });
        }
        return true;
      }
    } catch (error) {
      toast.error(`Fehler: ${error.message}`);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [loadUsers, selectedUser]);

  const toggleProjectAccess = useCallback(async (userId, projectId, hasAccess) => {
    try {
      const data = await usersApi.toggleProjectAccess(userId, projectId, !hasAccess);
      if (data.success) {
        setUserProjects(prev =>
          prev.map(project =>
            project.id === projectId
              ? { ...project, has_access: hasAccess ? 0 : 1 }
              : project
          )
        );
        toast.success('Projekt-Zugriff erfolgreich aktualisiert!');
        return true;
      }
    } catch (error) {
      toast.error(`Fehler: ${error.message}`);
      return false;
    }
  }, []);

  const deleteUser = useCallback(async (userId) => {
    setDeleting(true);
    try {
      const data = await usersApi.deleteUser(userId);
      if (data.success) {
        toast.success('Benutzer erfolgreich gelöscht!');
        await loadUsers();
        setSelectedUser(null);
        return true;
      }
    } catch (error) {
      toast.error(`Fehler: ${error.message}`);
      return false;
    } finally {
      setDeleting(false);
    }
  }, [loadUsers]);

  return {
    users,
    loading,
    isCreatingUser,
    selectedUser,
    userProjects,
    loadingUserProjects,
    updating,
    deleting,
    loadUsers,
    createUser,
    openUserDetail,
    closeUserDetail,
    updateUser,
    toggleProjectAccess,
    deleteUser
  };
}