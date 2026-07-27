import { useState, useEffect, useRef } from 'react';
import { api } from '../config/api';
import { socket } from '../config/socket';
import { getTenantSlug } from '../../shared/utils/tenant';
import { normalizeAssetUrl } from '../../shared/utils';
import { createDefaultOperatingHours, isRestaurantOpenNow, normalizeOperatingHours } from '../../shared/utils/schedule';

const SETTINGS_CACHE_TTL_MS = 30_000;
const SETTINGS_STORAGE_VERSION = 1;
const settingsCache = new Map<string, { data: any; loadedAt: number }>();
const inflightSettingsRequests = new Map<string, Promise<any>>();

function getSettingsStorageKey(slug: string) {
  return `@FoodSystem:settings:${SETTINGS_STORAGE_VERSION}:${slug}`;
}

function readStoredSettings(slug: string) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getSettingsStorageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ? parsed : null;
  } catch {
    return null;
  }
}

function storeSettings(slug: string, entry: { data: any; loadedAt: number }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getSettingsStorageKey(slug), JSON.stringify(entry));
  } catch {
    // Cache opcional: armazenamento indisponível não bloqueia a loja.
  }
}

function normalizeSettingsPayload(data: any) {
  if (!data) return data;

  return {
    ...data,
    logo: normalizeAssetUrl(data.logo),
    bannerImage: normalizeAssetUrl(data.bannerImage),
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
      const entry = {
        data: normalized,
        loadedAt: Date.now(),
      };
      settingsCache.set(slug, entry);
      storeSettings(slug, entry);
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
  const [isStale, setIsStale] = useState<boolean>(false);
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

    const cached = settingsCache.get(slug) || readStoredSettings(slug);
    if (cached) {
      settingsCache.set(slug, cached);
      setError(false);
      applySettings(cached.data);
      setIsLoading(false);
      setIsStale((Date.now() - cached.loadedAt) >= SETTINGS_CACHE_TTL_MS);
    }

    try {
      if (!cached) setIsLoading(true);
      setError(false);
      const data = await fetchSettingsSnapshot(slug);
      
      if (!data) {
        setError(true);
        return;
      }

      applySettings(data);
      setIsStale(false);
    } catch (error) {
      console.error('Falha ao buscar configurações:', error);
      setIsStale(Boolean(cached));
      setError(!cached);
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
      const entry = {
        data: normalizedSettings,
        loadedAt: Date.now(),
      };
      settingsCache.set(slug, entry);
      storeSettings(slug, entry);
      applySettings(normalizedSettings);
      setIsStale(false);
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

  return { settings, isLoading, error, isStale, updateSettings };
}
