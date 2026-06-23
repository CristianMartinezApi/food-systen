import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OrderItem } from '../types';
import { getTenantSlug } from '../../shared/utils/tenant';

const getTenantCartKey = () => {
  if (typeof window === 'undefined') return 'tenant:default';
  return `tenant:${getTenantSlug()}`;
};

interface CartState {
  items: OrderItem[];
  itemsByTenant: Record<string, OrderItem[]>;
  syncTenantCart: () => void;
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
      itemsByTenant: {},
      syncTenantCart: () => set((state) => {
        const tenantKey = getTenantCartKey();
        return { items: state.itemsByTenant[tenantKey] || [] };
      }),
      addItem: (item) => set((state) => {
        const tenantKey = getTenantCartKey();
        const tenantItems = state.itemsByTenant[tenantKey] || [];

        const existingItemIndex = tenantItems.findIndex(
          (i) => i.productId === item.productId &&
            i.variation === item.variation &&
            JSON.stringify(i.addons) === JSON.stringify(item.addons) &&
            JSON.stringify(i.removals) === JSON.stringify(item.removals) &&
            i.observations === item.observations
        );

        let nextItems: OrderItem[];
        if (existingItemIndex > -1) {
          nextItems = [...tenantItems];
          nextItems[existingItemIndex].quantity += item.quantity;
        } else {
          nextItems = [...tenantItems, item];
        }

        return {
          items: nextItems,
          itemsByTenant: {
            ...state.itemsByTenant,
            [tenantKey]: nextItems,
          },
        };
      }),
      removeItem: (index) => set((state) => {
        const tenantKey = getTenantCartKey();
        const tenantItems = state.itemsByTenant[tenantKey] || [];
        const nextItems = tenantItems.filter((_, i) => i !== index);
        return {
          items: nextItems,
          itemsByTenant: {
            ...state.itemsByTenant,
            [tenantKey]: nextItems,
          },
        };
      }),
      updateQuantity: (index, quantity) => set((state) => {
        const tenantKey = getTenantCartKey();
        const tenantItems = state.itemsByTenant[tenantKey] || [];
        const nextItems = tenantItems.map((item, i) => i === index ? { ...item, quantity } : item);
        return {
          items: nextItems,
          itemsByTenant: {
            ...state.itemsByTenant,
            [tenantKey]: nextItems,
          },
        };
      }),
      updateItem: (index, updatedItem) => set((state) => {
        const tenantKey = getTenantCartKey();
        const tenantItems = state.itemsByTenant[tenantKey] || [];
        const nextItems = tenantItems.map((item, i) => i === index ? { ...item, ...updatedItem } : item);
        return {
          items: nextItems,
          itemsByTenant: {
            ...state.itemsByTenant,
            [tenantKey]: nextItems,
          },
        };
      }),
      clearCart: () => set((state) => {
        const tenantKey = getTenantCartKey();
        return {
          items: [],
          itemsByTenant: {
            ...state.itemsByTenant,
            [tenantKey]: [],
          },
        };
      }),
      getTotalItems: () => {
        const tenantKey = getTenantCartKey();
        const tenantItems = get().itemsByTenant[tenantKey] || [];
        return tenantItems.reduce((acc, item) => acc + item.quantity, 0);
      },
      getSubtotal: () => {
        const tenantKey = getTenantCartKey();
        const tenantItems = get().itemsByTenant[tenantKey] || [];
        return tenantItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      },
    }),
    {
      name: 'food-system-cart',
      version: 2,
      migrate: (persistedState: any) => {
        if (!persistedState) return persistedState;
        if (persistedState.itemsByTenant) return persistedState;

        const legacyItems = Array.isArray(persistedState.items) ? persistedState.items : [];
        const tenantKey = getTenantCartKey();

        return {
          ...persistedState,
          itemsByTenant: {
            [tenantKey]: legacyItems,
          },
          items: legacyItems,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.syncTenantCart?.();
      },
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str);
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (e) {
            // Se o espaço acabar (QuotaExceededError), limpamos carrinhos de outras lojas
            if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
              const state = JSON.parse(JSON.stringify(value));
              if (state.state && state.state.itemsByTenant) {
                const currentTenant = getTenantSlug();
                const currentKey = `tenant:${currentTenant}`;
                
                // Mantém apenas o carrinho da loja atual para liberar espaço
                const newItemsByTenant = {
                  [currentKey]: state.state.itemsByTenant[currentKey] || []
                };
                
                state.state.itemsByTenant = newItemsByTenant;
                try {
                  localStorage.setItem(name, JSON.stringify(state));
                } catch (retryError) {
                  // Se mesmo assim falhar, limpa o carrinho totalmente
                  localStorage.removeItem(name);
                }
              }
            }
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      }
    }
  )
);
