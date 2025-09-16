'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Settings,
  Globe,
  Calendar,
  Brain,
  RefreshCw
} from 'lucide-react';
import { formatTime } from '../../utils/projectUtils';

export default function ProjectHeader({
  project,
  combinedJiraConfig,
  jiraConfig
}) {
  const [aiStatus, setAiStatus] = useState({
    configured: false,
    available: false,
    loading: true
  });

  const checkAIConfiguration = async () => {
    setAiStatus(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetch('/api/ai/status');
      const result = await response.json();

      setAiStatus({
        configured: result.configured,
        available: result.available,
        loading: false
      });
    } catch {
      setAiStatus({
        configured: false,
        available: false,
        loading: false
      });
    }
  };

  useEffect(() => {
    checkAIConfiguration();
  }, []);

  if (!project) return null;

  return (
    <div className="mb-8">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Projektübersicht
      </Link>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>

                {/* Status Badges */}
                <div className="flex items-center gap-2">
                  {/* Widget Status Badge */}
                  <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-sm font-medium ${
                    project.widget_installed
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}>
                    {project.widget_installed ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Widget aktiv
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        Widget ausstehend
                      </>
                    )}
                  </div>

                  {/* AI Badge */}
                  <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-sm font-medium ${
                    aiStatus.available
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : aiStatus.configured
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {aiStatus.available ? (
                      <>
                        <Brain className="h-4 w-4" />
                        AI Online
                      </>
                    ) : aiStatus.configured ? (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        AI Offline
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        AI nicht konfiguriert
                      </>
                    )}
                    <button
                      onClick={checkAIConfiguration}
                      className="p-0.5 text-current hover:opacity-70"
                      title="AI-Status aktualisieren"
                    >
                      <RefreshCw className={`w-3 h-3 ${aiStatus.loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* JIRA Status Badge */}
                  <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-sm font-medium ${
                    combinedJiraConfig?.serverUrl && combinedJiraConfig?.username && combinedJiraConfig?.apiToken && jiraConfig.projectKey
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {combinedJiraConfig?.serverUrl && combinedJiraConfig?.username && combinedJiraConfig?.apiToken && jiraConfig.projectKey ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        JIRA aktiv
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        JIRA nicht konfiguriert
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Settings Button */}
              <Link
                href={`/project/${project.id}/settings`}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded-lg transition-colors border border-gray-300 hover:border-blue-400"
                title="Projekt-Einstellungen"
              >
                <Settings className="h-4 w-4" />
                Einstellungen
              </Link>
            </div>

            <div className="flex items-center gap-6 text-gray-600">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <a
                  href={project.domain.startsWith('http') ? project.domain : `https://${project.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  {project.domain}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  Erstellt {formatTime(project.created_at)}
                </span>
              </div>
              {project.widget_last_ping && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm">
                    Letzter Ping: {formatTime(project.widget_last_ping)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}