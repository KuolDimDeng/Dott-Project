import { logger } from '@/utils/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

class CustomerService {
  async getCustomers(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params.customer_type) queryParams.append('customer_type', params.customer_type);
      if (params.city) queryParams.append('city', params.city);
      if (params.state) queryParams.append('state', params.state);
      if (params.country) queryParams.append('country', params.country);
      if (params.has_purchases) queryParams.append('has_purchases', params.has_purchases);

      const response = await fetch(`${API_BASE_URL}/api/customers?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customers');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching customers:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomer(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customer');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching customer:', error);
      return { success: false, error: error.message };
    }
  }

  async createCustomer(customerData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(customerData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create customer');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error creating customer:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCustomer(id, customerData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(customerData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update customer');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error updating customer:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteCustomer(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete customer');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error deleting customer:', error);
      return { success: false, error: error.message };
    }
  }

  async bulkDeleteCustomers(ids) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ids }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete customers');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error bulk deleting customers:', error);
      return { success: false, error: error.message };
    }
  }

  async getCustomerStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customer stats');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching customer stats:', error);
      return { success: false, error: error.message };
    }
  }

  async searchCustomers(query) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to search customers');
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error searching customers:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new CustomerService();