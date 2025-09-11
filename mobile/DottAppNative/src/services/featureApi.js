import { API_URL } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

class FeatureApi {
  constructor() {
    this.baseUrl = API_URL;
    this.cachedFeatures = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  }

  async getAuthHeaders() {
    try {
      const sessionId = await AsyncStorage.getItem('sessionId');
      return {
        'Content-Type': 'application/json',
        'Cookie': sessionId ? `sessionid=${sessionId}` : '',
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {
        'Content-Type': 'application/json',
      };
    }
  }

  async getEnabledFeatures(forceRefresh = false) {
    try {
      // Check cache
      if (!forceRefresh && this.cachedFeatures && this.cacheExpiry && Date.now() < this.cacheExpiry) {
        return this.cachedFeatures;
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/features/enabled`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch features: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cachedFeatures = data.features || data;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      
      return this.cachedFeatures;
    } catch (error) {
      console.error('Error fetching enabled features:', error);
      // Return cached data if available, even if expired
      if (this.cachedFeatures) {
        return this.cachedFeatures;
      }
      throw error;
    }
  }

  async hasFeatureAccess(featureCode) {
    try {
      const features = await this.getEnabledFeatures();
      
      // Check if it's a test account (always has access)
      if (features.is_test_account) {
        return true;
      }
      
      // Check if in testing mode (everyone has access)
      if (features.testing_mode) {
        return true;
      }
      
      // Check core features
      if (features.core && features.core.includes(featureCode)) {
        return true;
      }
      
      // Check enabled modules
      if (features.enabled_modules) {
        const hasModule = features.enabled_modules.some(
          module => module.code === featureCode || module === featureCode
        );
        if (hasModule) return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking feature access for ${featureCode}:`, error);
      // Default to allowing access during errors (for better UX)
      return true;
    }
  }

  async checkFeatureAccess(featureCode) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/features/check-access`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ feature_code: featureCode }),
      });

      if (!response.ok) {
        throw new Error(`Failed to check feature access: ${response.status}`);
      }

      const data = await response.json();
      return data.has_access || false;
    } catch (error) {
      console.error(`Error checking feature access for ${featureCode}:`, error);
      return true; // Default to allowing access during errors
    }
  }

  async getBillingDetails() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/features/billing-details`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch billing details: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching billing details:', error);
      throw error;
    }
  }

  async addFeature(featureCode) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/features/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ feature_code: featureCode }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add feature');
      }

      // Clear cache to force refresh
      this.cachedFeatures = null;
      this.cacheExpiry = null;
      
      return data;
    } catch (error) {
      console.error(`Error adding feature ${featureCode}:`, error);
      throw error;
    }
  }

  async removeFeature(featureCode) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/features/remove`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ feature_code: featureCode }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove feature');
      }

      // Clear cache to force refresh
      this.cachedFeatures = null;
      this.cacheExpiry = null;
      
      return data;
    } catch (error) {
      console.error(`Error removing feature ${featureCode}:`, error);
      throw error;
    }
  }

  // Helper method to get business type specific features
  getBusinessCoreFeatures(businessType) {
    const baseFeatures = [
      'dashboard',
      'customers',
      'invoicing',
      'banking',
      'orders',
      'discover',
      'advertise',
      'invite',
      'qr_code',
      'business_wallet'
    ];

    switch (businessType) {
      case 'RETAIL':
      case 'GROCERY':
      case 'PHARMACY':
      case 'SHOP':
        return [...baseFeatures, 'pos', 'inventory'];
      
      case 'RESTAURANT':
      case 'FOOD':
      case 'CAFE':
      case 'BAR':
        return [...baseFeatures, 'pos', 'inventory', 'menu'];
      
      case 'SERVICE':
      case 'CONSULTING':
      case 'PROFESSIONAL':
      case 'CONTRACTOR':
        // Service businesses get jobs/projects for free
        return [...baseFeatures, 'jobs'];
      
      case 'TRANSPORT':
      case 'LOGISTICS':
      case 'DELIVERY':
      case 'TRUCKING':
        // Transport businesses get transport and courier features for free
        return [...baseFeatures, 'transport', 'courier'];
      
      case 'COURIER':
      case 'DELIVERY_SERVICE':
      case 'MESSENGER':
        // Courier businesses get courier feature for free
        return [...baseFeatures, 'courier'];
      
      default:
        // Mixed/Other businesses get POS, inventory, and menu
        return [...baseFeatures, 'pos', 'inventory', 'menu'];
    }
  }

  // Clear cache when user logs out
  clearCache() {
    this.cachedFeatures = null;
    this.cacheExpiry = null;
  }
}

export default new FeatureApi();