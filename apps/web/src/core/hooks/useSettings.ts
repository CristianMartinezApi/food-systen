import { useState, useEffect } from 'react';
import { api } from '../config/api';
import { socket } from '../config/socket';
import { getTenantSlug } from '../../shared/utils/tenant';

export function useSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    setSlug(getTenantSlug());
  }, []);

  const fetchSettings = async () => {
    if (!slug) return;
    
    try {
      setError(false);
      const data = await api.get('/settings');
      
      if (!data) {
        setError(true);
        return;
      }

      // Garante estrutura básica de horários para evitar erros no form
      if (!data.operatingHours) {
        data.operatingHours = {
          seg: { open: '18:00', close: '23:00', closed: false },
          ter: { open: '18:00', close: '23:00', closed: false },
          qua: { open: '18:00', close: '23:00', closed: false },
          qui: { open: '18:00', close: '23:00', closed: false },
          sex: { open: '18:00', close: '23:00', closed: false },
          sab: { open: '18:00', close: '23:00', closed: false },
          dom: { open: '18:00', close: '23:00', closed: false }
        };
      }

      setSettings(data);
      if (data.primaryColor) {
        document.documentElement.style.setProperty('--color-primary', data.primaryColor);
        document.documentElement.style.setProperty('--color-primary-foreground', '#ffffff');
      }
    } catch (error) {
      console.error('Falha ao buscar configurações:', error);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    const eventName = `settings_updated_${slug}`;
    socket.on(eventName, (newSettings) => {
      setSettings(newSettings);
      if (newSettings.primaryColor) {
        document.documentElement.style.setProperty('--color-primary', newSettings.primaryColor);
      }
    });

    return () => {
      socket.off(eventName);
    };
  }, [slug]);

  const updateSettings = async (newSettings: any) => {
    try {
      const updated = await api.patch('/settings', newSettings);
      setSettings(updated);
      return updated;
    } catch (error) {
      console.error('Falha ao atualizar configurações:', error);
      throw error;
    }
  };

  return { settings, isLoading, error, updateSettings };
}
