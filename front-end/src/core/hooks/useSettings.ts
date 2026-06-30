import { useState, useEffect } from 'react';
import { api } from '../config/api';
import { socket } from '../config/socket';
import { getTenantSlug } from '../../shared/utils/tenant';
import { createDefaultOperatingHours, isRestaurantOpenNow, normalizeOperatingHours } from '../../shared/utils/schedule';

function getUserRoleFromStorage() {
  if (typeof window === 'undefined') return null;

  try {
    const userData = localStorage.getItem('@FoodSystem:user');
    if (!userData) return null;
    const user = JSON.parse(userData);
    return user?.role || null;
  } catch {
    return null;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);
  const [slug, setSlug] = useState<string>('');
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  useEffect(() => {
    setSlug(getTenantSlug());
    setIsSuperAdmin(getUserRoleFromStorage() === 'SUPER_ADMIN');
  }, []);

  const fetchSettings = async () => {
    if (!slug || isSuperAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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

    if (!slug || isSuperAdmin) {
      setIsLoading(false);
      return;
    }

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
  }, [slug, isSuperAdmin]);

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
