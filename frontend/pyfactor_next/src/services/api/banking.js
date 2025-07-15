import axios from 'axios';
import { logger } from '@/utils/logger';
import { getSecureTenantId } from '@/utils/tenantUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

/**
 * Banking API service instance
 */
const bankingApiInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/banking`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

/**
 * Add request interceptor for tenant ID and authentication
 */
bankingApiInstance.interceptors.request.use(
  async (config) => {
    try {
      // Get tenant ID asynchronously
      const tenantId = await getSecureTenantId();
      if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
        if (!config.params) config.params = {};
        config.params.tenantId = tenantId;
      }

      // Remove problematic CORS headers - let backend handle these
      // config.headers['X-Data-Source'] = 'AWS_RDS';
      // config.headers['X-Database-Only'] = 'true';
      // config.headers['X-Use-Mock-Data'] = 'false';

      return config;
    } catch (error) {
      logger.error('[BankingAPI] Request interceptor error:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

/**
 * Add response interceptor for error handling
 */
bankingApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.error('[BankingAPI] Response error:', error);
    return Promise.reject(error);
  }
);

/**
 * Plaid Link API - Use frontend proxy instead of direct backend calls
 */
export const plaidApi = {
  createLinkToken: (payload = {}) => {
    // Use frontend proxy to avoid CORS issues
    return fetch('/api/banking/link-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }).then(data => ({ data }));
  },
  exchangeToken: (publicToken) => {
    return fetch('/api/banking/exchange-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ public_token: publicToken })
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }).then(data => ({ data }));
  },
  getAccounts: () => bankingApiInstance.get('/accounts/'),
  getTransactions: (params = {}) => bankingApiInstance.get('/transactions/', { params }),
  createSandboxToken: () => bankingApiInstance.post('/create_sandbox_public_token/')
};

/**
 * Bank Accounts API - Use frontend proxy for key operations
 */
export const bankAccountsApi = {
  list: () => {
    return fetch('/api/banking/accounts', {
      credentials: 'include'
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }).then(data => ({ data }));
  },
  getAll: () => {
    return fetch('/api/banking/accounts', {
      credentials: 'include'
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }).then(data => ({ data }));
  },
  getById: (id) => bankingApiInstance.get(`/accounts/${id}/`),
  connect: (data) => bankingApiInstance.post('/connect-bank-account/', data),
  update: (id, data) => {
    return fetch(`/api/banking/accounts/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }).then(data => ({ data }));
  },
  delete: (accountId) => {
    return fetch(`/api/banking/accounts/${accountId}`, {
      method: 'DELETE',
      credentials: 'include'
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }).then(data => ({ data }));
  },
  getConnectedAccounts: () => {
    return fetch('/api/banking/accounts', {
      credentials: 'include'
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }).then(data => ({ data }));
  },
  disconnectAccount: (accountId) => {
    return fetch(`/api/banking/accounts/${accountId}`, {
      method: 'DELETE',
      credentials: 'include'
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }).then(data => ({ data }));
  }
};

/**
 * Bank Transactions API
 */
export const bankTransactionsApi = {
  getAll: (params = {}) => bankingApiInstance.get('/transactions/', { params }),
  getRecent: (params = {}) => bankingApiInstance.get('/recent_transactions/', { params }),
  download: (params = {}) => bankingApiInstance.get('/download_transactions/', { params }),
  getById: (id) => bankingApiInstance.get(`/transactions/${id}/`),
  create: (data) => bankingApiInstance.post('/transactions/', data),
  update: (id, data) => bankingApiInstance.put(`/transactions/${id}/`, data),
  delete: (id) => bankingApiInstance.delete(`/transactions/${id}/`)
};

/**
 * Bank Reconciliation API
 */
export const bankReconciliationApi = {
  getAll: () => bankingApiInstance.get('/reconciliation/'),
  getById: (id) => bankingApiInstance.get(`/reconciliation/${id}/`),
  create: (data) => bankingApiInstance.post('/reconciliation/', data),
  update: (id, data) => bankingApiInstance.put(`/reconciliation/${id}/`, data),
  delete: (id) => bankingApiInstance.delete(`/reconciliation/${id}/`),
  reconcile: (data) => bankingApiInstance.post('/reconciliation/reconcile/', data)
};

/**
 * Banking Reports API
 */
export const bankingReportsApi = {
  getAll: () => bankingApiInstance.get('/report/'),
  getBankingReport: (params = {}) => bankingApiInstance.get('/banking_report/', { params }),
  getAccountBalances: (params = {}) => bankingApiInstance.get('/account-balances/', { params }),
  getCashFlow: (params = {}) => bankingApiInstance.get('/cash-flow/', { params }),
  getMonthlyStatements: (params = {}) => bankingApiInstance.get('/monthly-statements/', { params })
};

/**
 * Payment Gateway API
 */
export const paymentGatewayApi = {
  getAll: () => bankingApiInstance.get('/payment-gateway/'),
  create: (data) => bankingApiInstance.post('/payment-gateway/', data),
  update: (id, data) => bankingApiInstance.put(`/payment-gateway/${id}/`, data),
  delete: (id) => bankingApiInstance.delete(`/payment-gateway/${id}/`)
};

/**
 * Default export with all banking APIs
 */
export default {
  plaid: plaidApi,
  accounts: bankAccountsApi,
  transactions: bankTransactionsApi,
  reconciliation: bankReconciliationApi,
  reports: bankingReportsApi,
  paymentGateway: paymentGatewayApi
};