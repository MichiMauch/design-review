import { useState, useEffect, useCallback } from 'react';
import { tasksApi, statsApi, projectsApi } from '../services/adminApi';
import { extractUniqueProjects } from '../services/utils';

export function useAdminData() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTasks = useCallback(async () => {
    try {
      const data = await tasksApi.fetchTasks();
      if (data.success) {
        setTasks(data.tasks);
        // Extract unique project IDs from tasks
        const uniqueProjects = extractUniqueProjects(data.tasks);
        setProjects(uniqueProjects);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setError(error.message);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await statsApi.fetchStats();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Stats are optional, don't set error
      // Set default stats to prevent UI issues
      setStats({
        avgPerDay: 0,
        users: { total: 0, admin: 0, user: 0 }
      });
    }
  }, []);

  const loadAllProjects = useCallback(async () => {
    try {
      const projects = await projectsApi.fetchProjects();
      setAllProjects(projects);
    } catch (error) {
      console.error('Error loading projects:', error);
      // Projects are optional, don't set error
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Load tasks first (critical), then others in parallel
    try {
      await loadTasks();
    } catch (error) {
      console.error('Critical error loading tasks:', error);
      setError('Fehler beim Laden der Tasks');
      setLoading(false);
      return;
    }

    // Load non-critical data in parallel
    await Promise.allSettled([
      loadStats(),
      loadAllProjects()
    ]);

    setLoading(false);
  }, [loadTasks, loadStats, loadAllProjects]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    tasks,
    stats,
    projects,
    allProjects,
    loading,
    error,
    refetch: loadData
  };
}