import { axiosInstance } from '@/lib/axiosConfig';

export const taxesApi = {
  // Dashboard
  dashboard: {
    getSummary: () => axiosInstance.get('/taxes/dashboard/summary/'),
  },

  // Filings
  filings: {
    getUpcoming: () => axiosInstance.get('/taxes/filings/upcoming/'),
  },

  // Activities
  activities: {
    getRecent: () => axiosInstance.get('/taxes/activities/recent/'),
  },

  // Sales Tax
  salesTax: {
    getRates: () => axiosInstance.get('/taxes/sales-tax/rates/'),
    createRate: (data) => axiosInstance.post('/taxes/sales-tax/rates/', data),
    updateRate: (id, data) => axiosInstance.put(`/taxes/sales-tax/rates/${id}/`, data),
    deleteRate: (id) => axiosInstance.delete(`/taxes/sales-tax/rates/${id}/`),
    getTransactions: (params) => axiosInstance.get('/taxes/sales-tax/transactions/', { params }),
    createTransaction: (data) => axiosInstance.post('/taxes/sales-tax/transactions/', data),
  },

  // Income Tax
  incomeTax: {
    getEstimates: () => axiosInstance.get('/taxes/income-tax/estimates/'),
    updateEstimates: (data) => axiosInstance.post('/taxes/income-tax/estimates/', data),
    getQuarterlyPayments: () => axiosInstance.get('/taxes/income-tax/quarterly-payments/'),
    recordPayment: (data) => axiosInstance.post('/taxes/income-tax/payments/', data),
    getDeductions: () => axiosInstance.get('/taxes/income-tax/deductions/'),
    createDeduction: (data) => axiosInstance.post('/taxes/income-tax/deductions/', data),
    updateDeduction: (id, data) => axiosInstance.put(`/taxes/income-tax/deductions/${id}/`, data),
    deleteDeduction: (id) => axiosInstance.delete(`/taxes/income-tax/deductions/${id}/`),
  },

  // Payroll Tax
  payrollTax: {
    getSummary: () => axiosInstance.get('/taxes/payroll-tax/summary/'),
    getDeposits: () => axiosInstance.get('/taxes/payroll-tax/deposits/'),
    makeDeposit: (data) => axiosInstance.post('/taxes/payroll-tax/deposits/', data),
    getFilingSchedule: () => axiosInstance.get('/taxes/payroll-tax/filing-schedule/'),
    updateFilingSchedule: (data) => axiosInstance.put('/taxes/payroll-tax/filing-schedule/', data),
    getLiabilities: () => axiosInstance.get('/taxes/payroll-tax/liabilities/'),
  },

  // Tax Payments
  payments: {
    getHistory: (params) => axiosInstance.get('/taxes/payments/', { params }),
    getUpcoming: () => axiosInstance.get('/taxes/payments/upcoming/'),
    getSummary: () => axiosInstance.get('/taxes/payments/summary/'),
    create: (data) => axiosInstance.post('/taxes/payments/', data),
    update: (id, data) => axiosInstance.put(`/taxes/payments/${id}/`, data),
    delete: (id) => axiosInstance.delete(`/taxes/payments/${id}/`),
    schedule: (id) => axiosInstance.post(`/taxes/payments/${id}/schedule/`),
  },

  // Tax Forms
  forms: {
    getAll: (params) => axiosInstance.get('/taxes/forms/', { params }),
    getTemplates: () => axiosInstance.get('/taxes/forms/templates/'),
    getDeadlines: (params) => axiosInstance.get('/taxes/forms/deadlines/', { params }),
    generate: (data) => axiosInstance.post('/taxes/forms/generate/', data),
    download: (id) => axiosInstance.get(`/taxes/forms/${id}/download/`, { responseType: 'blob' }),
    file: (id) => axiosInstance.post(`/taxes/forms/${id}/file/`),
    getById: (id) => axiosInstance.get(`/taxes/forms/${id}/`),
    update: (id, data) => axiosInstance.put(`/taxes/forms/${id}/`, data),
    delete: (id) => axiosInstance.delete(`/taxes/forms/${id}/`),
  },

  // Tax Reports
  reports: {
    generate: (params) => axiosInstance.post('/taxes/reports/generate/', params),
    export: (params) => axiosInstance.post('/taxes/reports/export/', params, { responseType: 'blob' }),
    save: (data) => axiosInstance.post('/taxes/reports/save/', data),
    getSaved: () => axiosInstance.get('/taxes/reports/saved/'),
    deleteSaved: (id) => axiosInstance.delete(`/taxes/reports/saved/${id}/`),
  },

  // Tax Settings
  settings: {
    get: () => axiosInstance.get('/taxes/settings/'),
    update: (data) => axiosInstance.put('/taxes/settings/', data),
    getTaxProfiles: () => axiosInstance.get('/taxes/settings/profiles/'),
    createTaxProfile: (data) => axiosInstance.post('/taxes/settings/profiles/', data),
    updateTaxProfile: (id, data) => axiosInstance.put(`/taxes/settings/profiles/${id}/`, data),
    deleteTaxProfile: (id) => axiosInstance.delete(`/taxes/settings/profiles/${id}/`),
  },

  // E-Signature
  esignature: {
    // Signature Requests
    getRequests: (params) => axiosInstance.get('/taxes/esignature/requests/', { params }),
    getRequest: (id) => axiosInstance.get(`/taxes/esignature/requests/${id}/`),
    createRequest: (data) => axiosInstance.post('/taxes/esignature/requests/', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    updateRequest: (id, data) => axiosInstance.put(`/taxes/esignature/requests/${id}/`, data),
    deleteRequest: (id) => axiosInstance.delete(`/taxes/esignature/requests/${id}/`),
    
    // Signature Actions
    sendRequest: (id) => axiosInstance.post(`/taxes/esignature/requests/${id}/send/`),
    cancelRequest: (id) => axiosInstance.post(`/taxes/esignature/requests/${id}/cancel/`),
    checkStatus: (id) => axiosInstance.get(`/taxes/esignature/requests/${id}/status/`),
    downloadSigned: (id) => axiosInstance.get(`/taxes/esignature/requests/${id}/download/`, {
      responseType: 'blob'
    }),
    
    // Audit and Tracking
    getAuditTrail: (id) => axiosInstance.get(`/taxes/esignature/requests/${id}/audit/`),
    getStatistics: () => axiosInstance.get('/taxes/esignature/statistics/'),
    
    // Provider Management
    getProviders: () => axiosInstance.get('/taxes/esignature/providers/'),
    
    // Webhooks (internal use)
    handleWebhook: (provider, data) => axiosInstance.post(`/taxes/esignature/webhook/${provider}/`, data),
  },
};