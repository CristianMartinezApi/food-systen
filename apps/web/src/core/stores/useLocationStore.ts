import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Address {
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  complement?: string;
}

interface LocationState {
  address: Address | null;
  setAddress: (address: Address | null) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      address: null,
      setAddress: (address) => set({ address }),
    }),
    {
      name: 'food-system-location',
    }
  )
);
