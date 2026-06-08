import { useState, useEffect } from 'react';
import { api } from '../../../core/config/api';
import type { Product, Category } from '../../../core/types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      try {
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

    fetchProducts();
    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    products,
    categories,
    isLoading,
  };
}
