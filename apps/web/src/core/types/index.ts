export interface Product {
  id?: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  image: string;
  images?: string[];
  status: 'active' | 'inactive';
  isNew?: boolean;
  isPromotion?: boolean;
  isBestSeller?: boolean;
  preparationTime?: string;
  ingredients?: string[];
  nutritionalInfo?: string;
  variations?: ProductVariation[];
  additionals?: number[]; // IDs of additionals
  removables?: string[];
  rating?: number;
  reviewsCount?: number;
  slug: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
}

export interface ProductVariation {
  name: string;
  price: number;
}

export interface Category {
  id?: number;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  description?: string;
  image?: string;
  order: number;
  status: 'active' | 'inactive';
}

export interface Order {
  id?: number;
  customerName: string;
  phone: string;
  type: 'delivery' | 'pickup';
  address?: Address;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  change?: number;
  status: 'new' | 'confirmed' | 'preparing' | 'on-way' | 'delivered' | 'cancelled';
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
