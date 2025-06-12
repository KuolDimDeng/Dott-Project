import axios from 'axios';
import { logger } from '@/utils/logger';
import { getSecureTenantId } from '@/utils/tenantUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * HR API service instance
 */
const hrApiInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/hr`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

/**
 * Add request interceptor for tenant ID and authentication
 */
hrApiInstance.interceptors.request.use(
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
      logger.error('[HRAPI] Request interceptor error:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

/**
 * Add response interceptor for error handling
 */
hrApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.error('[HRAPI] Response error:', error);
    return Promise.reject(error);
  }
);

/**
 * Employees API
 */
export const employeesApi = {
  getAll: () => hrApiInstance.get('/employees/'),
  getById: (id) => hrApiInstance.get(`/employees/${id}/`),
  create: (data) => hrApiInstance.post('/employees/', data),
  update: (id, data) => hrApiInstance.put(`/employees/${id}/`, data),
  delete: (id) => hrApiInstance.delete(`/employees/${id}/`),
  setPermissions: (id, permissions) => hrApiInstance.post(`/employees/${id}/permissions/`, permissions),
  getAvailablePermissions: () => hrApiInstance.get('/permissions/available/'),
  setupPassword: (data) => hrApiInstance.post('/setup-password/', data)
};

/**
 * Roles API
 */
export const rolesApi = {
  getAll: () => hrApiInstance.get('/roles/'),
  getById: (id) => hrApiInstance.get(`/roles/${id}/`),
  create: (data) => hrApiInstance.post('/roles/', data),
  update: (id, data) => hrApiInstance.put(`/roles/${id}/`, data),
  delete: (id) => hrApiInstance.delete(`/roles/${id}/`)
};

/**
 * Employee Roles API
 */
export const employeeRolesApi = {
  getAll: () => hrApiInstance.get('/employee-roles/'),
  getById: (id) => hrApiInstance.get(`/employee-roles/${id}/`),
  create: (data) => hrApiInstance.post('/employee-roles/', data),
  update: (id, data) => hrApiInstance.put(`/employee-roles/${id}/`, data),
  delete: (id) => hrApiInstance.delete(`/employee-roles/${id}/`)
};

/**
 * Access Permissions API
 */
export const accessPermissionsApi = {
  getAll: () => hrApiInstance.get('/access-permissions/'),
  getById: (id) => hrApiInstance.get(`/access-permissions/${id}/`),
  create: (data) => hrApiInstance.post('/access-permissions/', data),
  update: (id, data) => hrApiInstance.put(`/access-permissions/${id}/`, data),
  delete: (id) => hrApiInstance.delete(`/access-permissions/${id}/`)
};

/**
 * Preboarding Forms API
 */
export const preboardingFormsApi = {
  getAll: () => hrApiInstance.get('/preboarding-forms/'),
  getById: (id) => hrApiInstance.get(`/preboarding-forms/${id}/`),
  create: (data) => hrApiInstance.post('/preboarding-forms/', data),
  update: (id, data) => hrApiInstance.put(`/preboarding-forms/${id}/`, data),
  delete: (id) => hrApiInstance.delete(`/preboarding-forms/${id}/`)
};

/**
 * Performance Management API
 */
export const performanceApi = {
  reviews: {
    getAll: () => hrApiInstance.get('/performance/reviews/'),
    getById: (id) => hrApiInstance.get(`/performance/reviews/${id}/`),
    create: (data) => hrApiInstance.post('/performance/reviews/', data),
    update: (id, data) => hrApiInstance.put(`/performance/reviews/${id}/`, data),
    delete: (id) => hrApiInstance.delete(`/performance/reviews/${id}/`)
  },
  metrics: {
    getAll: () => hrApiInstance.get('/performance/metrics/'),
    getById: (id) => hrApiInstance.get(`/performance/metrics/${id}/`),
    create: (data) => hrApiInstance.post('/performance/metrics/', data),
    update: (id, data) => hrApiInstance.put(`/performance/metrics/${id}/`, data),
    delete: (id) => hrApiInstance.delete(`/performance/metrics/${id}/`)
  },
  ratings: {
    getAll: () => hrApiInstance.get('/performance/ratings/'),
    getById: (id) => hrApiInstance.get(`/performance/ratings/${id}/`),
    create: (data) => hrApiInstance.post('/performance/ratings/', data),
    update: (id, data) => hrApiInstance.put(`/performance/ratings/${id}/`, data),
    delete: (id) => hrApiInstance.delete(`/performance/ratings/${id}/`)
  },
  goals: {
    getAll: () => hrApiInstance.get('/performance/goals/'),
    getById: (id) => hrApiInstance.get(`/performance/goals/${id}/`),
    create: (data) => hrApiInstance.post('/performance/goals/', data),
    update: (id, data) => hrApiInstance.put(`/performance/goals/${id}/`, data),
    delete: (id) => hrApiInstance.delete(`/performance/goals/${id}/`)
  },
  feedback: {
    getAll: () => hrApiInstance.get('/performance/feedback/'),
    getById: (id) => hrApiInstance.get(`/performance/feedback/${id}/`),
    create: (data) => hrApiInstance.post('/performance/feedback/', data),
    update: (id, data) => hrApiInstance.put(`/performance/feedback/${id}/`, data),
    delete: (id) => hrApiInstance.delete(`/performance/feedback/${id}/`)
  },
  settings: {
    getAll: () => hrApiInstance.get('/performance/settings/'),
    getById: (id) => hrApiInstance.get(`/performance/settings/${id}/`),
    create: (data) => hrApiInstance.post('/performance/settings/', data),
    update: (id, data) => hrApiInstance.put(`/performance/settings/${id}/`, data),
    delete: (id) => hrApiInstance.delete(`/performance/settings/${id}/`)
  }
};

/**
 * Timesheets API
 */
export const timesheetsApi = {
  getAll: () => hrApiInstance.get('/timesheets/'),
  getById: (id) => hrApiInstance.get(`/timesheets/${id}/`),
  create: (data) => hrApiInstance.post('/timesheets/', data),
  update: (id, data) => hrApiInstance.put(`/timesheets/${id}/`, data),
  delete: (id) => hrApiInstance.delete(`/timesheets/${id}/`),
  submit: (id) => hrApiInstance.post(`/timesheets/${id}/submit/`),
  approve: (id) => hrApiInstance.post(`/timesheets/${id}/approve/`),
  reject: (id, reason) => hrApiInstance.post(`/timesheets/${id}/reject/`, { reason })
};

/**
 * Benefits API
 */
export const benefitsApi = {
  getAll: () => hrApiInstance.get('/benefits/'),
  getById: (id) => hrApiInstance.get(`/benefits/${id}/`),
  create: (data) => hrApiInstance.post('/benefits/', data),
  update: (id, data) => hrApiInstance.put(`/benefits/${id}/`, data),
  delete: (id) => hrApiInstance.delete(`/benefits/${id}/`),
  enrollments: {
    getAll: () => hrApiInstance.get('/benefits/enrollments/'),
    getById: (id) => hrApiInstance.get(`/benefits/enrollments/${id}/`),
    create: (data) => hrApiInstance.post('/benefits/enrollments/', data),
    update: (id, data) => hrApiInstance.put(`/benefits/enrollments/${id}/`, data),
    delete: (id) => hrApiInstance.delete(`/benefits/enrollments/${id}/`)
  }
};

/**
 * Time Off API
 */
export const timeOffApi = {
  requests: {
    getAll: () => hrApiInstance.get('/time-off-requests/'),
    getById: (id) => hrApiInstance.get(`/time-off-requests/${id}/`),
    create: (data) => hrApiInstance.post('/time-off-requests/', data),
    update: (id, data) => hrApiInstance.put(`/time-off-requests/${id}/`, data),
    delete: (id) => hrApiInstance.delete(`/time-off-requests/${id}/`),
    approve: (id) => hrApiInstance.post(`/time-off-requests/${id}/approve/`),
    reject: (id, reason) => hrApiInstance.post(`/time-off-requests/${id}/reject/`, { reason })
  },
  balances: {
    getAll: () => hrApiInstance.get('/time-off-balances/'),
    getById: (id) => hrApiInstance.get(`/time-off-balances/${id}/`),
    create: (data) => hrApiInstance.post('/time-off-balances/', data),
    update: (id, data) => hrApiInstance.put(`/time-off-balances/${id}/`, data),
    delete: (id) => hrApiInstance.delete(`/time-off-balances/${id}/`)
  }
};

/**
 * HR Reports API
 */
export const hrReportsApi = {
  getAll: () => hrApiInstance.get('/reports/'),
  getEmployeeReport: (params = {}) => hrApiInstance.get('/reports/employees/', { params }),
  getTimesheetReport: (params = {}) => hrApiInstance.get('/reports/timesheets/', { params }),
  getPayrollReport: (params = {}) => hrApiInstance.get('/reports/payroll/', { params }),
  getBenefitsReport: (params = {}) => hrApiInstance.get('/reports/benefits/', { params }),
  getPerformanceReport: (params = {}) => hrApiInstance.get('/reports/performance/', { params })
};

/**
 * Default export with all HR APIs
 */
export default {
  employees: employeesApi,
  roles: rolesApi,
  employeeRoles: employeeRolesApi,
  accessPermissions: accessPermissionsApi,
  preboardingForms: preboardingFormsApi,
  performance: performanceApi,
  timesheets: timesheetsApi,
  benefits: benefitsApi,
  timeOff: timeOffApi,
  reports: hrReportsApi
};