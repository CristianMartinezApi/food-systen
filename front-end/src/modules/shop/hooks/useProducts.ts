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
const productsCache = new Map<string, ProductsSnapshot & { loadedAt: number }>();
const inflightRequests = new Map<string, Promise<ProductsSnapshot>>();

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
    const snapshot = {
      products: Array.isArray(productsData)
        ? productsData.map((product: Product) => ({
            ...product,
            image: normalizeAssetUrl((product as any)?.image),
          }))
        : [],
      categories: Array.isArray(categoriesData) ? categoriesData : [],
    };

    productsCache.set(slug, {
      ...snapshot,
      loadedAt: Date.now(),
    });

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
  const slug = getTenantSlug();

  useEffect(() => {
    let isMounted = true;

    async function loadSnapshot() {
      try {
        setError(null);
        const cached = productsCache.get(slug);
        if (cached && (Date.now() - cached.loadedAt) < PRODUCTS_CACHE_TTL_MS) {
          setProducts(cached.products);
          setCategories(cached.categories);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        const snapshot = await fetchProductsSnapshot(slug);
        if (!isMounted) return;
        setProducts(snapshot.products);
        setCategories(snapshot.categories);
      } catch (error: any) {
        console.error('Falha ao buscar produtos:', error);
        if (isMounted) {
          setError(error?.message || 'Não foi possível carregar os produtos da loja.');
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
  };
}
