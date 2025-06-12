import axios from 'axios';
import { logger } from '@/utils/logger';
import { getSecureTenantId } from '@/utils/tenantUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Finance/Accounting API service instance
 */
const financeApiInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/finance`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

/**
 * Add request interceptor for tenant ID and authentication
 */
financeApiInstance.interceptors.request.use(
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
      logger.error('[FinanceAPI] Request interceptor error:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

/**
 * Add response interceptor for error handling
 */
financeApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.error('[FinanceAPI] Response error:', error);
    return Promise.reject(error);
  }
);

/**
 * Chart of Accounts API
 */
export const chartOfAccountsApi = {
  getAll: () => financeApiInstance.get('/chart-of-accounts/'),
  getById: (id) => financeApiInstance.get(`/chart-of-accounts/${id}/`),
  create: (data) => financeApiInstance.post('/chart-of-accounts/', data),
  update: (id, data) => financeApiInstance.put(`/chart-of-accounts/${id}/`, data),
  delete: (id) => financeApiInstance.delete(`/chart-of-accounts/${id}/`)
};

/**
 * Accounts API
 */
export const accountsApi = {
  getAll: () => financeApiInstance.get('/accounts/'),
  getById: (id) => financeApiInstance.get(`/accounts/${id}/`),
  create: (data) => financeApiInstance.post('/accounts/', data),
  update: (id, data) => financeApiInstance.put(`/accounts/${id}/`, data),
  delete: (id) => financeApiInstance.delete(`/accounts/${id}/`)
};

/**
 * Journal Entries API
 */
export const journalEntriesApi = {
  getAll: () => financeApiInstance.get('/journal-entries/'),
  getById: (id) => financeApiInstance.get(`/journal-entries/${id}/`),
  create: (data) => financeApiInstance.post('/journal-entries/', data),
  update: (id, data) => financeApiInstance.put(`/journal-entries/${id}/`, data),
  delete: (id) => financeApiInstance.delete(`/journal-entries/${id}/`),
  post: (id) => financeApiInstance.post(`/journal-entries/${id}/post/`)
};

/**
 * General Ledger API
 */
export const generalLedgerApi = {
  get: (params) => financeApiInstance.get('/general-ledger/', { params }),
  getSummary: (params) => financeApiInstance.get('/general-ledger-summary/', { params })
};

/**
 * Reconciliation API
 */
export const reconciliationApi = {
  getAll: () => financeApiInstance.get('/reconciliations/'),
  getById: (id) => financeApiInstance.get(`/reconciliations/${id}/`),
  create: (data) => financeApiInstance.post('/reconciliations/', data),
  update: (id, data) => financeApiInstance.put(`/reconciliations/${id}/`, data),
  
  // Reconciliation Items
  getItems: () => financeApiInstance.get('/reconciliation-items/'),
  getItemById: (id) => financeApiInstance.get(`/reconciliation-items/${id}/`),
  createItem: (data) => financeApiInstance.post('/reconciliation-items/', data),
  updateItem: (id, data) => financeApiInstance.put(`/reconciliation-items/${id}/`, data)
};

/**
 * Financial Statements API
 */
export const financialStatementsApi = {
  profitAndLoss: (params) => financeApiInstance.get('/profit-and-loss/', { params }),
  balanceSheet: (params) => financeApiInstance.get('/balance-sheet/', { params }),
  cashFlow: (params) => financeApiInstance.get('/cash-flow/', { params })
};

/**
 * Fixed Assets API
 */
export const fixedAssetsApi = {
  getAll: () => financeApiInstance.get('/fixed-assets/'),
  getById: (id) => financeApiInstance.get(`/fixed-assets/${id}/`),
  create: (data) => financeApiInstance.post('/fixed-assets/', data),
  update: (id, data) => financeApiInstance.put(`/fixed-assets/${id}/`, data),
  delete: (id) => financeApiInstance.delete(`/fixed-assets/${id}/`)
};

/**
 * Budgets API
 */
export const budgetsApi = {
  getAll: () => financeApiInstance.get('/budgets/'),
  getById: (id) => financeApiInstance.get(`/budgets/${id}/`),
  create: (data) => financeApiInstance.post('/budgets/', data),
  update: (id, data) => financeApiInstance.put(`/budgets/${id}/`, data),
  delete: (id) => financeApiInstance.delete(`/budgets/${id}/`)
};

/**
 * Transactions API
 */
export const transactionsApi = {
  getAll: () => financeApiInstance.get('/transactions/'),
  create: (data) => financeApiInstance.post('/transactions/create/', data)
};

/**
 * Account Types API
 */
export const accountTypesApi = {
  getAll: () => financeApiInstance.get('/account-types/'),
  create: (data) => financeApiInstance.post('/account-types/', data)
};

/**
 * Account Categories API
 */
export const accountCategoriesApi = {
  getAll: () => financeApiInstance.get('/account-categories/'),
  getById: (id) => financeApiInstance.get(`/account-categories/${id}/`),
  create: (data) => financeApiInstance.post('/account-categories/', data),
  update: (id, data) => financeApiInstance.put(`/account-categories/${id}/`, data)
};

/**
 * Month End API
 */
export const monthEndApi = {
  getClosings: () => financeApiInstance.get('/month-end-closings/'),
  getClosingById: (id) => financeApiInstance.get(`/month-end-closings/${id}/`),
  createClosing: (data) => financeApiInstance.post('/month-end-closings/', data),
  updateTask: (id, data) => financeApiInstance.put(`/month-end-tasks/${id}/`, data)
};

/**
 * Intercompany API
 */
export const intercompanyApi = {
  getTransactions: () => financeApiInstance.get('/intercompany-transactions/'),
  getTransactionById: (id) => financeApiInstance.get(`/intercompany-transactions/${id}/`),
  createTransaction: (data) => financeApiInstance.post('/intercompany-transactions/', data),
  
  getAccounts: () => financeApiInstance.get('/intercompany-accounts/'),
  getAccountById: (id) => financeApiInstance.get(`/intercompany-accounts/${id}/`),
  createAccount: (data) => financeApiInstance.post('/intercompany-accounts/', data)
};

/**
 * Audit Trail API
 */
export const auditTrailApi = {
  getAll: (params) => financeApiInstance.get('/audit-trail/', { params }),
  getById: (id) => financeApiInstance.get(`/audit-trail/${id}/`)
};

/**
 * Export the main finance API instance and all sub-APIs
 */
export {
  financeApiInstance as default,
  financeApiInstance
};

export const financeApi = {
  chartOfAccounts: chartOfAccountsApi,
  accounts: accountsApi,
  journalEntries: journalEntriesApi,
  generalLedger: generalLedgerApi,
  reconciliation: reconciliationApi,
  financialStatements: financialStatementsApi,
  fixedAssets: fixedAssetsApi,
  budgets: budgetsApi,
  transactions: transactionsApi,
  accountTypes: accountTypesApi,
  accountCategories: accountCategoriesApi,
  monthEnd: monthEndApi,
  intercompany: intercompanyApi,
  auditTrail: auditTrailApi
};