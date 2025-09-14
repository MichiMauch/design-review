import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../services/adminApi';
import toast from 'react-hot-toast';

export function useSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const data = await settingsApi.fetchSettings();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Fehler beim Laden der Einstellungen');
      // Set default values
      setSettings({
        r2_screenshot_url: 'https://pub-cac1d67ee1dc4cb6814dff593983d703.r2.dev/screenshots/'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSetting = useCallback(async (key, value) => {
    try {
      const data = await settingsApi.updateSetting(key, value);
      if (data.success) {
        setSettings(prev => ({ ...prev, [key]: value }));
        toast.success('Einstellung erfolgreich gespeichert');
        return true;
      }
    } catch (error) {
      toast.error(`Fehler: ${error.message}`);
      return false;
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Get R2 URL with fallback
  const getR2Url = useCallback(() => {
    return settings.r2_screenshot_url || 'https://pub-cac1d67ee1dc4cb6814dff593983d703.r2.dev/screenshots/';
  }, [settings.r2_screenshot_url]);

  return {
    settings,
    loading,
    updateSetting,
    getR2Url,
    refetch: loadSettings
  };
}