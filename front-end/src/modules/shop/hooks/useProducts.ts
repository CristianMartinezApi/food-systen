import { useState, useEffect } from 'react';
import { api } from '../../../core/config/api';
import type { Product, Category } from '../../../core/types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsData, categoriesData] = await Promise.all([
          api.get('/products'),
          api.get('/categories')
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Falha ao buscar dados:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  return {
    products,
    categories,
    isLoading,
  };
}
