import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OrderItem } from '../types';

interface CartState {
  items: OrderItem[];
  addItem: (item: OrderItem) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  updateItem: (index: number, item: Partial<OrderItem>) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => {
        const existingItemIndex = state.items.findIndex(
          (i) => i.productId === item.productId && 
                 i.variation === item.variation && 
                 JSON.stringify(i.addons) === JSON.stringify(item.addons) &&
                 JSON.stringify(i.removals) === JSON.stringify(item.removals) &&
                 i.observations === item.observations
        );

        if (existingItemIndex > -1) {
          const newItems = [...state.items];
          newItems[existingItemIndex].quantity += item.quantity;
          return { items: newItems };
        }
        return { items: [...state.items, item] };
      }),
      removeItem: (index) => set((state) => ({
        items: state.items.filter((_, i) => i !== index)
      })),
      updateQuantity: (index, quantity) => set((state) => ({
        items: state.items.map((item, i) => i === index ? { ...item, quantity } : item)
      })),
      updateItem: (index, updatedItem) => set((state) => ({
        items: state.items.map((item, i) => i === index ? { ...item, ...updatedItem } : item)
      })),
      clearCart: () => set({ items: [] }),
      getTotalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
      getSubtotal: () => get().items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
    }),
    {
      name: 'food-system-cart',
    }
  )
);
