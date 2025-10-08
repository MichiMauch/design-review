'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Settings,
  Globe,
  Calendar,
  Brain,
  RefreshCw,
  BarChart3,
  Zap,
  Shield,
  MoreVertical,
  Download,
  Users,
  Search,
  Image,
  Cookie,
  ChevronDown,
  LineChart
} from 'lucide-react';
import { formatTime } from '../../utils/projectUtils';

export default function ProjectHeader({
  project,
  combinedJiraConfig,
  jiraConfig,
  onExcelExport,
  exportingExcel
}) {
  const [aiStatus, setAiStatus] = useState({
    configured: false,
    available: false,
    loading: true
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [analysisDropdownOpen, setAnalysisDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const analysisDropdownRef = useRef(null);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (analysisDropdownRef.current && !analysisDropdownRef.current.contains(event.target)) {
        setAnalysisDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExcelExport = () => {
    if (onExcelExport) {
      onExcelExport();
    }
    setDropdownOpen(false);
  };

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

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Analysis Tools Dropdown */}
                <div className="relative" ref={analysisDropdownRef}>
                  <button
                    onClick={() => setAnalysisDropdownOpen(!analysisDropdownOpen)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
                    title="Website Analysen"
                  >
                    <LineChart className="h-4 w-4" />
                    Analysen
                    <ChevronDown className={`h-3 w-3 transition-transform ${analysisDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {analysisDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <Link
                          href={`/project/${project.id}/seo-analysis`}
                          onClick={() => setAnalysisDropdownOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors group"
                        >
                          <Search className="h-4 w-4 text-green-600" />
                          <div className="flex-1">
                            <div className="font-medium">SEO & Content</div>
                            <div className="text-xs text-gray-500 group-hover:text-green-600">Suchmaschinen-Optimierung</div>
                          </div>
                        </Link>

                        <Link
                          href={`/project/${project.id}/meta-analysis`}
                          onClick={() => setAnalysisDropdownOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
                        >
                          <Globe className="h-4 w-4 text-blue-600" />
                          <div className="flex-1">
                            <div className="font-medium">Meta-Tags & Icons</div>
                            <div className="text-xs text-gray-500 group-hover:text-blue-600">Social Media Previews</div>
                          </div>
                        </Link>

                        <Link
                          href={`/project/${project.id}/analytics`}
                          onClick={() => setAnalysisDropdownOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors group"
                        >
                          <BarChart3 className="h-4 w-4 text-purple-600" />
                          <div className="flex-1">
                            <div className="font-medium">Analytics & Tracking</div>
                            <div className="text-xs text-gray-500 group-hover:text-purple-600">Tracking-Tools Analyse</div>
                          </div>
                        </Link>

                        <Link
                          href={`/project/${project.id}/performance`}
                          onClick={() => setAnalysisDropdownOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 transition-colors group"
                        >
                          <Zap className="h-4 w-4 text-yellow-600" />
                          <div className="flex-1">
                            <div className="font-medium">Performance</div>
                            <div className="text-xs text-gray-500 group-hover:text-yellow-600">Ladezeiten & Optimierung</div>
                          </div>
                        </Link>

                        <div className="border-t border-gray-100 my-1"></div>

                        <Link
                          href={`/project/${project.id}/security`}
                          onClick={() => setAnalysisDropdownOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors group"
                        >
                          <Shield className="h-4 w-4 text-red-600" />
                          <div className="flex-1">
                            <div className="font-medium">Security</div>
                            <div className="text-xs text-gray-500 group-hover:text-red-600">Sicherheits-Analyse</div>
                          </div>
                        </Link>

                        <Link
                          href={`/project/${project.id}/media-analysis`}
                          onClick={() => setAnalysisDropdownOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors group"
                        >
                          <Image className="h-4 w-4 text-violet-600" />
                          <div className="flex-1">
                            <div className="font-medium">Media & Resources</div>
                            <div className="text-xs text-gray-500 group-hover:text-violet-600">Bilder & Dateien</div>
                          </div>
                        </Link>

                        <Link
                          href={`/project/${project.id}/privacy-analysis`}
                          onClick={() => setAnalysisDropdownOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors group"
                        >
                          <Cookie className="h-4 w-4 text-orange-600" />
                          <div className="flex-1">
                            <div className="font-medium">Cookie & Privacy</div>
                            <div className="text-xs text-gray-500 group-hover:text-orange-600">Datenschutz & Compliance</div>
                          </div>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* More Actions Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300 hover:border-gray-400"
                    title="Weitere Aktionen"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <button
                          onClick={handleExcelExport}
                          disabled={exportingExcel}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          {exportingExcel ? 'Exportiere...' : 'Als Excel exportieren'}
                        </button>

                        <div className="border-t border-gray-100 my-1"></div>

                        <Link
                          href={`/project/${project.id}/settings`}
                          onClick={() => setDropdownOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          Einstellungen
                        </Link>

                        <Link
                          href={`/project/${project.id}/settings#users`}
                          onClick={() => setDropdownOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Users className="h-4 w-4" />
                          User
                        </Link>

                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <div className="px-4 py-2 text-xs text-gray-500">
                            Weitere Aktionen folgen...
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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