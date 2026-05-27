import { useState, useEffect } from 'react';
import { api } from '../config/api';
import { socket } from '../config/socket';

export function useSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const data = await api.get('/settings');
      setSettings(data);
      if (data.primaryColor) {
        document.documentElement.style.setProperty('--color-primary', data.primaryColor);
        document.documentElement.style.setProperty('--color-primary-foreground', '#ffffff');
      }
    } catch (error) {
      console.error('Falha ao buscar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    socket.on('settings_updated', (newSettings) => {
      setSettings(newSettings);
      if (newSettings.primaryColor) {
        document.documentElement.style.setProperty('--color-primary', newSettings.primaryColor);
      }
    });

    return () => {
      socket.off('settings_updated');
    };
  }, []);

  return { settings, isLoading };
}
