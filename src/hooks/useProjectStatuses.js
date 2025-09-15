import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing project statuses
 * Handles loading, caching, and CRUD operations for project-specific statuses
 */
export function useProjectStatuses(projectId) {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load statuses from API
  const loadStatuses = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/statuses`);
      if (!response.ok) {
        throw new Error('Failed to load statuses');
      }

      const data = await response.json();
      setStatuses(data.statuses || []);
    } catch (err) {
      console.error('Error loading statuses:', err);
      setError(err.message);
      // Set default statuses as fallback
      setStatuses([
        { id: 1, value: 'open', label: 'Offen', color: 'bg-red-100 text-red-800 border-red-200', sort_order: 1 },
        { id: 2, value: 'in_progress', label: 'In Bearbeitung', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', sort_order: 2 },
        { id: 3, value: 'done', label: 'Erledigt', color: 'bg-green-100 text-green-800 border-green-200', sort_order: 3 }
      ]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Create new status
  const createStatus = useCallback(async (statusData) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/statuses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create status');
      }

      const data = await response.json();
      setStatuses(prev => [...prev, data.status].sort((a, b) => a.sort_order - b.sort_order));
      return { success: true, status: data.status };
    } catch (err) {
      console.error('Error creating status:', err);
      return { success: false, error: err.message };
    }
  }, [projectId]);

  // Update existing status
  const updateStatus = useCallback(async (statusId, updateData) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/statuses/${statusId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      // Update local state
      setStatuses(prev => prev.map(status =>
        status.id === statusId
          ? { ...status, ...updateData }
          : status
      ));

      return { success: true };
    } catch (err) {
      console.error('Error updating status:', err);
      return { success: false, error: err.message };
    }
  }, [projectId]);

  // Delete status
  const deleteStatus = useCallback(async (statusId) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/statuses/${statusId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete status');
      }

      // Remove from local state
      setStatuses(prev => prev.filter(status => status.id !== statusId));
      return { success: true };
    } catch (err) {
      console.error('Error deleting status:', err);
      return { success: false, error: err.message };
    }
  }, [projectId]);

  // Reorder statuses
  const reorderStatuses = useCallback(async (newOrder) => {
    // Optimistically update UI
    const reorderedStatuses = newOrder.map((statusId, index) => {
      const status = statuses.find(s => s.id === statusId);
      return { ...status, sort_order: index + 1 };
    });
    setStatuses(reorderedStatuses);

    try {
      const response = await fetch(`/api/projects/${projectId}/statuses/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusOrder: newOrder })
      });

      if (!response.ok) {
        // Revert on error
        await loadStatuses();
        throw new Error('Failed to reorder statuses');
      }

      return { success: true };
    } catch (err) {
      console.error('Error reordering statuses:', err);
      return { success: false, error: err.message };
    }
  }, [projectId, statuses, loadStatuses]);

  // Get status info by value
  const getStatusInfo = useCallback((statusValue) => {
    const status = statuses.find(s => s.value === statusValue);
    if (status) return status;

    // Fallback to default 'open' status
    return {
      value: 'open',
      label: 'Offen',
      color: 'bg-red-100 text-red-800 border-red-200'
    };
  }, [statuses]);

  // Check if project needs migration
  const checkMigrationStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/statuses/migrate`);
      if (!response.ok) {
        throw new Error('Failed to check migration status');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error checking migration status:', err);
      return null;
    }
  }, [projectId]);

  // Migrate project to use custom statuses
  const migrateProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/statuses/migrate`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to migrate project');
      }

      const data = await response.json();
      if (data.migrated) {
        await loadStatuses(); // Reload statuses after migration
      }
      return data;
    } catch (err) {
      console.error('Error migrating project:', err);
      return { migrated: false, error: err.message };
    }
  }, [projectId, loadStatuses]);

  // Load statuses on mount and when projectId changes
  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  return {
    statuses,
    loading,
    error,
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
    getStatusInfo,
    checkMigrationStatus,
    migrateProject,
    reload: loadStatuses
  };
}