'use client';

import { apiService } from './apiService';

/**
 * Banking Service - Extracted from massive apiClient.js
 * Handles all banking-related API operations
 */
export const bankingService = {
  // Bank accounts
  async getAccounts() {
    return apiService.get('/banking/accounts');
  },

  async getAccountById(id) {
    return apiService.get(`/banking/accounts/${id}`);
  },

  async connectAccount(bankData) {
    return apiService.post('/banking/accounts/connect', bankData);
  },

  async disconnectAccount(id) {
    return apiService.delete(`/banking/accounts/${id}`);
  },

  // Plaid integration
  async createLinkToken() {
    return apiService.post('/banking/link-token');
  },

  async exchangePublicToken(publicToken, metadata) {
    return apiService.post('/banking/exchange-token', {
      public_token: publicToken,
      metadata
    });
  },

  // Account transactions
  async getAccountTransactions(accountId, params = {}) {
    return apiService.get(`/banking/accounts/${accountId}/transactions`, params);
  },

  async syncAccountTransactions(accountId) {
    return apiService.post(`/banking/accounts/${accountId}/sync`);
  },

  // Account balances
  async getAccountBalance(accountId) {
    return apiService.get(`/banking/accounts/${accountId}/balance`);
  },

  async refreshAccountBalance(accountId) {
    return apiService.post(`/banking/accounts/${accountId}/refresh-balance`);
  },

  // Bank reconciliation
  async getReconciliationData(accountId, params = {}) {
    return apiService.get(`/banking/accounts/${accountId}/reconciliation`, params);
  },

  async reconcileTransactions(accountId, reconciliationData) {
    return apiService.post(`/banking/accounts/${accountId}/reconcile`, reconciliationData);
  },

  // Banking reports
  async getCashFlowReport(params = {}) {
    return apiService.get('/banking/reports/cash-flow', params);
  },

  async getAccountSummary(accountId, params = {}) {
    return apiService.get(`/banking/accounts/${accountId}/summary`, params);
  }
};
