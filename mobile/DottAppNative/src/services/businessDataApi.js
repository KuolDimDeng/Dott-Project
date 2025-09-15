import AsyncStorage from '@react-native-async-storage/async-storage';

import ENV from '../config/environment';

const API_BASE_URL = ENV.apiUrl;

class BusinessDataApi {
  async getHeaders() {
    const sessionData = await AsyncStorage.getItem('userSession');
    if (!sessionData) {
      throw new Error('No session found');
    }
    const session = JSON.parse(sessionData);
    return {
      'Content-Type': 'application/json',
      'Cookie': `sessionid=${session.sessionid}`,
    };
  }

  // Fetch menu items for restaurants
  async getMenuItems(businessId) {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/menu/items/?business_id=${businessId}`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch menu items');
      }
      
      const data = await response.json();
      return {
        success: true,
        data: data.results || data || [],
      };
    } catch (error) {
      console.error('Error fetching menu items:', error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  // Fetch inventory items for retail stores
  async getInventoryItems(businessId) {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/inventory/products/?business_id=${businessId}`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch inventory items');
      }
      
      const data = await response.json();
      return {
        success: true,
        data: data.results || data || [],
      };
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  // Fetch services for service businesses
  async getServices(businessId) {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/services/list/?business_id=${businessId}`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      
      const data = await response.json();
      return {
        success: true,
        data: data.results || data || [],
      };
    } catch (error) {
      console.error('Error fetching services:', error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  // Get products/services based on business type
  async getBusinessOfferings(businessId, businessType) {
    try {
      // Determine which API to call based on business type
      switch (businessType) {
        case 'RESTAURANT':
        case 'RESTAURANT_CAFE':
        case 'FOOD_BEVERAGE':
        case 'CAFE':
        case 'BAKERY':
        case 'BAR':
          return await this.getMenuItems(businessId);
        
        case 'RETAIL':
        case 'RETAIL_STORE':
        case 'GROCERY':
        case 'PHARMACY':
        case 'ELECTRONICS':
        case 'CLOTHING':
        case 'FURNITURE':
        case 'BOOKSTORE':
        case 'HARDWARE':
          return await this.getInventoryItems(businessId);
        
        case 'SERVICE':
        case 'BEAUTY_SALON':
        case 'BARBER':
        case 'SPA':
        case 'FITNESS':
        case 'AUTO_REPAIR':
        case 'HEALTHCARE':
        case 'EDUCATION':
        case 'LEGAL':
        case 'ACCOUNTING':
        case 'REAL_ESTATE':
        case 'MARKETING':
        case 'TECHNOLOGY':
        case 'CONSULTING':
        case 'INSURANCE':
        case 'TRAVEL':
        case 'EVENTS':
          return await this.getServices(businessId);
        
        case 'MIXED':
        case 'OTHER':
        default:
          // For mixed businesses, try to get all types
          const [menuResult, inventoryResult, servicesResult] = await Promise.all([
            this.getMenuItems(businessId),
            this.getInventoryItems(businessId),
            this.getServices(businessId),
          ]);
          
          // Combine all results
          const allData = [
            ...(menuResult.data || []),
            ...(inventoryResult.data || []),
            ...(servicesResult.data || []),
          ];
          
          return {
            success: true,
            data: allData,
          };
      }
    } catch (error) {
      console.error('Error fetching business offerings:', error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  // Format menu items for display
  formatMenuItems(items) {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      image: item.image_url,
      available: item.is_available !== false,
      type: 'menu',
    }));
  }

  // Format inventory items for display
  formatInventoryItems(items) {
    return items.map(item => ({
      id: item.id,
      name: item.product_name || item.name,
      description: item.description,
      price: item.selling_price || item.price,
      category: item.category,
      image: item.image_url,
      available: item.quantity_on_hand > 0,
      stock: item.quantity_on_hand,
      type: 'product',
    }));
  }

  // Format services for display
  formatServices(items) {
    return items.map(item => ({
      id: item.id,
      name: item.service_name || item.name,
      description: item.description,
      price: item.price,
      duration: item.duration,
      category: item.category,
      image: item.image_url,
      available: item.is_active !== false,
      type: 'service',
    }));
  }
}

export default new BusinessDataApi();