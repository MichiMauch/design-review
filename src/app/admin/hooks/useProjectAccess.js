import { useState, useCallback } from 'react';
import { projectsApi } from '../services/adminApi';
import toast from 'react-hot-toast';

export function useProjectAccess() {
  const [managingProjectsUser, setManagingProjectsUser] = useState(null);
  const [userProjectAccess, setUserProjectAccess] = useState([]);
  const [loadingProjectAccess, setLoadingProjectAccess] = useState(false);

  const loadUserProjectAccess = useCallback(async (userId) => {
    setLoadingProjectAccess(true);
    try {
      const data = await projectsApi.fetchUserProjectAccess(userId);
      if (data.success) {
        setUserProjectAccess(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading project access:', error);
      toast.error('Fehler beim Laden der Projekt-Zugriffe');
    } finally {
      setLoadingProjectAccess(false);
    }
  }, []);

  const toggleProjectAccess = useCallback(async (userId, projectId, hasAccess) => {
    try {
      if (hasAccess) {
        await projectsApi.removeProjectAccess(userId, projectId);
      } else {
        await projectsApi.addProjectAccess(userId, projectId);
      }

      await loadUserProjectAccess(userId);
      toast.success('Projekt-Zugriff erfolgreich geändert');
      return true;
    } catch (error) {
      toast.error(`Fehler: ${error.message}`);
      return false;
    }
  }, [loadUserProjectAccess]);

  const openProjectManager = useCallback(async (user) => {
    setManagingProjectsUser(user);
    await loadUserProjectAccess(user.id);
  }, [loadUserProjectAccess]);

  const closeProjectManager = useCallback(() => {
    setManagingProjectsUser(null);
    setUserProjectAccess([]);
  }, []);

  return {
    managingProjectsUser,
    userProjectAccess,
    loadingProjectAccess,
    toggleProjectAccess,
    openProjectManager,
    closeProjectManager
  };
}