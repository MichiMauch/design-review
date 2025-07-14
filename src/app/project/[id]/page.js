'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getScreenshotUrl } from '../../../lib/cloudflare-r2';
import { 
  Copy, 
  CheckCircle, 
  ExternalLink, 
  Code, 
  MessageSquare, 
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Globe,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const snippetCode = project ? 
    `<script src="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/widget.js" data-project-id="${project.name}" defer></script>` :
    '';

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      if (!response.ok) {
        throw new Error('Project not found');
      }
      const projectData = await response.json();
      setProject(projectData);
    } catch (error) {
      console.error('Error loading project:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/tasks`);
      if (response.ok) {
        const tasksData = await response.json();
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const checkWidgetStatus = async () => {
    if (!project) return;
    
    try {
      const response = await fetch(`/api/projects/${params.id}/widget-status`);
      if (response.ok) {
        const status = await response.json();
        setProject(prev => ({
          ...prev,
          widget_installed: status.installed,
          widget_last_ping: status.last_ping
        }));
      }
    } catch (error) {
      console.error('Error checking widget status:', error);
    }
  };

  useEffect(() => {
    loadProject();
    loadTasks();

    // Check widget installation status immediately and then every 10 seconds
    checkWidgetStatus();
    const interval = setInterval(checkWidgetStatus, 10000);
    return () => clearInterval(interval);
  }, [params.id]);

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippetCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Projekt nicht gefunden</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Startseite
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-gray-600">
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">{project.domain}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    Erstellt am {new Date(project.created_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Widget Status */}
            <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              project.widget_installed 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {project.widget_installed ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Widget installiert
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  Widget nicht installiert
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Widget Installation */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Code className="h-5 w-5 text-blue-600" />
                Widget Installation
              </h2>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between gap-4">
                  <code className="text-sm text-gray-800 break-all flex-1 font-mono">
                    {snippetCode}
                  </code>
                  <button
                    onClick={copySnippet}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Kopiert!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Kopieren
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  ✅ Fügen Sie diesen Code vor dem schließenden <code>&lt;/body&gt;</code> Tag ein
                </p>
                <p>
                  ✅ Das Widget erscheint als Button am rechten Bildschirmrand (mittig)
                </p>
                <p>
                  ✅ Nutzer können Screenshots machen und Kommentare hinterlassen
                </p>
              </div>

              {project.widget_last_ping && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ Letzter Widget-Ping: {new Date(project.widget_last_ping).toLocaleString('de-DE')}
                  </p>
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                Tasks ({tasks.length})
              </h2>
              
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Noch keine Tasks vorhanden</p>
                  <p className="text-sm mt-2">
                    Tasks werden automatisch erstellt, wenn Nutzer Feedback über das Widget senden.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          {task.status === 'open' ? 'Offen' : 
                           task.status === 'in_progress' ? 'In Bearbeitung' : 'Abgeschlossen'}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(task.created_at).toLocaleString('de-DE')}</span>
                        {task.url && (
                          <a 
                            href={task.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Seite öffnen
                          </a>
                        )}
                      </div>
                      
                      {task.screenshot && (
                        <div className="mt-3">
                          <img 
                            src={task.screenshot.startsWith('http') ? task.screenshot : getScreenshotUrl(task.screenshot)} 
                            alt="Task Screenshot" 
                            className="max-w-full h-auto rounded border"
                            style={{ maxHeight: '200px' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Projekt Statistiken</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gesamt Tasks:</span>
                  <span className="font-medium">{tasks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Offene Tasks:</span>
                  <span className="font-medium text-red-600">
                    {tasks.filter(t => t.status === 'open').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">In Bearbeitung:</span>
                  <span className="font-medium text-yellow-600">
                    {tasks.filter(t => t.status === 'in_progress').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Abgeschlossen:</span>
                  <span className="font-medium text-green-600">
                    {tasks.filter(t => t.status === 'completed').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Demo Link */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Widget testen</h3>
              <p className="text-gray-600 text-sm mb-4">
                Testen Sie das Widget auf einer Demo-Seite:
              </p>
              <a
                href="/demo"
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm w-full justify-center"
              >
                <ExternalLink className="h-4 w-4" />
                Demo öffnen
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}