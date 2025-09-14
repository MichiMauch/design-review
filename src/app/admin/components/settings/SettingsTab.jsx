import { useState, useEffect } from 'react';
import { Settings, Save, Key } from 'lucide-react';

export default function SettingsTab({ settings, loading, onUpdateSetting }) {
  const [r2Url, setR2Url] = useState('');
  const [jiraUrl, setJiraUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraApiKey, setJiraApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings.r2_screenshot_url) {
      setR2Url(settings.r2_screenshot_url);
    }
    if (settings.jira_url) {
      setJiraUrl(settings.jira_url);
    }
    if (settings.jira_email) {
      setJiraEmail(settings.jira_email);
    }
    if (settings.jira_api_key) {
      setJiraApiKey(settings.jira_api_key);
    }
  }, [settings]);

  const handleSaveR2 = async () => {
    if (!r2Url.trim()) {
      return;
    }

    setSaving(true);
    const success = await onUpdateSetting('r2_screenshot_url', r2Url.trim());
    setSaving(false);
  };

  const handleSaveJira = async () => {
    setSaving(true);

    // Save all JIRA settings
    await Promise.all([
      onUpdateSetting('jira_url', jiraUrl.trim()),
      onUpdateSetting('jira_email', jiraEmail.trim()),
      onUpdateSetting('jira_api_key', jiraApiKey.trim())
    ]);

    setSaving(false);
  };

  const resetToDefault = () => {
    setR2Url('https://pub-cac1d67ee1dc4cb6814dff593983d703.r2.dev/screenshots/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* R2 Screenshot URL Setting */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Screenshot Speicher</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              R2 Screenshot URL
            </label>
            <input
              type="url"
              value={r2Url}
              onChange={(e) => setR2Url(e.target.value)}
              placeholder="https://pub-xxx.r2.dev/screenshots/"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            />
            <p className="mt-1 text-sm text-gray-500">
              Die Basis-URL für Screenshot-Links. Screenshots werden als {'{URL}/{filename}'} angezeigt.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveR2}
              disabled={saving || !r2Url.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Speichere...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Speichern
                </>
              )}
            </button>

            <button
              onClick={resetToDefault}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Standard wiederherstellen
            </button>
          </div>

          {/* Current URL Display */}
          {r2Url && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Aktuelle URL:</strong> {r2Url}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Beispiel: {r2Url}beispiel-screenshot.png
              </p>
            </div>
          )}
        </div>
      </div>

      {/* JIRA Settings Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">JIRA Integration</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JIRA Base URL
            </label>
            <input
              type="url"
              value={jiraUrl}
              onChange={(e) => setJiraUrl(e.target.value)}
              placeholder="https://ihrunternehmen.atlassian.net"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            />
            <p className="mt-1 text-sm text-gray-500">
              Die Basis-URL Ihrer JIRA-Instanz (z.B. https://ihrunternehmen.atlassian.net)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JIRA Email
            </label>
            <input
              type="email"
              value={jiraEmail}
              onChange={(e) => setJiraEmail(e.target.value)}
              placeholder="ihr-email@unternehmen.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            />
            <p className="mt-1 text-sm text-gray-500">
              Die E-Mail-Adresse Ihres JIRA-Accounts
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JIRA API Token
            </label>
            <input
              type="password"
              value={jiraApiKey}
              onChange={(e) => setJiraApiKey(e.target.value)}
              placeholder="Ihr JIRA API Token"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            />
            <p className="mt-1 text-sm text-gray-500">
              Ihr JIRA API Token (kann in den JIRA-Kontoeinstellungen erstellt werden)
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveJira}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Speichere...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  JIRA Einstellungen speichern
                </>
              )}
            </button>
          </div>

          {/* JIRA Settings Status */}
          {(jiraUrl || jiraEmail || jiraApiKey) && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Status:</strong>
              </p>
              <ul className="text-xs text-gray-500 mt-1 space-y-1">
                <li>URL: {jiraUrl ? '✓ Konfiguriert' : '✗ Nicht konfiguriert'}</li>
                <li>E-Mail: {jiraEmail ? '✓ Konfiguriert' : '✗ Nicht konfiguriert'}</li>
                <li>API Token: {jiraApiKey ? '✓ Konfiguriert' : '✗ Nicht konfiguriert'}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}