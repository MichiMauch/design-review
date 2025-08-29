'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Globe, Calendar, User, Eye, UserPlus, Edit2, Trash2, Users, BarChart3, CheckSquare } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'user' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ email: '', name: '', role: 'user' });
  const [activeTab, setActiveTab] = useState('stats');
  const [managingProjectsUser, setManagingProjectsUser] = useState(null);
  const [userProjectAccess, setUserProjectAccess] = useState([]);
  const [loadingProjectAccess, setLoadingProjectAccess] = useState(false);
  const [allProjects, setAllProjects] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadTasks(),
      loadStats(),
      loadUsers(),
      loadAllProjects()
    ]);
  };
  const loadTasks = async () => {
    try {
      const response = await fetch('/api/admin/tasks');
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.tasks);
        
        // Extract unique project IDs from tasks
        const uniqueProjects = [...new Set(data.tasks.map(t => t.project_id.toString()))];
        setProjects(uniqueProjects);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch {
      // Error ignored
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch {
      // Error ignored
    }
  };

  const createUser = async () => {
    if (!newUser.email.trim() || !newUser.name.trim()) {
      alert('E-Mail und Name sind erforderlich');
      return;
    }

    setIsCreatingUser(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      
      const data = await response.json();
      if (data.success) {
        setNewUser({ email: '', name: '', role: 'user' });
        await loadUsers();
        alert('Benutzer erfolgreich erstellt');
      } else {
        alert('Fehler: ' + data.error);
      }
    } catch {
      alert('Fehler beim Erstellen des Benutzers');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const startEditUser = (user) => {
    setEditingUser(user.id);
    setEditUserForm({
      email: user.email,
      name: user.name,
      role: user.role
    });
  };

  const updateUser = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserForm)
      });
      
      const data = await response.json();
      if (data.success) {
        setEditingUser(null);
        await loadUsers();
        alert('Benutzer erfolgreich aktualisiert');
      } else {
        alert('Fehler: ' + data.error);
      }
    } catch {
      alert('Fehler beim Aktualisieren des Benutzers');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        await loadUsers();
        alert('Benutzer erfolgreich gelöscht');
      } else {
        alert('Fehler: ' + data.error);
      }
    } catch {
      alert('Fehler beim Löschen des Benutzers');
    }
  };

  const loadAllProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const projects = await response.json();
      setAllProjects(Array.isArray(projects) ? projects : []);
    } catch {
      // Error ignored
    }
  };

  const loadUserProjectAccess = async (userId) => {
    setLoadingProjectAccess(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/project-access`);
      const data = await response.json();
      if (data.success) {
        setUserProjectAccess(data.projects || []);
      }
    } catch {
      // Error ignored
    } finally {
      setLoadingProjectAccess(false);
    }
  };

  const toggleProjectAccess = async (userId, projectId, hasAccess) => {
    try {
      const method = hasAccess ? 'DELETE' : 'POST';
      const url = hasAccess 
        ? `/api/admin/users/${userId}/project-access?projectId=${projectId}`
        : `/api/admin/users/${userId}/project-access`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ projectId }) : undefined
      });

      const data = await response.json();
      if (data.success) {
        await loadUserProjectAccess(userId);
      } else {
        alert('Fehler: ' + data.error);
      }
    } catch {
      alert('Fehler beim Ändern der Projekt-Zugriffe');
    }
  };

  const openProjectManager = async (user) => {
    setManagingProjectsUser(user);
    await loadUserProjectAccess(user.id);
  };

  const closeProjectManager = () => {
    setManagingProjectsUser(null);
    setUserProjectAccess([]);
  };

  const filteredTasks = tasks.filter(item => {
    if (filter === 'all') return true;
    return item.project_id.toString() === filter;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE');
  };

  const truncateUrl = (url, maxLength = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Feedback Dashboard
            </h1>
            <div className="flex gap-2">
              <Link
                href="/admin"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/admin-review"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Live Review
              </Link>
            </div>
          </div>
          <p className="text-gray-600">
            Übersicht aller eingegangenen Website-Feedbacks
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 flex items-center gap-2 font-medium ${
                activeTab === 'stats'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              Statistiken
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 flex items-center gap-2 font-medium ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-5 w-5" />
              Benutzer
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`px-6 py-3 flex items-center gap-2 font-medium ${
                activeTab === 'feedback'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              Tasks
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'stats' && (
          <div>
            {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Gesamt Tasks
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {tasks.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Projekte
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Heute
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {tasks.filter(t => {
                    const today = new Date().toDateString();
                    const taskDate = new Date(t.created_at).toDateString();
                    return today === taskDate;
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Extended Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CheckSquare className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Durchschn. pro Tag
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.avgPerDay || Math.round(tasks.length / 30)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Globe className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Top Projekt
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {(() => {
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
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <User className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Benutzer
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Diese Woche
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tasks.filter(t => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return new Date(t.created_at) >= weekAgo;
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Stats Table */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">Projekt Übersicht</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projekt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Anzahl
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Letzter Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Screenshots
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allProjects
                  .map(project => {
                    // Find tasks for this project by matching project_id with project.id
                    const projectTasks = tasks.filter(t => t.project_id === project.id);
                    return { ...project, taskCount: projectTasks.length, projectTasks };
                  })
                  .sort((a, b) => b.taskCount - a.taskCount)
                  .map(project => {
                  const withScreenshots = project.projectTasks.filter(t => t.screenshot || t.screenshot_url).length;
                  const latest = project.projectTasks.length > 0 
                    ? project.projectTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
                    : null;
                  
                  return (
                    <tr key={project.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{project.name}</div>
                        <div className="text-sm text-gray-500">{project.domain}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{project.taskCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {latest ? formatDate(latest.created_at) : 'Keine Tasks'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {project.taskCount > 0 ? `${withScreenshots}/${project.taskCount}` : '0/0'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {/* Create New User */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Neuen Benutzer erstellen</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="email"
                  placeholder="E-Mail Adresse"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="mt-4">
                <button
                  onClick={createUser}
                  disabled={isCreatingUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingUser ? 'Erstelle...' : 'Benutzer erstellen'}
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Benutzer Verwaltung</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        E-Mail
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rolle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Projekte
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Erstellt
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser === user.id ? (
                            <input
                              type="text"
                              value={editUserForm.name}
                              onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          ) : (
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser === user.id ? (
                            <input
                              type="email"
                              value={editUserForm.email}
                              onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                          ) : (
                            <div className="text-sm text-gray-900">{user.email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser === user.id ? (
                            <select
                              value={editUserForm.role}
                              onChange={(e) => setEditUserForm({...editUserForm, role: e.target.value})}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {user.role}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openProjectManager(user)}
                            className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full text-gray-700 flex items-center gap-1"
                          >
                            <Users className="h-3 w-3" />
                            Verwalten
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.created_at ? formatDate(user.created_at) : 'Unbekannt'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {editingUser === user.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateUser(user.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                <CheckSquare className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingUser(null)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditUser(user)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'feedback' && (
          <div>
            {/* Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Projekt filtern:
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Alle Projekte</option>
              {projects.map(project => (
                <option key={project} value={project}>
                  {(() => {
                    // Try to find real project name for better display
                    const realProject = allProjects.find(p => 
                      p.name === project || 
                      p.id.toString() === project ||
                      p.domain.includes(project)
                    );
                    return realProject ? `${realProject.name} (${project})` : project;
                  })()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-6">
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Tasks
              </h3>
              <p className="text-gray-600">
                Sobald Tasks erstellt werden, erscheinen sie hier.
              </p>
            </div>
          ) : (
            filteredTasks.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.project_name || `Projekt ${item.project_id}`}
                        </span>
                        <span className="text-sm text-gray-500">
                          #{item.id}
                        </span>
                        {item.status && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'open' ? 'bg-green-100 text-green-800' : 
                            item.status === 'closed' ? 'bg-gray-100 text-gray-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          <span title={item.url}>
                            {truncateUrl(item.url)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Task Details */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Task Details:
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">{item.title}</h5>
                        {item.description && (
                          <p className="text-gray-800 whitespace-pre-wrap">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Screenshot */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Screenshot:
                      </h4>
                      {(item.screenshot || item.screenshot_url) ? (
                        <div className="bg-gray-50 rounded-lg p-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.screenshot_url || item.screenshot}
                            alt="Task Screenshot"
                            className="w-full h-auto rounded border max-h-64 object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div className="text-center text-gray-500 hidden">
                            Screenshot konnte nicht geladen werden
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                          Kein Screenshot verfügbar
                          {item.selected_area && (
                            <div className="mt-2 text-sm">
                              <strong>Markierter Bereich:</strong>
                              <br />
                              {(() => {
                                try {
                                  const area = JSON.parse(item.selected_area);
                                  return `Position: ${Math.round(area.x)}, ${Math.round(area.y)} | Größe: ${Math.round(area.width)}×${Math.round(area.height)}px`;
                                } catch {
                                  return 'Bereich-Info nicht verfügbar';
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User Agent Info */}
                  {item.user_agent && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Browser:</span>
                        <span className="truncate">{item.user_agent}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
            </div>
          </div>
        )}

        {/* Project Access Management Modal */}
        {managingProjectsUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden">
              <div className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Projekt-Zugriffe verwalten - {managingProjectsUser.name}
                  </h3>
                  <button
                    onClick={closeProjectManager}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Schließen</span>
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-80">
                {loadingProjectAccess ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userProjectAccess.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        Keine Projekte verfügbar
                      </p>
                    ) : (
                      userProjectAccess.map(project => (
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
                              onChange={() => toggleProjectAccess(
                                managingProjectsUser.id,
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
                  onClick={closeProjectManager}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Fertig
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}