import { useEffect, useState } from 'react';
import { api } from '../../../core/config/api';
import { getTenantSlug } from '../../../shared/utils/tenant';

type HighlightsResponse = {
  productIds?: number[];
};

const HIGHLIGHTS_CACHE_TTL_MS = 30_000;
const highlightsCache = new Map<string, { loadedAt: number; productIds: number[] }>();
const inflightRequests = new Map<string, Promise<number[]>>();

async function fetchHighlights(slug: string) {
  const cached = highlightsCache.get(slug);
  const isFresh = cached && (Date.now() - cached.loadedAt) < HIGHLIGHTS_CACHE_TTL_MS;

  if (isFresh) {
    return cached.productIds;
  }

  const existingRequest = inflightRequests.get(slug);
  if (existingRequest) {
    return existingRequest;
  }

  const request = api.get('/highlights')
    .then((response: HighlightsResponse) => Array.isArray(response?.productIds) ? response.productIds.map((id) => Number(id)).filter(Number.isFinite) : [])
    .then((productIds) => {
      highlightsCache.set(slug, {
        productIds,
        loadedAt: Date.now(),
      });

      return productIds;
    })
    .finally(() => {
      inflightRequests.delete(slug);
    });

  inflightRequests.set(slug, request);
  return request;
}

export function useHighlights() {
  const [productIds, setProductIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const slug = getTenantSlug();

  useEffect(() => {
    let isMounted = true;

    async function loadHighlights() {
      try {
        setError(null);
        const cached = highlightsCache.get(slug);
        if (cached && (Date.now() - cached.loadedAt) < HIGHLIGHTS_CACHE_TTL_MS) {
          setProductIds(cached.productIds);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        const nextProductIds = await fetchHighlights(slug);
        if (!isMounted) return;
        setProductIds(nextProductIds);
      } catch (error: any) {
        console.error('Falha ao buscar destaques:', error);
        if (isMounted) {
          setError(error?.message || 'Não foi possível carregar os destaques da loja.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (slug) {
      loadHighlights();
    }

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return {
    productIds,
    isLoading,
    error,
  };
}