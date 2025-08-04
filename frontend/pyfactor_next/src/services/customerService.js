import { logger } from '@/utils/logger';

// Always use the correct production API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

class CustomerService {
  constructor() {
    // Log the API URL being used
    logger.info('[CustomerService] Using API URL:', API_BASE_URL);
  }

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
      
      const url = `${API_BASE_URL}/api/customers?${queryParams}`;
      logger.info('[CustomerService] Fetching customers from:', url);

      const response = await fetch(url, {
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
      const url = `${API_BASE_URL}/api/customers/${id}`;
      logger.info('[CustomerService] Fetching customer from:', url);
      
      const response = await fetch(url, {
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
      const url = `${API_BASE_URL}/api/customers`;
      logger.info('[CustomerService] Creating customer at:', url);
      
      const response = await fetch(url, {
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
      const url = `${API_BASE_URL}/api/customers/${id}`;
      logger.info('[CustomerService] Updating customer at:', url);
      
      const response = await fetch(url, {
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
      const url = `${API_BASE_URL}/api/customers/${id}`;
      logger.info('[CustomerService] Deleting customer at:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete customer');
      }

      return { success: true };
    } catch (error) {
      logger.error('Error deleting customer:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new CustomerService();
