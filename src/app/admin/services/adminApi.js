// Admin API Service Layer
// Handles all API calls for admin functionality

const handleResponse = async (response) => {
  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.error || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return data;
};

// Tasks API
export const tasksApi = {
  async fetchTasks() {
    const response = await fetch('/api/admin/tasks');
    return handleResponse(response);
  }
};

// Stats API
export const statsApi = {
  async fetchStats() {
    const response = await fetch('/api/admin/stats');
    return handleResponse(response);
  }
};

// Users API
export const usersApi = {
  async fetchUsers() {
    const response = await fetch('/api/admin/users');
    return handleResponse(response);
  },

  async createUser(userData) {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  async updateUser(userId, userData) {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  async deleteUser(userId) {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};

// Settings API
export const settingsApi = {
  async fetchSettings() {
    const response = await fetch('/api/admin/settings');
    return handleResponse(response);
  },

  async updateSetting(key, value) {
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    return handleResponse(response);
  }
};

// Projects API
export const projectsApi = {
  async fetchProjects() {
    const response = await fetch('/api/projects');
    const projects = await response.json();
    return Array.isArray(projects) ? projects : [];
  },

  async fetchUserProjectAccess(userId) {
    const response = await fetch(`/api/admin/users/${userId}/project-access`);
    return handleResponse(response);
  },

  async addProjectAccess(userId, projectId) {
    const response = await fetch(`/api/admin/users/${userId}/project-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId })
    });
    return handleResponse(response);
  },

  async removeProjectAccess(userId, projectId) {
    const response = await fetch(`/api/admin/users/${userId}/project-access?projectId=${projectId}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};