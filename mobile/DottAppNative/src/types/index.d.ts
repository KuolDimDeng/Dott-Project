// Global type definitions for DottAppNative

// User Types
export interface User {
  id: string;
  email: string;
  phone_number?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role: 'OWNER' | 'ADMIN' | 'USER';
  has_business: boolean;
  business_id?: string;
  business_name?: string;
  business_type?: BusinessType;
  business_city?: string;
  business_country?: string;
  business_country_name?: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Business Types
export type BusinessType = 
  | 'RESTAURANT_CAFE'
  | 'RETAIL'
  | 'SERVICE'
  | 'TRANSPORT'
  | 'OTHER';

// Auth Types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionToken: string | null;
  userMode: 'business' | 'consumer';
}

export interface LoginResult {
  success: boolean;
  message?: string;
  mode?: 'business' | 'consumer';
  user?: User;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Business Listing Types
export interface BusinessListing {
  id: string;
  business_name: string;
  business_type: BusinessType;
  category: string;
  category_display: string;
  description?: string;
  logo?: string;
  cover_image?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  is_verified: boolean;
  is_featured: boolean;
  is_published: boolean;
  average_rating: number;
  total_reviews: number;
  opening_hours?: OpeningHours;
  delivery_scope?: number;
  minimum_order?: number;
  delivery_fee?: number;
  created_at: string;
  updated_at: string;
}

export interface OpeningHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  is_closed?: boolean;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  is_available: boolean;
  stock_quantity?: number;
  business_id: string;
  business_name?: string;
}

// Cart Types
export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
  businessId?: string;
}

// Order Types
export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  items: OrderItem[];
  total_amount: number;
  delivery_fee: number;
  tax: number;
  subtotal: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  delivery_address?: Address;
  delivery_type: 'delivery' | 'pickup';
  estimated_delivery?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export type PaymentMethod =
  | 'card'
  | 'mobile_money'
  | 'cash'
  | 'bank_transfer';

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
  notes?: string;
}

// Address Types
export interface Address {
  id?: string;
  label: string;
  street: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}

// Navigation Types
export type RootStackParamList = {
  // Auth Stack
  Entry: undefined;
  LoginOptions: undefined;
  Login: undefined;
  Register: undefined;
  PhoneLogin: undefined;
  PhoneSignup: undefined;
  PhoneOTPVerification: { phoneNumber: string };
  SetupPIN: undefined;
  
  // Main Stack
  Tabs: undefined;
  Cart: undefined;
  Purchases: undefined;
  BusinessDetail: { businessId: string; businessName?: string };
  ProductDetail: { productId: string };
  ChatConversation: { conversationId: string };
  NewChat: undefined;
  GroupCreation: undefined;
  BusinessRegistration: undefined;
  AccountSettings: undefined;
  PaymentMethods: undefined;
  DeliveryAddresses: undefined;
  AddEditAddress: { addressId?: string };
  AddressMapPicker: undefined;
  
  // Business Screens
  POS: undefined;
  Timesheet: undefined;
  Reports: undefined;
  Employees: undefined;
  Inventory: undefined;
  Expenses: undefined;
  Invoices: undefined;
  Banking: undefined;
  MenuManagement: undefined;
  BankingSetup: undefined;
  CurrencyPreference: undefined;
  PersonalInfo: undefined;
  BusinessProfile: undefined;
  Diagnostics: undefined;
  Jobs: undefined;
  Dashboard: undefined;
  Transactions: undefined;
  TransactionDetail: { transactionId: string };
  Receipt: { receiptId: string };
  PasscodeVerification: undefined;
  Customers: undefined;
  Orders: undefined;
  WhatsApp: undefined;
  Messages: undefined;
  HR: undefined;
  Payroll: undefined;
  Advertise: undefined;
  CreateCampaign: undefined;
  Services: undefined;
  MarketplaceBusiness: undefined;
  Invite: undefined;
  SmartInsights: undefined;
  TaxFiling: undefined;
  Transport: undefined;
  Tables: undefined;
  Delivery: undefined;
  MarketplaceSettings: undefined;
  
  // Payment Screens
  DualQR: undefined;
  BusinessQR: undefined;
  QRScanner: undefined;
  P2PPayment: undefined;
  P2PHistory: undefined;
  
  // Wallet Screens
  WalletHome: undefined;
  SendMoney: undefined;
  ReceiveMoney: undefined;
  TopUp: undefined;
  WalletSettings: undefined;
  WalletRequests: undefined;
  BusinessWallet: undefined;
  WalletBankTransfer: undefined;
  WalletTransactions: undefined;
  
  // Courier Screens
  CourierDashboard: undefined;
  RequestDelivery: undefined;
  DeliveryTracking: { deliveryId: string };
  OrderList: undefined;
  CourierVerification: undefined;
  
  // Feature Selection
  FeatureSelection: undefined;
};

// Environment Types
export interface Environment {
  apiUrl: string;
  auth0Domain: string;
  auth0ClientId: string;
  auth0Audience: string;
  sessionEndpoint: string;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

// Declare module for react-native-vector-icons
declare module 'react-native-vector-icons/Ionicons' {
  import { Icon } from 'react-native-vector-icons/Icon';
  export default Icon;
}

// Global type augmentations
declare global {
  const __DEV__: boolean;
}

export {};