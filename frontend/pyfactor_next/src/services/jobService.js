import { fetchData, postData, putData } from './apiService';
import { logger } from '@/utils/logger';
import { getTenantHeaders } from '@/utils/tenantUtils';

/**
 * Job Service - Handle all job-related API calls
 * Manages jobs, materials, labor, expenses, and job costing
 */

class JobService {
  constructor() {
    this.baseUrl = '/api/jobs';
  }

  /**
   * Get all jobs with optional filters
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} List of jobs
   */
  async getJobs(filters = {}) {
    try {
      const response = await fetchData(`${this.baseUrl}/`, {
        params: filters,
        useCache: true,
        cacheTTL: 5 * 60 * 1000 // 5 minutes
      });
      return response || [];
    } catch (error) {
      logger.error('Error fetching jobs:', error);
      throw error;
    }
  }

  /**
   * Get all jobs (alias for mobile compatibility)
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} List of jobs
   */
  async getAllJobs(filters = {}) {
    return this.getJobs(filters);
  }

  /**
   * Get job by ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job details
   */
  async getJobById(jobId) {
    try {
      const response = await fetchData(`${this.baseUrl}/${jobId}/`);
      return response;
    } catch (error) {
      logger.error(`Error fetching job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new job
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} Created job
   */
  async createJob(jobData) {
    try {
      const tenantHeaders = getTenantHeaders();
      const response = await postData(`${this.baseUrl}/`, jobData, {
        headers: tenantHeaders,
        invalidateCache: [`${this.baseUrl}/`]
      });
      return response;
    } catch (error) {
      logger.error('Error creating job:', error);
      throw error;
    }
  }

  /**
   * Update an existing job
   * @param {string} jobId - Job ID
   * @param {Object} jobData - Updated job data
   * @returns {Promise<Object>} Updated job
   */
  async updateJob(jobId, jobData) {
    try {
      const tenantHeaders = getTenantHeaders();
      const response = await putData(`${this.baseUrl}/${jobId}/`, jobData, {
        headers: tenantHeaders,
        invalidateCache: [`${this.baseUrl}/`, `${this.baseUrl}/${jobId}/`]
      });
      return response;
    } catch (error) {
      logger.error(`Error updating job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a job
   * @param {string} jobId - Job ID
   * @returns {Promise<void>}
   */
  async deleteJob(jobId) {
    try {
      const tenantHeaders = getTenantHeaders();
      await fetch(`${this.baseUrl}/${jobId}/`, {
        method: 'DELETE',
        headers: tenantHeaders
      });
    } catch (error) {
      logger.error(`Error deleting job ${jobId}:`, error);
      throw error;
    }
  }

  // ========== JOB MATERIALS ==========

  /**
   * Get materials for a job
   * @param {string} jobId - Job ID
   * @returns {Promise<Array>} Job materials
   */
  async getJobMaterials(jobId) {
    try {
      const response = await fetchData(`${this.baseUrl}/${jobId}/materials/`);
      return response || [];
    } catch (error) {
      logger.error(`Error fetching materials for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Add material to a job
   * @param {string} jobId - Job ID
   * @param {Object} materialData - Material data
   * @returns {Promise<Object>} Added material
   */
  async addJobMaterial(jobId, materialData) {
    try {
      const tenantHeaders = getTenantHeaders();
      const response = await postData(`${this.baseUrl}/${jobId}/materials/`, materialData, {
        headers: tenantHeaders,
        invalidateCache: [`${this.baseUrl}/${jobId}/materials/`]
      });
      return response;
    } catch (error) {
      logger.error(`Error adding material to job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Update job material
   * @param {string} jobId - Job ID
   * @param {string} materialId - Material ID
   * @param {Object} materialData - Updated material data
   * @returns {Promise<Object>} Updated material
   */
  async updateJobMaterial(jobId, materialId, materialData) {
    try {
      const tenantHeaders = getTenantHeaders();
      const response = await putData(`${this.baseUrl}/${jobId}/materials/${materialId}/`, materialData, {
        headers: tenantHeaders,
        invalidateCache: [`${this.baseUrl}/${jobId}/materials/`]
      });
      return response;
    } catch (error) {
      logger.error(`Error updating material ${materialId} for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Remove material from job
   * @param {string} jobId - Job ID
   * @param {string} materialId - Material ID
   * @returns {Promise<void>}
   */
  async removeJobMaterial(jobId, materialId) {
    try {
      const tenantHeaders = getTenantHeaders();
      await fetch(`${this.baseUrl}/${jobId}/materials/${materialId}/`, {
        method: 'DELETE',
        headers: tenantHeaders
      });
    } catch (error) {
      logger.error(`Error removing material ${materialId} from job ${jobId}:`, error);
      throw error;
    }
  }

  // ========== JOB LABOR ==========

  /**
   * Get labor entries for a job
   * @param {string} jobId - Job ID
   * @returns {Promise<Array>} Job labor entries
   */
  async getJobLabor(jobId) {
    try {
      const response = await fetchData(`${this.baseUrl}/${jobId}/labor/`);
      return response || [];
    } catch (error) {
      logger.error(`Error fetching labor for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Add labor entry to a job
   * @param {string} jobId - Job ID
   * @param {Object} laborData - Labor data
   * @returns {Promise<Object>} Added labor entry
   */
  async addJobLabor(jobId, laborData) {
    try {
      const tenantHeaders = getTenantHeaders();
      const response = await postData(`${this.baseUrl}/${jobId}/labor/`, laborData, {
        headers: tenantHeaders,
        invalidateCache: [`${this.baseUrl}/${jobId}/labor/`]
      });
      return response;
    } catch (error) {
      logger.error(`Error adding labor to job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Update job labor entry
   * @param {string} jobId - Job ID
   * @param {string} laborId - Labor ID
   * @param {Object} laborData - Updated labor data
   * @returns {Promise<Object>} Updated labor entry
   */
  async updateJobLabor(jobId, laborId, laborData) {
    try {
      const tenantHeaders = getTenantHeaders();
      const response = await putData(`${this.baseUrl}/${jobId}/labor/${laborId}/`, laborData, {
        headers: tenantHeaders,
        invalidateCache: [`${this.baseUrl}/${jobId}/labor/`]
      });
      return response;
    } catch (error) {
      logger.error(`Error updating labor ${laborId} for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Remove labor entry from job
   * @param {string} jobId - Job ID
   * @param {string} laborId - Labor ID
   * @returns {Promise<void>}
   */
  async removeJobLabor(jobId, laborId) {
    try {
      const tenantHeaders = getTenantHeaders();
      await fetch(`${this.baseUrl}/${jobId}/labor/${laborId}/`, {
        method: 'DELETE',
        headers: tenantHeaders
      });
    } catch (error) {
      logger.error(`Error removing labor ${laborId} from job ${jobId}:`, error);
      throw error;
    }
  }

  // ========== JOB EXPENSES ==========

  /**
   * Get expenses for a job
   * @param {string} jobId - Job ID
   * @returns {Promise<Array>} Job expenses
   */
  async getJobExpenses(jobId) {
    try {
      const response = await fetchData(`${this.baseUrl}/${jobId}/expenses/`);
      return response || [];
    } catch (error) {
      logger.error(`Error fetching expenses for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Add expense to a job
   * @param {string} jobId - Job ID
   * @param {Object} expenseData - Expense data
   * @returns {Promise<Object>} Added expense
   */
  async addJobExpense(jobId, expenseData) {
    try {
      const tenantHeaders = getTenantHeaders();
      const response = await postData(`${this.baseUrl}/${jobId}/expenses/`, expenseData, {
        headers: tenantHeaders,
        invalidateCache: [`${this.baseUrl}/${jobId}/expenses/`]
      });
      return response;
    } catch (error) {
      logger.error(`Error adding expense to job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Update job expense
   * @param {string} jobId - Job ID
   * @param {string} expenseId - Expense ID
   * @param {Object} expenseData - Updated expense data
   * @returns {Promise<Object>} Updated expense
   */
  async updateJobExpense(jobId, expenseId, expenseData) {
    try {
      const tenantHeaders = getTenantHeaders();
      const response = await putData(`${this.baseUrl}/${jobId}/expenses/${expenseId}/`, expenseData, {
        headers: tenantHeaders,
        invalidateCache: [`${this.baseUrl}/${jobId}/expenses/`]
      });
      return response;
    } catch (error) {
      logger.error(`Error updating expense ${expenseId} for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Remove expense from job
   * @param {string} jobId - Job ID
   * @param {string} expenseId - Expense ID
   * @returns {Promise<void>}
   */
  async removeJobExpense(jobId, expenseId) {
    try {
      const tenantHeaders = getTenantHeaders();
      await fetch(`${this.baseUrl}/${jobId}/expenses/${expenseId}/`, {
        method: 'DELETE',
        headers: tenantHeaders
      });
    } catch (error) {
      logger.error(`Error removing expense ${expenseId} from job ${jobId}:`, error);
      throw error;
    }
  }

  // ========== JOB COSTING & ANALYTICS ==========

  /**
   * Get job costing summary
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job costing data
   */
  async getJobCosting(jobId) {
    try {
      const response = await fetchData(`${this.baseUrl}/${jobId}/costing/`);
      return response;
    } catch (error) {
      logger.error(`Error fetching job costing for ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get job profitability analysis
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Profitability data
   */
  async getJobProfitability(filters = {}) {
    try {
      const response = await fetchData(`${this.baseUrl}/profitability/`, {
        params: filters,
        useCache: true,
        cacheTTL: 2 * 60 * 1000 // 2 minutes
      });
      return response;
    } catch (error) {
      logger.error('Error fetching job profitability:', error);
      throw error;
    }
  }

  /**
   * Get job statistics
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Job statistics
   */
  async getJobStats(filters = {}) {
    try {
      const response = await fetchData(`${this.baseUrl}/stats/`, {
        params: filters,
        useCache: true,
        cacheTTL: 5 * 60 * 1000 // 5 minutes
      });
      return response;
    } catch (error) {
      logger.error('Error fetching job stats:', error);
      throw error;
    }
  }

  // ========== UTILITY METHODS ==========

  /**
   * Generate job number
   * @param {string} prefix - Job number prefix
   * @returns {Promise<string>} Generated job number
   */
  async generateJobNumber(prefix = 'JOB') {
    try {
      const response = await fetchData(`${this.baseUrl}/generate-number/`, {
        params: { prefix }
      });
      return response.job_number;
    } catch (error) {
      logger.error('Error generating job number:', error);
      // Fallback: generate client-side
      const timestamp = Date.now().toString().slice(-6);
      return `${prefix}-${timestamp}`;
    }
  }

  /**
   * Get available supplies for job materials
   * @returns {Promise<Array>} Available supplies
   */
  async getAvailableSupplies() {
    try {
      const response = await fetchData('/api/inventory/products/', {
        params: { inventory_type: 'supply' },
        useCache: true,
        cacheTTL: 5 * 60 * 1000
      });
      return response || [];
    } catch (error) {
      logger.error('Error fetching available supplies:', error);
      return [];
    }
  }

  /**
   * Get employees for labor assignment
   * @returns {Promise<Array>} Available employees
   */
  async getAvailableEmployees() {
    try {
      const response = await fetchData('/api/hr/employees/', {
        params: { is_active: true },
        useCache: true,
        cacheTTL: 10 * 60 * 1000
      });
      return response || [];
    } catch (error) {
      logger.error('Error fetching available employees:', error);
      return [];
    }
  }

  /**
   * Get customers for job assignment
   * @returns {Promise<Array>} Available customers
   */
  async getAvailableCustomers() {
    try {
      const response = await fetchData('/api/crm/customers/', {
        params: { is_active: true },
        useCache: true,
        cacheTTL: 10 * 60 * 1000
      });
      return response || [];
    } catch (error) {
      logger.error('Error fetching available customers:', error);
      return [];
    }
  }

  /**
   * Get calendar events for jobs
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} Calendar events
   */
  async getJobCalendarEvents(filters = {}) {
    try {
      const response = await fetchData('/api/calendar/events/', {
        params: { 
          event_type: 'job',
          ...filters 
        },
        useCache: true,
        cacheTTL: 2 * 60 * 1000
      });
      return response || [];
    } catch (error) {
      logger.error('Error fetching job calendar events:', error);
      return [];
    }
  }
}

// Export singleton instance
export const jobService = new JobService();
export default jobService;