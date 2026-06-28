export interface Product {
  id: string;
  name: string;
  collection: string;
  description: string;
  price: number;
  imageUrl: string;
  color: string; // "Obsidian" | "Ecru" | "Tobacco" | "Terracotta" | "Slate" | "Alabaster"
  colorHex: string;
  sizes: string[]; // XS, S, M, L, XL
  isLimited?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  shippingAddress: string;
  encryptedAddress?: string; // Encrypted version for backend audit demonstration
  paymentMethod: string;
  createdAt: string;
  email: string;
  trackingNumber: string;
  estimatedTime?: string;
  carrier?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'security' | 'system';
  createdAt: string;
  read: boolean;
}

export interface DashboardStats {
  activeShoppers: number;
  totalSalesToday: number;
  ordersProcessed: number;
  stockAlerts: number;
}
