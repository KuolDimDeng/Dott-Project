'use client';

import { apiService } from '@/shared/services/apiService';

// Product Service - Extracted from massive apiClient.js
export const productService = {
  // Get all products with optional filtering
  async getAll(params = {}) {
    return apiService.get('/inventory/products', params);
  },

  // Get single product by ID
  async getById(id) {
    return apiService.get(`/inventory/products/${id}`);
  },

  // Create new product
  async create(productData) {
    return apiService.post('/inventory/products', productData);
  },

  // Update existing product
  async update(id, productData) {
    return apiService.put(`/inventory/products/${id}`, productData);
  },

  // Delete product
  async delete(id) {
    return apiService.delete(`/inventory/products/${id}`);
  },

  // Bulk operations
  async bulkUpdate(products) {
    return apiService.post('/inventory/products/bulk-update', { products });
  },

  async bulkDelete(productIds) {
    return apiService.post('/inventory/products/bulk-delete', { ids: productIds });
  },

  // Search products
  async search(query, filters = {}) {
    return apiService.get('/inventory/products/search', { 
      q: query, 
      ...filters 
    });
  },

  // Get product categories
  async getCategories() {
    return apiService.get('/inventory/products/categories');
  },

  // Generate barcode
  async generateBarcode(productId) {
    return apiService.post(`/inventory/products/${productId}/barcode`);
  }
};
