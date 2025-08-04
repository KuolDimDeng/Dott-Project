'use client';

import { apiService } from './apiService';

/**
 * Customer Service - Extracted from massive apiClient.js
 * Handles all customer-related API operations
 */
export const customerService = {
  // Get all customers
  async getAll(params = {}) {
    return apiService.get('/customers', params);
  },

  // Get customer by ID
  async getById(id) {
    return apiService.get(`/customers/${id}`);
  },

  // Create new customer
  async create(customerData) {
    return apiService.post('/customers', customerData);
  },

  // Update customer
  async update(id, customerData) {
    return apiService.put(`/customers/${id}`, customerData);
  },

  // Delete customer
  async delete(id) {
    return apiService.delete(`/customers/${id}`);
  },

  // Search customers
  async search(query, filters = {}) {
    return apiService.get('/customers/search', { 
      q: query, 
      ...filters 
    });
  },

  // Get customer invoices
  async getInvoices(customerId, params = {}) {
    return apiService.get(`/customers/${customerId}/invoices`, params);
  },

  // Get customer transactions  
  async getTransactions(customerId, params = {}) {
    return apiService.get(`/customers/${customerId}/transactions`, params);
  },

  // Customer analytics
  async getAnalytics(customerId, dateRange = {}) {
    return apiService.get(`/customers/${customerId}/analytics`, dateRange);
  }
};
