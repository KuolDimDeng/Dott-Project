import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/environment';

const INVENTORY_API_URL = `${ENV.apiUrl}/inventory`;

class InventoryAPI {
  async getHeaders() {
    // Try sessionId first (new standard), fallback to sessionToken
    const sessionId = await AsyncStorage.getItem('sessionId');
    const token = sessionId || await AsyncStorage.getItem('sessionToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Session ${token}` : '',
    };
  }

  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Get all products
  async getProducts(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = `${INVENTORY_API_URL}/products/${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: await this.getHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  // Get single product
  async getProduct(productId) {
    try {
      const response = await fetch(`${INVENTORY_API_URL}/products/${productId}/`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  // Create product
  async createProduct(productData) {
    try {
      const response = await fetch(`${INVENTORY_API_URL}/products/`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(productData),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  // Update product
  async updateProduct(productId, productData) {
    try {
      const response = await fetch(`${INVENTORY_API_URL}/products/${productId}/`, {
        method: 'PATCH',
        headers: await this.getHeaders(),
        body: JSON.stringify(productData),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  // Delete product
  async deleteProduct(productId) {
    try {
      const response = await fetch(`${INVENTORY_API_URL}/products/${productId}/`, {
        method: 'DELETE',
        headers: await this.getHeaders(),
      });
      
      if (response.status === 204) {
        return { success: true };
      }
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Activate product
  async activateProduct(productId) {
    try {
      const response = await fetch(`${INVENTORY_API_URL}/products/${productId}/activate/`, {
        method: 'POST',
        headers: await this.getHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error activating product:', error);
      throw error;
    }
  }

  // Deactivate product
  async deactivateProduct(productId) {
    try {
      const response = await fetch(`${INVENTORY_API_URL}/products/${productId}/deactivate/`, {
        method: 'POST',
        headers: await this.getHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error deactivating product:', error);
      throw error;
    }
  }

  // Toggle product active status
  async toggleProductStatus(productId) {
    try {
      const response = await fetch(`${INVENTORY_API_URL}/products/${productId}/toggle_active/`, {
        method: 'POST',
        headers: await this.getHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error toggling product status:', error);
      throw error;
    }
  }

  // Adjust stock
  async adjustStock(productId, adjustment) {
    try {
      const response = await fetch(`${INVENTORY_API_URL}/products/${productId}/adjust_stock/`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify({ adjustment }),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  }

  // Get product by barcode
  async getProductByBarcode(barcode) {
    try {
      const response = await fetch(`${INVENTORY_API_URL}/products/by_barcode/${barcode}/`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching product by barcode:', error);
      throw error;
    }
  }

  // Get suppliers
  async getSuppliers() {
    try {
      const response = await fetch(`${INVENTORY_API_URL}/suppliers/`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }
  }

  // Get locations
  async getLocations() {
    try {
      const response = await fetch(`${INVENTORY_API_URL}/locations/`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  }

  // Generate QR code data for product
  generateQRData(product) {
    return JSON.stringify({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      barcode: product.barcode_number,
      type: 'product',
    });
  }

  // Get store items catalog
  async getStoreItems(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = `${INVENTORY_API_URL}/store-items/${queryParams ? `?${queryParams}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: await this.getHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching store items:', error);
      throw error;
    }
  }

  // Scan barcode to find product in store items
  async scanBarcode(barcode) {
    try {
      const response = await fetch(`${INVENTORY_API_URL}/store-items/scan/?barcode=${encodeURIComponent(barcode)}`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      console.error('Error scanning barcode:', error);
      throw error;
    }
  }

  // Import product from store items to inventory
  async importFromCatalog(storeItemId, productData) {
    try {
      const response = await fetch(`${INVENTORY_API_URL}/store-items/${storeItemId}/import/`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(productData),
      });

      return this.handleResponse(response);
    } catch (error) {
      console.error('Error importing from catalog:', error);
      throw error;
    }
  }
}

export default new InventoryAPI();