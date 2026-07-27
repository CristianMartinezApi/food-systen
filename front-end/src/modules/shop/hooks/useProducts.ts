import { useState, useEffect } from 'react';
import { api } from '../../../core/config/api';
import { getTenantSlug } from '../../../shared/utils/tenant';
import { normalizeAssetUrl } from '../../../shared/utils';
import type { Product, Category } from '../../../core/types';

type ProductsSnapshot = {
  products: Product[];
  categories: Category[];
};

const PRODUCTS_CACHE_TTL_MS = 30_000;
const PRODUCTS_STORAGE_VERSION = 1;
const productsCache = new Map<string, ProductsSnapshot & { loadedAt: number }>();
const inflightRequests = new Map<string, Promise<ProductsSnapshot>>();

function getProductsStorageKey(slug: string) {
  return `@FoodSystem:catalog:${PRODUCTS_STORAGE_VERSION}:${slug}`;
}

function readStoredSnapshot(slug: string) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getProductsStorageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.products) || !Array.isArray(parsed?.categories)) return null;
    return parsed as ProductsSnapshot & { loadedAt: number };
  } catch {
    return null;
  }
}

function storeSnapshot(slug: string, snapshot: ProductsSnapshot & { loadedAt: number }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getProductsStorageKey(slug), JSON.stringify(snapshot));
  } catch {
    // Cache opcional: armazenamento indisponível não bloqueia a loja.
  }
}

async function fetchProductsSnapshot(slug: string): Promise<ProductsSnapshot> {
  const cached = productsCache.get(slug);
  const isFresh = cached && (Date.now() - cached.loadedAt) < PRODUCTS_CACHE_TTL_MS;

  if (isFresh) {
    return {
      products: cached.products,
      categories: cached.categories,
    };
  }

  const existingRequest = inflightRequests.get(slug);
  if (existingRequest) {
    return existingRequest;
  }

  const request = Promise.all([
    api.get('/products'),
    api.get('/categories'),
  ]).then(([productsData, categoriesData]) => {
    const normalizedCategories = Array.isArray(categoriesData) ? categoriesData : [];
    const categoriesById = new Map(
      normalizedCategories
        .filter((category: Category) => category?.id != null)
        .map((category: Category) => [Number(category.id), category])
    );

    const snapshot = {
      products: Array.isArray(productsData)
        ? productsData.map((product: Product) => ({
            ...product,
            image: normalizeAssetUrl((product as any)?.image),
            category: (product as any)?.category || categoriesById.get(Number((product as any)?.categoryId)),
          }))
        : [],
      categories: normalizedCategories,
    };

    const cacheEntry = {
      ...snapshot,
      loadedAt: Date.now(),
    };
    productsCache.set(slug, cacheEntry);
    storeSnapshot(slug, cacheEntry);

    return snapshot;
  }).finally(() => {
    inflightRequests.delete(slug);
  });

  inflightRequests.set(slug, request);
  return request;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const slug = getTenantSlug();

  useEffect(() => {
    let isMounted = true;

    async function loadSnapshot() {
      const stored = productsCache.get(slug) || readStoredSnapshot(slug);
      if (stored) {
        productsCache.set(slug, stored);
        setProducts(stored.products);
        setCategories(stored.categories);
        setIsLoading(false);
        setIsStale((Date.now() - stored.loadedAt) >= PRODUCTS_CACHE_TTL_MS);
      }

      try {
        setError(null);
        if (!stored) setIsLoading(true);
        const snapshot = await fetchProductsSnapshot(slug);
        if (!isMounted) return;
        setProducts(snapshot.products);
        setCategories(snapshot.categories);
        setIsStale(false);
      } catch (error: any) {
        console.error('Falha ao buscar produtos:', error);
        if (isMounted) {
          setIsStale(Boolean(stored));
          if (!stored) {
            setError(error?.message || 'Não foi possível carregar os produtos da loja.');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (slug) {
      loadSnapshot();
    }

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return {
    products,
    categories,
    isLoading,
    error,
    isStale,
  };
}
