// Utility functions for admin panel

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('de-DE');
};

export const truncateUrl = (url, maxLength = 50) => {
  if (!url) return '';
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
};

export const getTasksForToday = (tasks) => {
  const today = new Date().toDateString();
  return tasks.filter(t => {
    const taskDate = new Date(t.created_at).toDateString();
    return today === taskDate;
  });
};

export const getTasksForWeek = (tasks) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return tasks.filter(t => new Date(t.created_at) >= weekAgo);
};

export const getTopProject = (tasks, allProjects) => {
  if (tasks.length === 0 || allProjects.length === 0) return 'Keine Daten';

  // Count tasks per project_id
  const projectCounts = {};
  tasks.forEach(t => {
    const projectId = t.project_id.toString();
    projectCounts[projectId] = (projectCounts[projectId] || 0) + 1;
  });

  // Find project_id with most tasks
  const topProjectId = Object.keys(projectCounts).reduce((top, current) =>
    projectCounts[current] > (projectCounts[top] || 0) ? current : top
  );

  // Find real project name by matching project_id with project.id
  const topProject = allProjects.find(p => p.id.toString() === topProjectId);

  return topProject ? topProject.name : `Projekt ${topProjectId}`;
};

export const extractUniqueProjects = (tasks) => {
  return [...new Set(tasks.map(t => t.project_id.toString()))];
};

export const getRoleBadgeClass = (role) => {
  return role === 'admin'
    ? 'bg-purple-100 text-purple-800'
    : 'bg-green-100 text-green-800';
};

export const getProjectBadgeClass = (index) => {
  const classes = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800',
    'bg-orange-100 text-orange-800'
  ];
  return classes[index % 4];
};

export const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'open':
      return 'bg-green-100 text-green-800';
    case 'closed':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
};