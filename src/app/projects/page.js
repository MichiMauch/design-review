'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle,
  Globe,
  Calendar,
  ExternalLink
} from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProjectStats = (project) => {
    return {
      totalTasks: project.tasks?.length || 0,
      openTasks: project.tasks?.filter(t => !t.jira_key && t.status === 'open').length || 0,
      jiraTasks: project.tasks?.filter(t => t.jira_key).length || 0
    };
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Gerade eben';
    } else if (diffMins < 60) {
      return `vor ${diffMins} Min`;
    } else if (diffHours < 24) {
      return `vor ${diffHours} Std`;
    } else if (diffDays < 7) {
      return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    } else {
      // For older dates, show in German timezone
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Berlin'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück zur Startseite
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Alle Projekte</h1>
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Neues Projekt
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Noch keine Projekte</h2>
            <p className="text-gray-600 mb-6">
              Erstellen Sie Ihr erstes Projekt, um mit dem Feedback-Management zu beginnen.
            </p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Erstes Projekt erstellen
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const stats = getProjectStats(project);
              return (
                <div key={project.id} className="bg-white rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                  <div className="p-6">
                    {/* Project Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <Link href={`/project/${project.id}`}>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-blue-600 cursor-pointer">
                            {project.name}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Globe className="h-4 w-4" />
                          <a 
                            href={project.domain.startsWith('http') ? project.domain : `https://${project.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {project.domain}
                          </a>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        project.widget_installed 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {project.widget_installed ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Installiert
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3" />
                            Nicht installiert
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{stats.totalTasks}</div>
                        <div className="text-xs text-gray-600">Gesamt</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.openTasks}</div>
                        <div className="text-xs text-gray-600">Offen</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.jiraTasks}</div>
                        <div className="text-xs text-gray-600">JIRA</div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {formatTime(project.created_at)}
                      </div>
                      <Link 
                        href={`/project/${project.id}`}
                        className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:text-blue-800"
                      >
                        Öffnen
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}