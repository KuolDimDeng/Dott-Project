'use client';

import { apiService } from './apiService';

/**
 * Transaction Service - Extracted from massive apiClient.js
 * Handles all transaction-related API operations
 */
export const transactionService = {
  // Get all transactions
  async getAll(params = {}) {
    return apiService.get('/transactions', params);
  },

  // Get transaction by ID
  async getById(id) {
    return apiService.get(`/transactions/${id}`);
  },

  // Create new transaction
  async create(transactionData) {
    return apiService.post('/transactions', transactionData);
  },

  // Update transaction
  async update(id, transactionData) {
    return apiService.put(`/transactions/${id}`, transactionData);
  },

  // Delete transaction
  async delete(id) {
    return apiService.delete(`/transactions/${id}`);
  },

  // Categorize transaction
  async categorize(id, category) {
    return apiService.patch(`/transactions/${id}/categorize`, { category });
  },

  // Bulk operations
  async bulkCategorize(transactionIds, category) {
    return apiService.post('/transactions/bulk-categorize', { 
      transaction_ids: transactionIds, 
      category 
    });
  },

  async bulkDelete(transactionIds) {
    return apiService.post('/transactions/bulk-delete', { 
      transaction_ids: transactionIds 
    });
  },

  // Bank sync
  async syncFromBank(bankAccountId, params = {}) {
    return apiService.post(`/banking/accounts/${bankAccountId}/sync`, params);
  },

  // Transaction matching
  async findMatches(transactionId) {
    return apiService.get(`/transactions/${transactionId}/matches`);
  },

  async matchTransactions(transaction1Id, transaction2Id) {
    return apiService.post('/transactions/match', {
      transaction1_id: transaction1Id,
      transaction2_id: transaction2Id
    });
  }
};
