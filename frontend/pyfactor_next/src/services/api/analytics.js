import { axiosInstance } from '@/lib/axiosConfig';

export const analyticsApi = {
  // Key Metrics
  getKeyMetrics: (params) => axiosInstance.get('/analytics/metrics/', { params }),
  
  // Chart Data
  getChartData: (params) => axiosInstance.get('/analytics/charts/', { params }),
  
  // Dashboard Data
  getDashboardData: (params) => axiosInstance.get('/analytics/dashboard/', { params }),
  
  // Revenue Analytics
  revenue: {
    getTrends: (params) => axiosInstance.get('/analytics/revenue/trends/', { params }),
    getByProduct: (params) => axiosInstance.get('/analytics/revenue/by-product/', { params }),
    getByCustomer: (params) => axiosInstance.get('/analytics/revenue/by-customer/', { params }),
    getByCategory: (params) => axiosInstance.get('/analytics/revenue/by-category/', { params }),
    getForecast: (params) => axiosInstance.get('/analytics/revenue/forecast/', { params }),
  },
  
  // Expense Analytics
  expenses: {
    getTrends: (params) => axiosInstance.get('/analytics/expenses/trends/', { params }),
    getByCategory: (params) => axiosInstance.get('/analytics/expenses/by-category/', { params }),
    getByVendor: (params) => axiosInstance.get('/analytics/expenses/by-vendor/', { params }),
    getBudgetComparison: (params) => axiosInstance.get('/analytics/expenses/budget-comparison/', { params }),
  },
  
  // Customer Analytics
  customers: {
    getGrowth: (params) => axiosInstance.get('/analytics/customers/growth/', { params }),
    getRetention: (params) => axiosInstance.get('/analytics/customers/retention/', { params }),
    getLifetimeValue: (params) => axiosInstance.get('/analytics/customers/lifetime-value/', { params }),
    getSegmentation: (params) => axiosInstance.get('/analytics/customers/segmentation/', { params }),
    getChurn: (params) => axiosInstance.get('/analytics/customers/churn/', { params }),
  },
  
  // Cash Flow Analytics
  cashFlow: {
    getAnalysis: (params) => axiosInstance.get('/analytics/cash-flow/analysis/', { params }),
    getForecast: (params) => axiosInstance.get('/analytics/cash-flow/forecast/', { params }),
    getRunway: (params) => axiosInstance.get('/analytics/cash-flow/runway/', { params }),
  },
  
  // Performance Analytics
  performance: {
    getKPIs: (params) => axiosInstance.get('/analytics/performance/kpis/', { params }),
    getBenchmarks: (params) => axiosInstance.get('/analytics/performance/benchmarks/', { params }),
    getScorecard: (params) => axiosInstance.get('/analytics/performance/scorecard/', { params }),
  },
  
  // AI Insights
  ai: {
    query: (data) => axiosInstance.post('/analytics/ai/query/', data),
    getInsights: (params) => axiosInstance.get('/analytics/ai/insights/', { params }),
    getSuggestions: (params) => axiosInstance.get('/analytics/ai/suggestions/', { params }),
    getAnomalies: (params) => axiosInstance.get('/analytics/ai/anomalies/', { params }),
  },
  
  // Custom Analytics
  custom: {
    create: (data) => axiosInstance.post('/analytics/custom/', data),
    get: (id) => axiosInstance.get(`/analytics/custom/${id}/`),
    update: (id, data) => axiosInstance.put(`/analytics/custom/${id}/`, data),
    delete: (id) => axiosInstance.delete(`/analytics/custom/${id}/`),
    list: (params) => axiosInstance.get('/analytics/custom/', { params }),
  },
  
  // Export Analytics
  export: {
    dashboard: (params) => axiosInstance.get('/analytics/export/dashboard/', { params, responseType: 'blob' }),
    report: (params) => axiosInstance.get('/analytics/export/report/', { params, responseType: 'blob' }),
  },
};