'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Globe, Calendar, User, Eye } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    loadFeedback();
  }, []);
  const loadFeedback = async () => {
    try {
      const response = await fetch('/api/feedback');
      const data = await response.json();
      
      if (data.success) {
        setFeedback(data.feedback);
        
        // Extract unique project IDs
        const uniqueProjects = [...new Set(data.feedback.map(f => f.project_id))];
        setProjects(uniqueProjects);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedback = feedback.filter(item => {
    if (filter === 'all') return true;
    return item.project_id === filter;
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Gesamt Feedback
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {feedback.length}
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
                  {feedback.filter(f => {
                    const today = new Date().toDateString();
                    const feedbackDate = new Date(f.created_at).toDateString();
                    return today === feedbackDate;
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>

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
                  {project}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-6">
          {filteredFeedback.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Noch kein Feedback
              </h3>
              <p className="text-gray-600">
                Sobald Nutzer Feedback senden, erscheint es hier.
              </p>
            </div>
          ) : (
            filteredFeedback.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.project_id}
                        </span>
                        <span className="text-sm text-gray-500">
                          #{item.id}
                        </span>
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
                    {/* Feedback Text */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Feedback Text:
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {item.text}
                        </p>
                      </div>
                    </div>

                    {/* Screenshot */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Screenshot:
                      </h4>
                      {item.screenshot ? (
                        <div className="bg-gray-50 rounded-lg p-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.screenshot}
                            alt="Feedback Screenshot"
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
    </div>
  );
}