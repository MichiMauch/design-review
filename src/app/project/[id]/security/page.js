'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import SecurityAnalysis from '../../../../components/SecurityAnalysis';
import UrlSelector from '../../../../components/shared/UrlSelector';
import AnalysisNavigation from '../../../../components/shared/AnalysisNavigation';

export default function ProjectSecurityPage() {
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
  }, [params.id, router]);

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
    loadProject();
    checkAuthentication();
  }, [loadProject, checkAuthentication]);

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Lade Security-Analyse...</div>
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
            <Shield className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Security Analyse
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

        {/* Security Analysis Content */}
        <div className="bg-white shadow rounded-lg p-6">
          <SecurityAnalysis
            projectId={params.id}
            projectUrl={currentAnalysisUrl}
            showHeader={false}
            key={currentAnalysisUrl}  // Force re-render when URL changes
          />
        </div>
      </div>
    </div>
  );
}