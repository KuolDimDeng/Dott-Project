import axiosInstance from './axiosInstance';

const jobsApi = {
  // Job CRUD operations
  getJobs: (params = {}) => axiosInstance.get('/jobs/', { params }),
  getJob: (id) => axiosInstance.get(`/jobs/${id}/`),
  createJob: (data) => axiosInstance.post('/jobs/', data),
  updateJob: (id, data) => axiosInstance.put(`/jobs/${id}/`, data),
  deleteJob: (id) => axiosInstance.delete(`/jobs/${id}/`),
  
  // Job workflow actions
  sendQuote: (id, data) => axiosInstance.post(`/jobs/${id}/send_quote/`, data),
  updateStatus: (id, data) => axiosInstance.post(`/jobs/${id}/update_status/`, data),
  captureSignature: (id, data) => axiosInstance.post(`/jobs/${id}/capture_signature/`, data),
  generateInvoice: (id, data = {}) => axiosInstance.post(`/jobs/${id}/generate_invoice/`, data),
  
  // Payment methods
  createPaymentSession: (id, data) => axiosInstance.post(`/jobs/${id}/create_payment_session/`, data),
  initiateMpesaPayment: (id, data) => axiosInstance.post(`/jobs/${id}/initiate_mpesa_payment/`, data),
  checkMpesaStatus: (checkoutRequestId) => axiosInstance.get(`/jobs/mpesa_status/${checkoutRequestId}/`),
  getBankTransferInstructions: (id, data) => axiosInstance.post(`/jobs/${id}/bank_transfer_instructions/`, data),
  
  // Job documents
  getDocuments: (jobId) => axiosInstance.get(`/jobs/${jobId}/documents/`),
  uploadDocument: (jobId, data) => axiosInstance.post(`/jobs/${jobId}/documents/`, data),
  deleteDocument: (jobId, documentId) => axiosInstance.delete(`/jobs/${jobId}/documents/${documentId}/`),
  uploadReceipt: (jobId, data) => axiosInstance.post(`/jobs/${jobId}/documents/upload-receipt/`, data),
  
  // Status history and communications
  getStatusHistory: (jobId) => axiosInstance.get(`/jobs/${jobId}/status-history/`),
  getCommunications: (jobId) => axiosInstance.get(`/jobs/${jobId}/communications/`),
  addCommunication: (jobId, data) => axiosInstance.post(`/jobs/${jobId}/communications/`, data),
  
  // Job materials, labor, and expenses
  getMaterials: (jobId) => axiosInstance.get(`/jobs/${jobId}/materials/`),
  addMaterial: (jobId, data) => axiosInstance.post(`/jobs/${jobId}/materials/`, data),
  updateMaterial: (jobId, materialId, data) => axiosInstance.put(`/jobs/${jobId}/materials/${materialId}/`, data),
  deleteMaterial: (jobId, materialId) => axiosInstance.delete(`/jobs/${jobId}/materials/${materialId}/`),
  
  getLabor: (jobId) => axiosInstance.get(`/jobs/${jobId}/labor/`),
  addLabor: (jobId, data) => axiosInstance.post(`/jobs/${jobId}/labor/`, data),
  updateLabor: (jobId, laborId, data) => axiosInstance.put(`/jobs/${jobId}/labor/${laborId}/`, data),
  deleteLabor: (jobId, laborId) => axiosInstance.delete(`/jobs/${jobId}/labor/${laborId}/`),
  
  getExpenses: (jobId) => axiosInstance.get(`/jobs/${jobId}/expenses/`),
  addExpense: (jobId, data) => axiosInstance.post(`/jobs/${jobId}/expenses/`, data),
  updateExpense: (jobId, expenseId, data) => axiosInstance.put(`/jobs/${jobId}/expenses/${expenseId}/`, data),
  deleteExpense: (jobId, expenseId) => axiosInstance.delete(`/jobs/${jobId}/expenses/${expenseId}/`),
  
  // Analytics and reports
  getCosting: (id) => axiosInstance.get(`/jobs/${id}/costing/`),
  getStats: (params = {}) => axiosInstance.get('/jobs/stats/', { params }),
  getProfitability: (params = {}) => axiosInstance.get('/jobs/profitability/', { params }),
  
  // Recurring jobs
  createRecurringInstances: (id, data) => axiosInstance.post(`/jobs/${id}/create_recurring_instances/`, data),
  getRecurringSeries: (id) => axiosInstance.get(`/jobs/${id}/recurring_series/`),
  
  // Utilities
  generateJobNumber: (prefix = 'JOB') => axiosInstance.get('/jobs/generate_number/', { params: { prefix } }),
  
  // Form data
  getCustomers: () => axiosInstance.get('/jobs/data/customers/'),
  getEmployees: () => axiosInstance.get('/jobs/data/employees/'),
  getSupplies: () => axiosInstance.get('/jobs/data/supplies/'),
  
  // Vehicles
  getVehicles: () => axiosInstance.get('/jobs/vehicles/'),
  getAvailableVehicles: () => axiosInstance.get('/jobs/vehicles/available/'),
  createVehicle: (data) => axiosInstance.post('/jobs/vehicles/', data),
  updateVehicle: (id, data) => axiosInstance.put(`/jobs/vehicles/${id}/`, data),
  deleteVehicle: (id) => axiosInstance.delete(`/jobs/vehicles/${id}/`),
  assignVehicle: (id, data) => axiosInstance.post(`/jobs/vehicles/${id}/assign/`, data),
  updateVehicleMileage: (id, data) => axiosInstance.post(`/jobs/vehicles/${id}/update_mileage/`, data)
};

export default jobsApi;