// Employee API v2 - Clean implementation
import { logger } from './logger';

const API_BASE = '/api/hr/v2';

// Helper to add tenant ID to headers
const getHeaders = (tenantId) => ({
  'Content-Type': 'application/json',
  'X-Tenant-ID': tenantId,
});

// Employee API v2 client
export const employeeApiV2 = {
  // List all employees
  async list(tenantId) {
    try {
      logger.info('[Employee API v2] Fetching employees list');
      
      const response = await fetch(`${API_BASE}/employees`, {
        method: 'GET',
        credentials: 'include',
        headers: getHeaders(tenantId),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info(`[Employee API v2] Fetched ${data.count} employees`);
      
      return data;
    } catch (error) {
      logger.error('[Employee API v2] List error:', error);
      throw error;
    }
  },

  // Create new employee
  async create(employeeData, tenantId) {
    try {
      logger.info('[Employee API v2] Creating employee:', {
        email: employeeData.email,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
      });

      const response = await fetch(`${API_BASE}/employees`, {
        method: 'POST',
        credentials: 'include',
        headers: getHeaders(tenantId),
        body: JSON.stringify({
          ...employeeData,
          tenantId, // Include in body as well
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      logger.info('[Employee API v2] Employee created:', data.data?.id);
      
      return data;
    } catch (error) {
      logger.error('[Employee API v2] Create error:', error);
      throw error;
    }
  },

  // Get single employee
  async get(employeeId, tenantId) {
    try {
      logger.info(`[Employee API v2] Fetching employee ${employeeId}`);
      
      const response = await fetch(`${API_BASE}/employees/${employeeId}`, {
        method: 'GET',
        credentials: 'include',
        headers: getHeaders(tenantId),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('[Employee API v2] Fetched employee:', data.data?.email);
      
      return data;
    } catch (error) {
      logger.error('[Employee API v2] Get error:', error);
      throw error;
    }
  },

  // Update employee
  async update(employeeId, updates, tenantId) {
    try {
      logger.info(`[Employee API v2] Updating employee ${employeeId}`);
      
      const response = await fetch(`${API_BASE}/employees/${employeeId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: getHeaders(tenantId),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      logger.info('[Employee API v2] Employee updated successfully');
      
      return data;
    } catch (error) {
      logger.error('[Employee API v2] Update error:', error);
      throw error;
    }
  },

  // Delete employee
  async delete(employeeId, tenantId) {
    try {
      logger.info(`[Employee API v2] Deleting employee ${employeeId}`);
      
      const response = await fetch(`${API_BASE}/employees/${employeeId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getHeaders(tenantId),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      logger.info('[Employee API v2] Employee deleted successfully');
      
      return { success: true };
    } catch (error) {
      logger.error('[Employee API v2] Delete error:', error);
      throw error;
    }
  },

  // Get statistics
  async getStats(tenantId) {
    try {
      logger.info('[Employee API v2] Fetching employee statistics');
      
      const response = await fetch(`${API_BASE}/employees/stats`, {
        method: 'GET',
        credentials: 'include',
        headers: getHeaders(tenantId),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('[Employee API v2] Fetched statistics:', data.data);
      
      return data;
    } catch (error) {
      logger.error('[Employee API v2] Stats error:', error);
      throw error;
    }
  },
};