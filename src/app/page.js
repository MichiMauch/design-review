'use client';

import { useState, useEffect } from 'react';
import { Plus, Globe, FolderOpen, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const [projectName, setProjectName] = useState('');
  const [projectDomain, setProjectDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();

  // Check user authentication and role
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.user.role !== 'admin') {
            // Redirect non-admin users to projects page
            router.push('/projects');
            return;
          }
          setUser(userData.user);
        } else {
          // Not authenticated, redirect to login
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
        return;
      } finally {
        setLoadingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const createProject = async () => {
    if (!projectName.trim() || !projectDomain.trim()) {
      alert('Bitte geben Sie sowohl Projektname als auch Domain ein.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName.trim(),
          domain: projectDomain.trim()
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const project = await response.json();
      router.push(`/project/${project.id}`);
    } catch (error) {
      alert('Fehler beim Erstellen des Projekts: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while checking authentication
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Lade...</p>
        </div>
      </div>
    );
  }

  // Only render the page if user is admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Website Review Tool
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            Erstellen Sie ein neues Projekt, um mit dem Feedback-System zu beginnen.
          </p>
          <Link 
            href="/projects"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <FolderOpen className="h-4 w-4" />
            Alle Projekte anzeigen
          </Link>
        </div>

        {/* Project Creation Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Plus className="h-6 w-6 text-blue-600" />
            Neues Projekt erstellen
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projektname
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="z.B. netnode.ch oder kokomo.house"
                disabled={isLoading}
              />
              <p className="text-sm text-gray-600 mt-1">
                Eindeutiger Name für Ihr Projekt
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website Domain
              </label>
              <div className="flex items-center">
                <Globe className="h-5 w-5 text-gray-400 mr-3" />
                <input
                  type="url"
                  value={projectDomain}
                  onChange={(e) => setProjectDomain(e.target.value)}
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://www.ihre-domain.com"
                  disabled={isLoading}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Die Domain auf der das Widget installiert werden soll
              </p>
            </div>

            <button
              onClick={createProject}
              disabled={isLoading || !projectName.trim() || !projectDomain.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Projekt wird erstellt...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Projekt erstellen
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">Was passiert nach der Projekterstellung?</h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              Sie werden zur Projektübersicht weitergeleitet
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              Dort erhalten Sie den Widget-Code zum Einbinden
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              Das System erkennt automatisch, ob das Widget installiert wurde
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              Feedback wird als Tasks in der Projektübersicht angezeigt
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}