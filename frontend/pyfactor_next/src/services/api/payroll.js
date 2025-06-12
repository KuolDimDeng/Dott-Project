import axios from 'axios';
import { logger } from '@/utils/logger';
import { getSecureTenantId } from '@/utils/tenantUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Payroll API service instance
 */
const payrollApiInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/payroll`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

/**
 * Add request interceptor for tenant ID and authentication
 */
payrollApiInstance.interceptors.request.use(
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
      logger.error('[PayrollAPI] Request interceptor error:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

/**
 * Add response interceptor for error handling
 */
payrollApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.error('[PayrollAPI] Response error:', error);
    return Promise.reject(error);
  }
);

/**
 * Payroll Run API
 */
export const payrollRunApi = {
  // Get all payroll runs
  getAll: () => payrollApiInstance.get('/runs/'),
  // Get specific payroll run
  getById: (id) => payrollApiInstance.get(`/runs/${id}/`),
  // Create new payroll run
  create: (data) => payrollApiInstance.post('/run/', data),
  // Update payroll run
  update: (id, data) => payrollApiInstance.put(`/runs/${id}/`, data),
  // Delete payroll run
  delete: (id) => payrollApiInstance.delete(`/runs/${id}/`),
  // Calculate payroll
  calculate: (data) => payrollApiInstance.post('/calculate/', data),
  // Process payroll
  process: (id) => payrollApiInstance.post(`/runs/${id}/process/`),
  // Cancel payroll run
  cancel: (id) => payrollApiInstance.post(`/runs/${id}/cancel/`)
};

/**
 * Payroll Transaction API
 */
export const payrollTransactionApi = {
  // Get transactions for a payroll run
  getByRunId: (runId) => payrollApiInstance.get(`/transactions/${runId}/`),
  // Get all transactions
  getAll: () => payrollApiInstance.get('/transactions/'),
  // Get transaction by ID
  getById: (id) => payrollApiInstance.get(`/transactions/${id}/`),
  // Update transaction
  update: (id, data) => payrollApiInstance.put(`/transactions/${id}/`, data),
  // Export transactions
  export: (runId, format = 'csv') => payrollApiInstance.get(`/transactions/${runId}/export/`, {
    params: { format },
    responseType: 'blob'
  })
};

/**
 * Pay Statement API
 */
export const payStatementApi = {
  // Get all pay statements
  getAll: () => payrollApiInstance.get('/statements/'),
  // Get pay statement by ID
  getById: (id) => payrollApiInstance.get(`/statements/${id}/`),
  // Get statements by employee
  getByEmployee: (employeeId) => payrollApiInstance.get('/statements/', {
    params: { employee_id: employeeId }
  }),
  // Download pay statement
  download: (id) => payrollApiInstance.get(`/statements/${id}/download/`, {
    responseType: 'blob'
  }),
  // Email pay statement
  email: (id) => payrollApiInstance.post(`/statements/${id}/email/`)
};

/**
 * Tax Form API
 */
export const taxFormApi = {
  // Get all tax forms
  getAll: () => payrollApiInstance.get('/tax-forms/'),
  // Get tax form by ID
  getById: (id) => payrollApiInstance.get(`/tax-forms/${id}/`),
  // Create tax form
  create: (data) => payrollApiInstance.post('/tax-forms/', data),
  // Update tax form
  update: (id, data) => payrollApiInstance.put(`/tax-forms/${id}/`, data),
  // Delete tax form
  delete: (id) => payrollApiInstance.delete(`/tax-forms/${id}/`),
  // Generate W2 forms
  generateW2: (year) => payrollApiInstance.post('/tax-forms/generate-w2/', { year }),
  // Generate 1099 forms
  generate1099: (year) => payrollApiInstance.post('/tax-forms/generate-1099/', { year })
};

/**
 * Payroll Settings API
 */
export const payrollSettingsApi = {
  // Get payroll settings
  get: () => payrollApiInstance.get('/settings/'),
  // Update payroll settings
  update: (data) => payrollApiInstance.put('/settings/', data),
  // Get pay schedules
  getPaySchedules: () => payrollApiInstance.get('/settings/pay-schedules/'),
  // Update pay schedule
  updatePaySchedule: (id, data) => payrollApiInstance.put(`/settings/pay-schedules/${id}/`, data),
  // Get withholding settings
  getWithholdings: () => payrollApiInstance.get('/settings/withholdings/'),
  // Update withholding settings
  updateWithholding: (id, data) => payrollApiInstance.put(`/settings/withholdings/${id}/`, data)
};

/**
 * Payroll Reports API
 */
export const payrollReportsApi = {
  // Get payroll summary report
  getSummary: (params = {}) => payrollApiInstance.get('/reports/summary/', { params }),
  // Get tax liability report
  getTaxLiability: (params = {}) => payrollApiInstance.get('/reports/tax-liability/', { params }),
  // Get employee earnings report
  getEmployeeEarnings: (params = {}) => payrollApiInstance.get('/reports/employee-earnings/', { params }),
  // Get deductions report
  getDeductions: (params = {}) => payrollApiInstance.get('/reports/deductions/', { params }),
  // Get year-to-date report
  getYearToDate: (params = {}) => payrollApiInstance.get('/reports/year-to-date/', { params }),
  // Export report
  export: (reportType, params = {}) => payrollApiInstance.get(`/reports/${reportType}/export/`, {
    params,
    responseType: 'blob'
  })
};

/**
 * Default export with all Payroll APIs
 */
export default {
  runs: payrollRunApi,
  transactions: payrollTransactionApi,
  statements: payStatementApi,
  taxForms: taxFormApi,
  settings: payrollSettingsApi,
  reports: payrollReportsApi
};