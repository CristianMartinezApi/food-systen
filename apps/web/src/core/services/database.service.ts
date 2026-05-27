import Dexie, { type Table } from 'dexie';
import type { Product, Category, Order, Settings } from '../types';

export class FoodSystemDB extends Dexie {
  products!: Table<Product>;
  categories!: Table<Category>;
  orders!: Table<Order>;
  settings!: Table<Settings>;

  constructor() {
    super('FoodSystemDB');
    this.version(2).stores({
      products: '++id, name, categoryId, status, isBestSeller, isNew, isPromotion',
      categories: '++id, name, slug, order',
      orders: '++id, customerName, status, createdAt',
      settings: 'id'
    });
  }
}

export const db = new FoodSystemDB();
