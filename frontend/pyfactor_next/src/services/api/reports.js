import { axiosInstance } from '@/lib/axiosConfig';

export const reportsApi = {
  // Generate report
  generate: (params) => axiosInstance.post('/reports/generate/', params),
  
  // Export report
  export: (params) => axiosInstance.post('/reports/export/', params, { responseType: 'blob' }),
  
  // Get recent reports
  getRecent: () => axiosInstance.get('/reports/recent/'),
  
  // Get favorite reports
  getFavorites: () => axiosInstance.get('/reports/favorites/'),
  
  // Toggle favorite status
  toggleFavorite: (reportId) => axiosInstance.post(`/reports/${reportId}/toggle-favorite/`),
  
  // Get report statistics
  getStats: () => axiosInstance.get('/reports/stats/'),
  
  // Save report
  save: (data) => axiosInstance.post('/reports/save/', data),
  
  // Get saved reports
  getSaved: () => axiosInstance.get('/reports/saved/'),
  
  // Delete saved report
  deleteSaved: (id) => axiosInstance.delete(`/reports/saved/${id}/`),
  
  // Schedule report
  schedule: (data) => axiosInstance.post('/reports/schedule/', data),
  
  // Get scheduled reports
  getScheduled: () => axiosInstance.get('/reports/scheduled/'),
  
  // Update scheduled report
  updateScheduled: (id, data) => axiosInstance.put(`/reports/scheduled/${id}/`, data),
  
  // Delete scheduled report
  deleteScheduled: (id) => axiosInstance.delete(`/reports/scheduled/${id}/`),
  
  // Report-specific endpoints
  financial: {
    incomeStatement: (params) => axiosInstance.get('/reports/financial/income-statement/', { params }),
    balanceSheet: (params) => axiosInstance.get('/reports/financial/balance-sheet/', { params }),
    cashFlow: (params) => axiosInstance.get('/reports/financial/cash-flow/', { params }),
  },
  
  tax: {
    salesTax: (params) => axiosInstance.get('/reports/tax/sales-tax/', { params }),
    payrollTax: (params) => axiosInstance.get('/reports/tax/payroll-tax/', { params }),
  },
  
  customer: {
    incomeByCustomer: (params) => axiosInstance.get('/reports/customer/income-by-customer/', { params }),
    agedReceivables: (params) => axiosInstance.get('/reports/customer/aged-receivables/', { params }),
  },
  
  vendor: {
    purchasesByVendor: (params) => axiosInstance.get('/reports/vendor/purchases-by-vendor/', { params }),
    agedPayables: (params) => axiosInstance.get('/reports/vendor/aged-payables/', { params }),
  },
  
  accounting: {
    accountBalances: (params) => axiosInstance.get('/reports/accounting/account-balances/', { params }),
    trialBalance: (params) => axiosInstance.get('/reports/accounting/trial-balance/', { params }),
    generalLedger: (params) => axiosInstance.get('/reports/accounting/general-ledger/', { params }),
  },
};