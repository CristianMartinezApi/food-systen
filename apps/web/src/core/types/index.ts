export interface Product {
  id?: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  image: string;
  isActive: boolean;
  isFeatured?: boolean;
  slug: string;
}

export interface Category {
  id?: number;
  name: string;
  slug: string;
  order: number;
  isActive: boolean;
  products?: Product[];
}

export interface Order {
  id?: number;
  customerName: string;
  phone: string;
  address?: any;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  createdAt: string;
}

export interface OrderItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  variation?: string;
  additionals?: string[];
  removedIngredients?: string[];
  observations?: string;
}

export interface Address {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  reference?: string;
}

export interface Settings {
  id: 'main';
  businessName: string;
  corporateName?: string;
  cnpj?: string;
  logo?: string;
  favicon?: string;
  slogan?: string;
  primaryColor?: string;
  contact: {
    phones: string[];
    email: string;
    address: string;
    googleMapsLink?: string;
    social: {
      instagram?: string;
      facebook?: string;
      whatsapp?: string;
    };
  };
  schedule: ScheduleDay[];
  delivery: {
    enabled: boolean;
    minOrderValue: number;
    averageTime: string;
    fees: DeliveryFeeRange[];
    freeDeliveryAbove?: number;
  };
  payments: PaymentMethodConfig[];
  whatsapp: {
    number: string;
    welcomeMessage?: string;
    closingMessage?: string;
  }
}

export interface ScheduleDay {
  day: number; // 0-6
  enabled: boolean;
  shifts: { open: string; close: string }[];
}

export interface DeliveryFeeRange {
  maxKm: number;
  fee: number;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  enabled: boolean;
  fee?: number;
  discount?: number;
  requiresChange?: boolean;
}
