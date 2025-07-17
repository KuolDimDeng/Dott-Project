import { apiClient } from '../apiClient';

const timesheetApi = {
  // Timesheets
  getCurrentWeek: async (params) => {
    const response = await apiClient.get('/api/timesheets/timesheets/current_week/', { params });
    return response.data;
  },

  getTimesheets: async (params) => {
    const response = await apiClient.get('/api/timesheets/timesheets/', { params });
    return response.data;
  },

  getTimesheet: async (id) => {
    const response = await apiClient.get(`/api/timesheets/timesheets/${id}/`);
    return response.data;
  },

  createTimesheet: async (data) => {
    const response = await apiClient.post('/api/timesheets/timesheets/', data);
    return response.data;
  },

  updateTimesheet: async (id, data) => {
    const response = await apiClient.patch(`/api/timesheets/timesheets/${id}/`, data);
    return response.data;
  },

  submitTimesheet: async (id) => {
    const response = await apiClient.post(`/api/timesheets/timesheets/${id}/submit/`);
    return response.data;
  },

  approveTimesheet: async (id, data) => {
    const response = await apiClient.post(`/api/timesheets/timesheets/${id}/approve/`, data);
    return response.data;
  },

  getPendingApprovals: async () => {
    const response = await apiClient.get('/api/timesheets/timesheets/pending_approvals/');
    return response.data;
  },

  // HR Management Endpoints
  getHRDashboard: async () => {
    console.log('[timesheetApi] Making HR dashboard request...');
    try {
      const response = await apiClient.get('/api/timesheets/timesheets/hr_dashboard/');
      console.log('[timesheetApi] HR dashboard response status:', response.status);
      console.log('[timesheetApi] HR dashboard response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('[timesheetApi] HR dashboard error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: error.config
      });
      throw error;
    }
  },

  bulkApproveTimesheets: async (timesheetIds) => {
    console.log('[timesheetApi] Bulk approving timesheets:', timesheetIds);
    try {
      const response = await apiClient.post('/api/timesheets/timesheets/bulk_approve/', {
        timesheet_ids: timesheetIds
      });
      console.log('[timesheetApi] Bulk approve response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[timesheetApi] Bulk approve error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  generateSalaryTimesheets: async () => {
    console.log('[timesheetApi] Generating salary timesheets...');
    try {
      const response = await apiClient.post('/api/timesheets/timesheets/generate_salary_timesheets/');
      console.log('[timesheetApi] Generate salary timesheets response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[timesheetApi] Generate salary timesheets error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  // Time Entries
  getTimeEntries: async (params) => {
    const response = await apiClient.get('/api/timesheets/time-entries/', { params });
    return response.data;
  },

  updateTimeEntry: async (id, data) => {
    const response = await apiClient.patch(`/api/timesheets/time-entries/${id}/`, data);
    return response.data;
  },

  bulkUpdateEntries: async (data) => {
    const response = await apiClient.post('/api/timesheets/time-entries/bulk_update/', data);
    return response.data;
  },

  // Clock Entries
  getClockEntries: async (params) => {
    const response = await apiClient.get('/api/timesheets/clock-entries/', { params });
    return response.data;
  },

  getCurrentClockStatus: async () => {
    const response = await apiClient.get('/api/timesheets/clock-entries/current_status/');
    return response.data;
  },

  clockInOut: async (data) => {
    const response = await apiClient.post('/api/timesheets/clock-entries/clock/', data);
    return response.data;
  },

  // Time Off Requests
  getTimeOffRequests: async (params) => {
    const response = await apiClient.get('/api/timesheets/time-off-requests/', { params });
    return response.data;
  },

  createTimeOffRequest: async (data) => {
    const response = await apiClient.post('/api/timesheets/time-off-requests/', data);
    return response.data;
  },

  updateTimeOffRequest: async (id, data) => {
    const response = await apiClient.patch(`/api/timesheets/time-off-requests/${id}/`, data);
    return response.data;
  },

  approveTimeOffRequest: async (id, data) => {
    const response = await apiClient.post(`/api/timesheets/time-off-requests/${id}/approve/`, data);
    return response.data;
  }
};

export default timesheetApi;