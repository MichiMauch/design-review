'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import JiraConfigComponent from '@/components/JiraConfig';

export default function ConfigPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Startseite
          </button>
        </div>

        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            JIRA Integration einrichten
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Konfigurieren Sie Ihre JIRA-Verbindung, um automatisch Tickets 
            mit Screenshots und Kommentaren zu erstellen.
          </p>
        </div>

        {/* Configuration Form */}
        <JiraConfigComponent />
      </div>
    </div>
  );
}