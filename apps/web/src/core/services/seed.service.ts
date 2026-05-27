import { db } from './database.service';
import type { Product, Category } from '../types';

export const seedDatabase = async () => {
  const categoryCount = await db.categories.count();
  if (categoryCount > 0) return;

  const categories: Category[] = [
    { name: '🍔 Hambúrgueres Artesanais', slug: 'hamburgueres', order: 1, status: 'active' },
    { name: '🌮 Wraps e Tacos', slug: 'wraps', order: 2, status: 'active' },
    { name: '🍕 Pizzas', slug: 'pizzas', order: 3, status: 'active' },
    { name: '🍟 Porções', slug: 'porcoes', order: 4, status: 'active' },
    { name: '🥗 Saladas', slug: 'saladas', order: 5, status: 'active' },
    { name: '🥤 Bebidas', slug: 'bebidas', order: 6, status: 'active' },
    { name: '🍰 Sobremesas', slug: 'sobremesas', order: 7, status: 'active' },
    { name: '🎉 Combos', slug: 'combos', order: 8, status: 'active' },
  ];

  const catIds = await Promise.all(categories.map(cat => db.categories.add(cat)));

  const products: Product[] = [
    {
      name: 'Burger Clássico',
      description: 'Pão brioche, carne 180g, queijo cheddar, alface, tomate e maionese da casa.',
      price: 28.90,
      categoryId: catIds[0] as number,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
      status: 'active',
      isBestSeller: true,
      preparationTime: '15-20 min',
      slug: 'burger-classico'
    },
    {
      name: 'Double Bacon Gourmet',
      description: 'Dois blends de 150g, muito bacon crocante, queijo prato e barbecue.',
      price: 42.00,
      categoryId: catIds[0] as number,
      image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500',
      status: 'active',
      isNew: true,
      preparationTime: '20-25 min',
      slug: 'double-bacon-gourmet'
    },
    {
      name: 'Combo Galera',
      description: '2 Burgers Clássicos + Porção de Batata G + Coca-Cola 1.5L',
      price: 85.00,
      categoryId: catIds[7] as number,
      image: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=500',
      status: 'active',
      isPromotion: true,
      preparationTime: '25-30 min',
      slug: 'combo-galera'
    },
    {
        name: 'Coca-Cola 350ml',
        description: 'Lata refrescante',
        price: 6.00,
        categoryId: catIds[5] as number,
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500',
        status: 'active',
        slug: 'coca-cola-350'
    },
    {
        name: 'Batata Frita Tradicional',
        description: 'Crocante por fora e macia por dentro',
        price: 18.00,
        categoryId: catIds[3] as number,
        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500',
        status: 'active',
        slug: 'batata-frita'
    }
  ];

  await Promise.all(products.map(prod => db.products.add(prod)));
};
