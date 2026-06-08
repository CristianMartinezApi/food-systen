import { useState, useEffect } from 'react';
import { api } from '../config/api';
import { socket } from '../config/socket';
import { getTenantSlug } from '../../shared/utils/tenant';
import { createDefaultOperatingHours, isRestaurantOpenNow, normalizeOperatingHours } from '../../shared/utils/schedule';

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

      data.operatingHours = normalizeOperatingHours(data.operatingHours || createDefaultOperatingHours());
      data.isOpen = isRestaurantOpenNow(data.operatingHours);
      data.deliveryEtaMinutes = data.deliveryEtaMinutes || 35;

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
      newSettings.operatingHours = normalizeOperatingHours(newSettings.operatingHours || createDefaultOperatingHours());
      newSettings.isOpen = isRestaurantOpenNow(newSettings.operatingHours);
      setSettings(newSettings);
      if (newSettings.primaryColor) {
        document.documentElement.style.setProperty('--color-primary', newSettings.primaryColor);
      }
    });

    return () => {
      socket.off(eventName);
    };
  }, [slug]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSettings((current: any) => {
        if (!current) return current;
        return {
          ...current,
          isOpen: isRestaurantOpenNow(current.operatingHours),
        };
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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
