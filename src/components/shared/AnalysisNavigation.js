'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, BarChart3, Zap, Shield, AlertTriangle, Search, Image, Cookie } from 'lucide-react';

export default function AnalysisNavigation({ projectId, className = '' }) {
  const pathname = usePathname();

  const analysisTypes = [
    {
      name: 'SEO & Content',
      path: `/project/${projectId}/seo-analysis`,
      icon: Search,
      description: 'SEO-Analyse, Content-Qualität und Suchmaschinenoptimierung'
    },
    {
      name: 'Meta-Tags & Icons',
      path: `/project/${projectId}/meta-analysis`,
      icon: Globe,
      description: 'Analyse von Meta-Tags, Open Graph, Twitter Cards und Icons'
    },
    {
      name: 'Analytics & Tracking',
      path: `/project/${projectId}/analytics`,
      icon: BarChart3,
      description: 'Erkennung von Google Analytics, GTM, Matomo und anderen Tracking-Tools'
    },
    {
      name: 'Performance',
      path: `/project/${projectId}/performance`,
      icon: Zap,
      description: 'Analyse von Ladezeiten, Core Web Vitals und Performance-Optimierungen'
    },
    {
      name: 'Security',
      path: `/project/${projectId}/security`,
      icon: Shield,
      description: 'Sicherheitsanalyse: SSL, Headers, Schwachstellen und Best Practices'
    },
    {
      name: 'Error-Pages',
      path: `/project/${projectId}/error-pages`,
      icon: AlertTriangle,
      description: 'Test und Analyse von 404, 403, 500 Error-Seiten'
    },
    {
      name: 'Media & Resources',
      path: `/project/${projectId}/media-analysis`,
      icon: Image,
      description: 'Bild-Optimierung, Video-Integration, Font-Loading und Resource Hints'
    },
    {
      name: 'Cookie & Privacy',
      path: `/project/${projectId}/privacy-analysis`,
      icon: Cookie,
      description: 'DSGVO-Compliance, Cookie-Banner, Consent Management und Datenschutz'
    }
  ];

  return (
    <div className={`bg-white shadow rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700 mb-3">Analyse-Typen</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {analysisTypes.map((analysis) => {
          const Icon = analysis.icon;
          const isActive = pathname === analysis.path;
          
          return (
            <Link
              key={analysis.path}
              href={analysis.path}
              className={`flex items-start p-3 rounded-lg border transition-colors ${
                isActive
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 mt-0.5 ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <div className="flex-1">
                <div className={`font-medium text-sm ${
                  isActive ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {analysis.name}
                </div>
                <div className={`text-xs mt-1 ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {analysis.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}