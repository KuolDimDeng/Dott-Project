import apiClient from './apiClient';

// Use direct fetch instead of apiClient to avoid old authentication issues
const makeRequest = async (endpoint, options = {}) => {
  const response = await fetch(endpoint, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }
  
  return response.json();
};

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
      const data = await makeRequest('/api/timesheets/timesheets/hr_dashboard/', {
        method: 'GET'
      });
      console.log('[timesheetApi] HR dashboard response data:', data);
      return data;
    } catch (error) {
      console.error('[timesheetApi] HR dashboard error:', error.message);
      throw error;
    }
  },

  bulkApproveTimesheets: async (timesheetIds) => {
    console.log('[timesheetApi] Bulk approving timesheets:', timesheetIds);
    try {
      const data = await makeRequest('/api/timesheets/timesheets/bulk_approve/', {
        method: 'POST',
        body: JSON.stringify({
          timesheet_ids: timesheetIds
        })
      });
      console.log('[timesheetApi] Bulk approve response:', data);
      return data;
    } catch (error) {
      console.error('[timesheetApi] Bulk approve error:', error.message);
      throw error;
    }
  },

  generateSalaryTimesheets: async () => {
    console.log('[timesheetApi] Generating salary timesheets...');
    try {
      const data = await makeRequest('/api/timesheets/timesheets/generate_salary_timesheets/', {
        method: 'POST',
        body: JSON.stringify({})
      });
      console.log('[timesheetApi] Generate salary timesheets response:', data);
      return data;
    } catch (error) {
      console.error('[timesheetApi] Generate salary timesheets error:', error.message);
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
    try {
      return await makeRequest('/api/hr/timesheets/current-status/', {
        method: 'GET'
      });
    } catch (error) {
      console.error('[timesheetApi] Get clock status error:', error.message);
      throw error;
    }
  },

  clockInOut: async (data) => {
    try {
      return await makeRequest('/api/hr/timesheets/clock/', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('[timesheetApi] Clock in/out error:', error.message);
      throw error;
    }
  },

  // Individual clock actions
  clockIn: async (data) => {
    try {
      const clockData = { action: 'clock_in', ...data };
      console.log('[timesheetApi] Clock in data:', clockData);
      return await makeRequest('/api/hr/timesheets/clock/', {
        method: 'POST',
        body: JSON.stringify(clockData)
      });
    } catch (error) {
      console.error('[timesheetApi] Clock in error:', error.message);
      throw error;
    }
  },

  clockOut: async (data) => {
    try {
      const clockData = { action: 'clock_out', ...data };
      console.log('[timesheetApi] Clock out data:', clockData);
      return await makeRequest('/api/hr/timesheets/clock/', {
        method: 'POST',
        body: JSON.stringify(clockData)
      });
    } catch (error) {
      console.error('[timesheetApi] Clock out error:', error.message);
      throw error;
    }
  },

  startBreak: async (data) => {
    try {
      const clockData = { action: 'start_break', ...data };
      console.log('[timesheetApi] Start break data:', clockData);
      return await makeRequest('/api/hr/timesheets/clock/', {
        method: 'POST',
        body: JSON.stringify(clockData)
      });
    } catch (error) {
      console.error('[timesheetApi] Start break error:', error.message);
      throw error;
    }
  },

  endBreak: async (data) => {
    try {
      const clockData = { action: 'end_break', ...data };
      console.log('[timesheetApi] End break data:', clockData);
      return await makeRequest('/api/hr/timesheets/clock/', {
        method: 'POST',
        body: JSON.stringify(clockData)
      });
    } catch (error) {
      console.error('[timesheetApi] End break error:', error.message);
      throw error;
    }
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