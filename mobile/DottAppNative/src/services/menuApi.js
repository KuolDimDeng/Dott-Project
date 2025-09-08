import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/environment';

const MENU_API_URL = `${ENV.apiUrl}/menu`;

class MenuAPI {
  async getHeaders() {
    const sessionId = await AsyncStorage.getItem('sessionId');
    return {
      'Content-Type': 'application/json',
      'Authorization': sessionId ? `Session ${sessionId}` : '',
    };
  }

  async getMultipartHeaders() {
    const sessionId = await AsyncStorage.getItem('sessionId');
    return {
      'Content-Type': 'multipart/form-data',
      'Authorization': sessionId ? `Session ${sessionId}` : '',
    };
  }

  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('🔴 Menu API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: error,
        url: response.url
      });
      throw new Error(error.message || error.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Get all menu items for the business
  async getMenuItems() {
    try {
      console.log('📡 Fetching menu items from:', `${MENU_API_URL}/items/`);
      const headers = await this.getHeaders();
      console.log('📡 Request headers:', headers);
      
      const response = await fetch(`${MENU_API_URL}/items/`, {
        method: 'GET',
        headers: headers,
      });
      
      console.log('📡 Menu API Response status:', response.status);
      const data = await this.handleResponse(response);
      console.log('✅ Menu items fetched:', data.results?.length || data.length || 0);
      return data;
    } catch (error) {
      console.error('❌ Error fetching menu items:', error.message);
      throw error;
    }
  }

  // Get single menu item
  async getMenuItem(itemId) {
    try {
      const response = await fetch(`${MENU_API_URL}/items/${itemId}/`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching menu item:', error);
      throw error;
    }
  }

  // Create menu item with photo
  async createMenuItem(itemData) {
    try {
      console.log('🍽️ MenuAPI: Creating menu item:', itemData.name);
      console.log('📡 API URL:', `${MENU_API_URL}/items/`);
      console.log('📡 Item data:', {
        name: itemData.name,
        category: itemData.category,
        price: itemData.price,
        hasPhoto: !!itemData.photo
      });
      
      const formData = new FormData();
      
      // Add photo if provided
      if (itemData.photo) {
        formData.append('image', {
          uri: itemData.photo.uri,
          type: itemData.photo.type || 'image/jpeg',
          name: itemData.photo.fileName || `menu-item-${Date.now()}.jpg`,
        });
      }

      // Add other fields
      formData.append('name', itemData.name);
      formData.append('description', itemData.description || '');
      formData.append('category', itemData.category);
      formData.append('selling_price', itemData.price.toString());
      formData.append('estimated_cost', itemData.estimatedCost?.toString() || '0');
      formData.append('cost_method', itemData.costMethod || 'fixed');
      formData.append('preparation_time', itemData.preparationTime?.toString() || '0');
      formData.append('dietary_tags', JSON.stringify(itemData.dietaryTags || []));
      formData.append('is_active', itemData.isActive !== false ? 'true' : 'false');
      
      // Add ingredients if using recipe costing
      if (itemData.ingredients && itemData.ingredients.length > 0) {
        formData.append('ingredients', JSON.stringify(itemData.ingredients));
      }

      const sessionId = await AsyncStorage.getItem('sessionId');
      console.log('🔑 Session ID:', sessionId ? sessionId.substring(0, 20) + '...' : 'none');
      
      const response = await fetch(`${MENU_API_URL}/items/`, {
        method: 'POST',
        headers: {
          'Authorization': sessionId ? `Session ${sessionId}` : '',
          // Don't set Content-Type, let FormData handle it
        },
        body: formData,
      });
      
      const result = await this.handleResponse(response);
      console.log('🍽️ MenuAPI: Menu item created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }
  }

  // Update menu item
  async updateMenuItem(itemId, updates) {
    try {
      console.log('🍽️ MenuAPI: Updating menu item:', itemId);
      
      // If photo is being updated, use FormData
      if (updates.photo) {
        const formData = new FormData();
        
        formData.append('image', {
          uri: updates.photo.uri,
          type: updates.photo.type || 'image/jpeg',
          name: updates.photo.fileName || `menu-item-${Date.now()}.jpg`,
        });

        // Add other update fields
        Object.keys(updates).forEach(key => {
          if (key !== 'photo') {
            if (typeof updates[key] === 'object') {
              formData.append(key, JSON.stringify(updates[key]));
            } else {
              formData.append(key, updates[key].toString());
            }
          }
        });

        const sessionId = await AsyncStorage.getItem('sessionId');
        const response = await fetch(`${MENU_API_URL}/items/${itemId}/`, {
          method: 'PATCH',
          headers: {
            'Authorization': sessionId ? `Session ${sessionId}` : '',
          },
          body: formData,
        });
        
        return this.handleResponse(response);
      } else {
        // Regular JSON update
        const response = await fetch(`${MENU_API_URL}/items/${itemId}/`, {
          method: 'PATCH',
          headers: await this.getHeaders(),
          body: JSON.stringify(updates),
        });
        
        return this.handleResponse(response);
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
      throw error;
    }
  }

  // Delete menu item
  async deleteMenuItem(itemId) {
    try {
      const response = await fetch(`${MENU_API_URL}/items/${itemId}/`, {
        method: 'DELETE',
        headers: await this.getHeaders(),
      });
      
      if (response.status === 204) {
        return { success: true };
      }
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting menu item:', error);
      throw error;
    }
  }

  // Toggle item availability
  async toggleItemAvailability(itemId) {
    try {
      const response = await fetch(`${MENU_API_URL}/items/${itemId}/toggle_availability/`, {
        method: 'POST',
        headers: await this.getHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error toggling item availability:', error);
      throw error;
    }
  }

  // Calculate recipe cost
  async calculateRecipeCost(ingredients) {
    try {
      const response = await fetch(`${MENU_API_URL}/calculate-cost/`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify({ ingredients }),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error calculating recipe cost:', error);
      throw error;
    }
  }

  // Get menu categories
  async getCategories() {
    try {
      const response = await fetch(`${MENU_API_URL}/categories/`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return {
        results: [
          { id: 'appetizers', name: 'Appetizers' },
          { id: 'main_courses', name: 'Main Courses' },
          { id: 'desserts', name: 'Desserts' },
          { id: 'beverages', name: 'Beverages' },
          { id: 'coffee', name: 'Coffee & Tea' },
        ]
      };
    }
  }

  // Get cost analysis
  async getCostAnalysis() {
    try {
      const response = await fetch(`${MENU_API_URL}/cost-analysis/`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching cost analysis:', error);
      throw error;
    }
  }

  // Upload photo separately
  async uploadPhoto(imageUri, fileName = null) {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName || `photo-${Date.now()}.jpg`,
      });

      const sessionId = await AsyncStorage.getItem('sessionId');
      const response = await fetch(`${MENU_API_URL}/upload-photo/`, {
        method: 'POST',
        headers: {
          'Authorization': sessionId ? `Session ${sessionId}` : '',
        },
        body: formData,
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  }
}

export default new MenuAPI();