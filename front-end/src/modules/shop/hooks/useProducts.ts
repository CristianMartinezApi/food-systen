import { useState, useEffect } from 'react';
import { api } from '../../../core/config/api';
import { getTenantSlug } from '../../../shared/utils/tenant';
import type { Product, Category } from '../../../core/types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const slug = getTenantSlug();

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      try {
        setIsLoading(true);
        const productsData = await api.get('/products');
        if (!isMounted) return;
        setProducts(productsData);
      } catch (error) {
        console.error('Falha ao buscar produtos:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    async function fetchCategories() {
      try {
        const categoriesData = await api.get('/categories');
        if (!isMounted) return;
        setCategories(categoriesData);
      } catch (error) {
        console.error('Falha ao buscar categorias:', error);
      }
    }

    if (slug) {
      fetchProducts();
      fetchCategories();
    }

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return {
    products,
    categories,
    isLoading,
  };
}

  return {
    products,
    categories,
    isLoading,
  };
}
