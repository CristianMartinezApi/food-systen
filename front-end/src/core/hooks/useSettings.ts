import { useState, useEffect, useRef } from 'react';
import { api } from '../config/api';
import { socket } from '../config/socket';
import { getTenantSlug } from '../../shared/utils/tenant';
import { createDefaultOperatingHours, isRestaurantOpenNow, normalizeOperatingHours } from '../../shared/utils/schedule';

const SETTINGS_CACHE_TTL_MS = 30_000;
const settingsCache = new Map<string, { data: any; loadedAt: number }>();
const inflightSettingsRequests = new Map<string, Promise<any>>();

function normalizeSettingsPayload(data: any) {
  if (!data) return data;

  return {
    ...data,
    operatingHours: normalizeOperatingHours(data.operatingHours || createDefaultOperatingHours()),
    // Prioriza o status calculado no backend (fuso do servidor/restaurante).
    // O fallback local existe apenas para payloads legados sem o campo isOpen.
    isOpen: typeof data.isOpen === 'boolean' ? data.isOpen : isRestaurantOpenNow(data.operatingHours),
    deliveryEtaMinutes: data.deliveryEtaMinutes || 35,
  };
}

async function fetchSettingsSnapshot(slug: string) {
  const cached = settingsCache.get(slug);
  const isFresh = cached && (Date.now() - cached.loadedAt) < SETTINGS_CACHE_TTL_MS;

  if (isFresh) {
    return cached.data;
  }

  const existingRequest = inflightSettingsRequests.get(slug);
  if (existingRequest) {
    return existingRequest;
  }

  const request = api.get('/settings')
    .then((data) => {
      const normalized = normalizeSettingsPayload(data);
      settingsCache.set(slug, {
        data: normalized,
        loadedAt: Date.now(),
      });
      return normalized;
    })
    .finally(() => {
      inflightSettingsRequests.delete(slug);
    });

  inflightSettingsRequests.set(slug, request);
  return request;
}

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

function createSettingsSignature(data: any) {
  if (!data) return '';

  try {
    return JSON.stringify(data);
  } catch {
    return '';
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);
  const [slug, setSlug] = useState<string>('');
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const lastSettingsSignatureRef = useRef<string>('');

  const applySettings = (incoming: any) => {
    const normalized = normalizeSettingsPayload(incoming);
    const nextSignature = createSettingsSignature(normalized);

    if (nextSignature && nextSignature === lastSettingsSignatureRef.current) {
      return;
    }

    lastSettingsSignatureRef.current = nextSignature;
    setSettings(normalized);

    if (normalized?.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', normalized.primaryColor);
      document.documentElement.style.setProperty('--color-primary-foreground', '#ffffff');
    }
  };

  useEffect(() => {
    setSlug(getTenantSlug());
    setIsSuperAdmin(getUserRoleFromStorage() === 'SUPER_ADMIN');
  }, []);

  const fetchSettings = async () => {
    if (!slug || isSuperAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      const cached = settingsCache.get(slug);
      if (cached && (Date.now() - cached.loadedAt) < SETTINGS_CACHE_TTL_MS) {
        setError(false);
        applySettings(cached.data);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(false);
      const data = await fetchSettingsSnapshot(slug);
      
      if (!data) {
        setError(true);
        return;
      }

      applySettings(data);
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
      const normalizedSettings = normalizeSettingsPayload(newSettings);
      settingsCache.set(slug, {
        data: normalizedSettings,
        loadedAt: Date.now(),
      });
      applySettings(normalizedSettings);
    });

    return () => {
      socket.off(eventName);
    };
  }, [slug, isSuperAdmin]);

  useEffect(() => {
    if (!slug || isSuperAdmin) return;

    const interval = setInterval(async () => {
      try {
        const data = await fetchSettingsSnapshot(slug);
        if (!data) return;

        applySettings(data);
      } catch {
        // Mantém último snapshot válido em caso de falha transitória.
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [slug, isSuperAdmin]);

  const updateSettings = async (newSettings: any) => {
    try {
      const updated = await api.patch('/settings', newSettings);
      applySettings(updated);
      return updated;
    } catch (error) {
      console.error('Falha ao atualizar configurações:', error);
      throw error;
    }
  };

  return { settings, isLoading, error, updateSettings };
}
