'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import ErrorPageTester from '../../../../components/ErrorPageTester';
import UrlSelector from '../../../../components/shared/UrlSelector';
import AnalysisNavigation from '../../../../components/shared/AnalysisNavigation';

export default function ProjectErrorPagesPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentAnalysisUrl, setCurrentAnalysisUrl] = useState(null);

  const checkAuthentication = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
          // Check if user has access to this project
          const hasAccess = data.user.role === 'admin' || data.user.projectAccess.includes(parseInt(params.id));
          if (!hasAccess) {
            router.push('/projects');
            return;
          }
        } else {
          router.push('/login');
          return;
        }
      } else {
        router.push('/login');
        return;
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      router.push('/login');
      return;
    } finally {
      setAuthChecked(true);
    }
  }, [router, params.id]);

  const loadProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      if (response.ok) {
        const projectData = await response.json();
        setProject(projectData);

        // Set initial analysis URL
        const initialUrl = projectData.domain ?
          (projectData.domain.startsWith('http') ?
            projectData.domain :
            `https://${projectData.domain}`) :
          null;
        setCurrentAnalysisUrl(initialUrl);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    checkAuthentication();
    loadProject();
  }, [checkAuthentication, loadProject]);

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Lade Error-Seiten Analyse...</div>
      </div>
    );
  }

  // Don't render anything if user doesn't exist (will redirect to login)
  if (!user) {
    return null;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Projekt nicht gefunden</h1>
          <button
            onClick={() => router.push('/projects')}
            className="text-blue-600 hover:text-blue-700"
          >
            Zurück zur Projektübersicht
          </button>
        </div>
      </div>
    );
  }

  const handleUrlChange = (url) => {
    setCurrentAnalysisUrl(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/project/${params.id}`)}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Zurück zum Projekt
          </button>

          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Error-Seiten Analyse
              </h1>
              {project && (
                <p className="text-gray-600">{project.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Analysis Navigation */}
        <AnalysisNavigation
          projectId={params.id}
          className="mb-6"
        />

        {/* URL Selector */}
        <UrlSelector
          projectId={params.id}
          projectDomain={project?.domain}
          onUrlChange={handleUrlChange}
          className="mb-6"
        />

        {/* Error Pages Analysis Content */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Error-Seiten Tester
            </h2>
            <p className="text-sm text-gray-600">
              Testen Sie die Error-Seiten der Website und prüfen Sie, wie verschiedene HTTP-Fehler dargestellt werden.
            </p>
          </div>

          <ErrorPageTester
            projectUrl={currentAnalysisUrl}
            key={currentAnalysisUrl}  // Force re-render when URL changes
          />
        </div>

        {/* Information Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            Über Error-Seiten Analyse
          </h3>
          <div className="space-y-3 text-sm text-blue-800">
            <p>
              <strong>404 - Not Found:</strong> Testen Sie, wie die Website auf nicht-existierende Seiten reagiert.
            </p>
            <p>
              <strong>403 - Forbidden:</strong> Prüfen Sie den Zugriff auf geschützte Bereiche wie /admin.
            </p>
            <p>
              <strong>500 - Server Error:</strong> Simulieren Sie Server-Fehler und deren Darstellung.
            </p>
            <p>
              <strong>401 - Unauthorized:</strong> Testen Sie Authentifizierungs-Fehlerseiten.
            </p>
            <p>
              <strong>Custom Pfade:</strong> Geben Sie spezifische URLs ein, um benutzerdefinierte Error-Seiten zu testen.
            </p>
            <p>
              <strong>CORS-Fallback:</strong> Falls iframe-Einbettung blockiert wird, öffnen Sie die Seiten in einem neuen Tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}