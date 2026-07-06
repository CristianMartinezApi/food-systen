export interface Product {
  id?: number;
  name: string;
  description: string;
  price: number;
  discountPercent?: number;
  categoryId: number;
  image: string;
  isActive: boolean;
  isFeatured?: boolean;
  stockQuantity: number;
  trackStock: boolean;
  slug: string;
  sizes?: { name: string; price: number }[];
  addons?: { name: string; price: number; step?: string }[];
  ingredients?: string[];
  usesGuidedAssembly?: boolean;
  guidedAssemblyConfig?: Array<{
    id?: number;
    name: string;
    order: number;
    minSelections: number;
    maxSelections: number;
    options?: Array<{ name: string; price: number }>;
  }>;
}

export interface Category {
  id?: number;
  name: string;
  slug: string;
  order: number;
  isActive: boolean;
  typeMontagem?: 'padrao' | 'guiada_por_etapas';
  guidedAssemblyConfig?: Array<{
    id?: number;
    name: string;
    order: number;
    minSelections: number;
    maxSelections: number;
    options?: Array<{ name: string; price: number }>;
  }>;
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
  addons?: { name: string; price: number; step?: string }[];
  removals?: string[];
  observations?: string;
  customization?: { step: string; name: string; price: number }[];
  guidedAssemblySelections?: Array<{
    groupName: string;
    selected: Array<{ name: string; price: number }>;
  }>;
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
  deliveryEtaMinutes?: number;
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
  operatingHours: OperatingHours;
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

export interface OperatingHours {
  dom: OperatingDay;
  seg: OperatingDay;
  ter: OperatingDay;
  qua: OperatingDay;
  qui: OperatingDay;
  sex: OperatingDay;
  sab: OperatingDay;
}

export interface OperatingDay {
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
