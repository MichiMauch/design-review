'use client';

import { useState } from 'react';
import { Copy, CheckCircle, Code } from 'lucide-react';

export default function WidgetInstallation({ project }) {
  const [copied, setCopied] = useState(false);

  if (project.widget_installed) return null;

  const snippetCode = `<script>
(function() {
  const script = document.createElement('script');
  script.src = '${process.env.NEXT_PUBLIC_BASE_URL}/widget/widget.js';
  script.setAttribute('data-project-id', '${project.id}');
  script.async = true;
  document.head.appendChild(script);
})();
</script>`;

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippetCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
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
          ✅ Nutzer können Elemente auswählen und Feedback hinterlassen
        </p>
        <p>
          ✅ Keine Browser-Berechtigungen erforderlich (DOM-basiert)
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
  );
}