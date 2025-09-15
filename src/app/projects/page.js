'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Folder,
  Plus,
  ExternalLink,
  Settings,
  User,
  LogOut,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import Link from 'next/link';
import UserAvatarList from '../../components/shared/users/UserAvatarList';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserAndProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserAndProjects = async () => {
    try {
      // Load current user
      const userResponse = await fetch('/api/auth/me');
      if (!userResponse.ok) {
        router.push('/login');
        return;
      }
      const userData = await userResponse.json();
      setUser(userData.user);

      // Load projects
      const projectsResponse = await fetch('/api/projects');
      const projectsData = await projectsResponse.json();
      
      if (projectsResponse.ok) {
        setProjects(projectsData);
      } else {
        setError(projectsData.error || 'Fehler beim Laden der Projekte');
      }
    } catch {
      setError('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      // Force redirect even if logout fails
      router.push('/login');
    }
  };

  const getStatusColor = (project) => {
    if (!project.tasks || project.tasks.length === 0) {
      return 'bg-gray-100 text-gray-600 border-gray-200';
    }
    
    const openTasks = project.tasks.filter(task => task.status !== 'done').length;
    if (openTasks === 0) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  };

  const getStatusText = (project) => {
    if (!project.tasks || project.tasks.length === 0) {
      return 'Keine Tasks';
    }
    
    const openTasks = project.tasks.filter(task => task.status !== 'done').length;
    const totalTasks = project.tasks.length;
    
    if (openTasks === 0) {
      return `${totalTasks} Tasks erledigt`;
    }
    return `${openTasks} offene Tasks`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Folder className="h-8 w-8 text-blue-600" />
              <h1 className="ml-3 text-xl font-semibold text-gray-900">
                Design Review Tool
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {user?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Admin
                </Link>
              )}
              
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  <User className="h-4 w-4 mr-2" />
                  {user?.name}
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-10">
                    <div className="px-4 py-2 text-sm text-gray-500 border-b">
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-xs">{user?.email}</p>
                      <p className="text-xs capitalize">{user?.role}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Abmelden
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Meine Projekte
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {user?.role === 'admin' 
                ? 'Verwalte alle Projekte und Tasks'
                : 'Projekte zu denen du Zugriff hast'
              }
            </p>
          </div>
          
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Neues Projekt
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Keine Projekte verfügbar
            </h3>
            <p className="text-gray-600">
              {user?.role === 'admin' 
                ? 'Erstelle dein erstes Projekt über das Admin-Panel.'
                : 'Du hast noch keinen Zugriff auf Projekte. Kontaktiere einen Administrator.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {project.domain}
                      </p>
                    </div>
                  </div>

                  {/* User Access Display */}
                  {project.users && project.users.length > 0 && (
                    <div className="mb-4">
                      <UserAvatarList
                        users={project.users}
                        maxVisible={3}
                        size="sm"
                        showCount={false}
                        className="justify-start"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(project)}`}>
                      {project.widget_installed ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {getStatusText(project)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}