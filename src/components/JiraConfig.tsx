'use client';

import { useState, useEffect } from 'react';
import { Save, TestTube, AlertCircle, CheckCircle } from 'lucide-react';
import { JiraConfig } from '@/lib/types';

interface JiraConfigProps {
  onConfigSave?: (config: JiraConfig) => void;
}

export default function JiraConfigComponent({ onConfigSave }: JiraConfigProps) {
  const [config, setConfig] = useState<JiraConfig>({
    serverUrl: '',
    username: '',
    apiToken: '',
    projectKey: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load saved config from localStorage
    const savedConfig = localStorage.getItem('jiraConfig');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch {
        console.error('Error loading JIRA config');
      }
    }
  }, []);

  const handleInputChange = (field: keyof JiraConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setTestResult(null);
    setIsSaved(false);
  };

  const handleSave = () => {
    try {
      localStorage.setItem('jiraConfig', JSON.stringify(config));
      setIsSaved(true);
      
      if (onConfigSave) {
        onConfigSave(config);
      }

      setTimeout(() => setIsSaved(false), 3000);
    } catch {
      console.error('Error saving JIRA config');
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // Mock JIRA API test - in real implementation, this would test the actual connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (config.serverUrl && config.username && config.apiToken) {
        setTestResult({
          success: true,
          message: 'Verbindung erfolgreich! JIRA-Integration ist bereit.',
        });
      } else {
        setTestResult({
          success: false,
          message: 'Bitte füllen Sie alle erforderlichen Felder aus.',
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Verbindung fehlgeschlagen. Überprüfen Sie Ihre Eingaben.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">JIRA Konfiguration</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JIRA Server URL *
            </label>
            <input
              type="url"
              value={config.serverUrl}
              onChange={(e) => handleInputChange('serverUrl', e.target.value)}
              placeholder="https://your-company.atlassian.net"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Benutzername/E-Mail *
            </label>
            <input
              type="email"
              value={config.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="your.email@company.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Token *
            </label>
            <input
              type="password"
              value={config.apiToken}
              onChange={(e) => handleInputChange('apiToken', e.target.value)}
              placeholder="Ihr JIRA API Token"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-600 mt-1">
              Erstellen Sie ein API Token in Ihren JIRA Kontoeinstellungen
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Projekt-Schlüssel (optional)
            </label>
            <input
              type="text"
              value={config.projectKey}
              onChange={(e) => handleInputChange('projectKey', e.target.value)}
              placeholder="PROJ"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-600 mt-1">
              Standard-Projekt für neue Tickets (kann später geändert werden)
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <p className="text-sm">{testResult.message}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={handleTestConnection}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              Verbindung testen
            </button>
            
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Save className="h-4 w-4" />
              {isSaved ? 'Gespeichert!' : 'Konfiguration speichern'}
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">API Token erstellen:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Gehen Sie zu Ihren JIRA Kontoeinstellungen</li>
            <li>Wählen Sie &quot;Security&quot; → &quot;Create and manage API tokens&quot;</li>
            <li>Klicken Sie auf &quot;Create API token&quot;</li>
            <li>Geben Sie einen Namen ein und kopieren Sie das Token</li>
            <li>Fügen Sie das Token hier ein</li>
          </ol>
        </div>
      </div>
    </div>
  );
}