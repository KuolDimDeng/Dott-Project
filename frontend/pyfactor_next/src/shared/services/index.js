// Shared services - Replaces massive 3,129 line apiClient.js
export { apiService } from './apiService';
export { customerService } from './customerService';
export { invoiceService } from './invoiceService';
export { transactionService } from './transactionService';
export { userService } from './userService';
export { bankingService } from './bankingService';
export { hrService } from './hrService';
export { authService } from './authService';

// Domain services (from product migration)
export { productService } from '@/domains/products/services/productService';

// Unified API client for backward compatibility
export const apiClient = {
  // Base methods
  get: (endpoint, params) => apiService.get(endpoint, params),
  post: (endpoint, data) => apiService.post(endpoint, data),
  put: (endpoint, data) => apiService.put(endpoint, data),
  patch: (endpoint, data) => apiService.patch(endpoint, data),
  delete: (endpoint) => apiService.delete(endpoint),

  // Domain-specific APIs
  customers: customerService,
  invoices: invoiceService,
  transactions: transactionService,
  users: userService,
  banking: bankingService,
  hr: hrService,
  auth: authService,
  products: productService
};
