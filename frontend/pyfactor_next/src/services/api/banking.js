import axios from 'axios';
import { logger } from '@/utils/logger';
import { getSecureTenantId } from '@/utils/tenantUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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
      // Get tenant ID
      const tenantId = getSecureTenantId();
      if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
        if (!config.params) config.params = {};
        config.params.tenantId = tenantId;
      }

      // Database settings
      config.headers['X-Data-Source'] = 'AWS_RDS';
      config.headers['X-Database-Only'] = 'true';
      config.headers['X-Use-Mock-Data'] = 'false';

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
 * Plaid Link API
 */
export const plaidApi = {
  createLinkToken: () => bankingApiInstance.post('/link_token/'),
  exchangeToken: (publicToken) => bankingApiInstance.post('/exchange_token/', { 
    public_token: publicToken 
  }),
  getAccounts: () => bankingApiInstance.get('/accounts/'),
  getTransactions: (params = {}) => bankingApiInstance.get('/transactions/', { params }),
  createSandboxToken: () => bankingApiInstance.post('/create_sandbox_public_token/')
};

/**
 * Bank Accounts API
 */
export const bankAccountsApi = {
  getAll: () => bankingApiInstance.get('/accounts/'),
  getById: (id) => bankingApiInstance.get(`/accounts/${id}/`),
  connect: (data) => bankingApiInstance.post('/connect-bank-account/', data),
  getConnectedAccounts: () => bankingApiInstance.get('/accounts/')
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