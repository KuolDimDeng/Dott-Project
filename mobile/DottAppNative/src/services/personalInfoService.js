import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { BASE_URL } from '../config/environment';
import axios from 'axios';

const PENDING_PERSONAL_INFO_KEY = '@pending_personal_info';
const CACHED_PERSONAL_INFO_KEY = '@cached_personal_info';

class PersonalInfoService {
  constructor() {
    this.setupNetworkListener();
  }

  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        // Try to sync pending personal info when connection is restored
        this.syncPendingUpdates();
      }
    });
  }

  /**
   * Update personal information with offline support
   */
  async updatePersonalInfo(personalInfo, sessionToken) {
    try {
      console.log('🔄 PersonalInfoService - Updating personal info:', personalInfo);
      
      // Save to cache first
      await this.cachePersonalInfo(personalInfo);
      
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected && netInfo.isInternetReachable) {
        try {
          // Try to sync immediately if online
          const result = await this.syncToBackend(personalInfo, sessionToken);
          
          // Remove from pending if successful
          await AsyncStorage.removeItem(PENDING_PERSONAL_INFO_KEY);
          
          return {
            success: true,
            synced: true,
            data: result
          };
        } catch (error) {
          console.error('❌ Sync failed, saving for later:', error);
          
          // Save to pending queue if sync fails
          await this.saveToPendingQueue(personalInfo, sessionToken);
          
          return {
            success: true,
            synced: false,
            data: personalInfo,
            error: error.message
          };
        }
      } else {
        console.log('📱 No internet, saving for later sync');
        
        // Save to pending queue if offline
        await this.saveToPendingQueue(personalInfo, sessionToken);
        
        return {
          success: true,
          synced: false,
          data: personalInfo
        };
      }
    } catch (error) {
      console.error('❌ PersonalInfoService - Update failed:', error);
      throw error;
    }
  }

  /**
   * Sync personal info to backend
   */
  async syncToBackend(personalInfo, sessionToken) {
    try {
      console.log('🔄 Syncing personal info to backend...');
      console.log('📤 Request data:', personalInfo);
      console.log('🔑 Session token:', sessionToken ? sessionToken.substring(0, 20) + '...' : 'missing');
      
      const response = await axios.patch(
        `${BASE_URL}/api/users/me/`,
        personalInfo,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Session ${sessionToken}`,
          }
        }
      );

      console.log('📥 Response status:', response.status);
      console.log('✅ Personal info synced successfully');
      console.log('📥 Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Backend sync failed:', error);
      if (error.response) {
        console.error('❌ Error response:', error.response.data);
        throw new Error(error.response.data.error || `HTTP ${error.response.status}`);
      }
      throw error;
    }
  }

  /**
   * Save personal info to cache
   */
  async cachePersonalInfo(personalInfo) {
    try {
      const cacheData = {
        data: personalInfo,
        timestamp: new Date().toISOString(),
        synced: false
      };
      
      await AsyncStorage.setItem(CACHED_PERSONAL_INFO_KEY, JSON.stringify(cacheData));
      console.log('💾 Personal info cached locally');
    } catch (error) {
      console.error('❌ Failed to cache personal info:', error);
    }
  }

  /**
   * Get cached personal info
   */
  async getCachedPersonalInfo() {
    try {
      const cached = await AsyncStorage.getItem(CACHED_PERSONAL_INFO_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        return parsedCache;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get cached personal info:', error);
      return null;
    }
  }

  /**
   * Save to pending queue for later sync
   */
  async saveToPendingQueue(personalInfo, sessionToken) {
    try {
      const pendingData = {
        data: personalInfo,
        sessionToken,
        timestamp: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3
      };
      
      await AsyncStorage.setItem(PENDING_PERSONAL_INFO_KEY, JSON.stringify(pendingData));
      console.log('📋 Personal info saved to pending queue');
    } catch (error) {
      console.error('❌ Failed to save to pending queue:', error);
    }
  }

  /**
   * Get pending updates
   */
  async getPendingUpdates() {
    try {
      const pending = await AsyncStorage.getItem(PENDING_PERSONAL_INFO_KEY);
      return pending ? JSON.parse(pending) : null;
    } catch (error) {
      console.error('❌ Failed to get pending updates:', error);
      return null;
    }
  }

  /**
   * Sync pending updates when online
   */
  async syncPendingUpdates() {
    try {
      const pending = await this.getPendingUpdates();
      if (!pending) {
        return { success: true, message: 'No pending updates' };
      }

      console.log('🔄 Syncing pending personal info updates...');
      
      // Check if we've exceeded max attempts
      if (pending.attempts >= pending.maxAttempts) {
        console.log('⚠️ Max sync attempts reached, removing from queue');
        await AsyncStorage.removeItem(PENDING_PERSONAL_INFO_KEY);
        return { success: false, message: 'Max attempts reached' };
      }

      try {
        // Try to sync
        const result = await this.syncToBackend(pending.data, pending.sessionToken);
        
        // Success - remove from pending queue
        await AsyncStorage.removeItem(PENDING_PERSONAL_INFO_KEY);
        
        // Update cache to mark as synced
        const cachedInfo = await this.getCachedPersonalInfo();
        if (cachedInfo) {
          cachedInfo.synced = true;
          await AsyncStorage.setItem(CACHED_PERSONAL_INFO_KEY, JSON.stringify(cachedInfo));
        }
        
        console.log('✅ Pending personal info synced successfully');
        return { success: true, data: result };
        
      } catch (error) {
        console.error('❌ Sync attempt failed:', error);
        
        // Increment attempts and save back
        pending.attempts += 1;
        await AsyncStorage.setItem(PENDING_PERSONAL_INFO_KEY, JSON.stringify(pending));
        
        return { success: false, error: error.message, attempts: pending.attempts };
      }
    } catch (error) {
      console.error('❌ Failed to sync pending updates:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if there are pending updates
   */
  async hasPendingUpdates() {
    try {
      const pending = await AsyncStorage.getItem(PENDING_PERSONAL_INFO_KEY);
      return !!pending;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all cached data (for logout)
   */
  async clearCache() {
    try {
      await AsyncStorage.multiRemove([
        PENDING_PERSONAL_INFO_KEY,
        CACHED_PERSONAL_INFO_KEY
      ]);
      console.log('🗑️ Personal info cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * Validate personal info before sending
   */
  validatePersonalInfo(personalInfo) {
    const errors = {};
    
    // Required fields validation
    if (!personalInfo.first_name || personalInfo.first_name.trim() === '') {
      errors.first_name = 'First name is required';
    }
    
    if (!personalInfo.last_name || personalInfo.last_name.trim() === '') {
      errors.last_name = 'Last name is required';
    }
    
    // Phone number validation (basic)
    if (personalInfo.phone_number) {
      const phoneRegex = /^\+\d{1,4}\s?\d{7,15}$/;
      if (!phoneRegex.test(personalInfo.phone_number)) {
        errors.phone_number = 'Please enter a valid phone number with country code';
      }
    }
    
    // Location validation
    if (personalInfo.latitude && personalInfo.longitude) {
      const lat = parseFloat(personalInfo.latitude);
      const lng = parseFloat(personalInfo.longitude);
      
      if (lat < -90 || lat > 90) {
        errors.latitude = 'Invalid latitude';
      }
      
      if (lng < -180 || lng > 180) {
        errors.longitude = 'Invalid longitude';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Format personal info for API
   */
  formatForAPI(formData) {
    const apiData = {};
    
    // Basic info
    if (formData.firstName !== undefined) apiData.first_name = formData.firstName;
    if (formData.lastName !== undefined) apiData.last_name = formData.lastName;
    if (formData.phoneNumber !== undefined) apiData.phone_number = formData.phoneNumber;
    
    // Address fields
    if (formData.street !== undefined) apiData.street = formData.street;
    if (formData.city !== undefined) apiData.city = formData.city;
    if (formData.state !== undefined) apiData.state = formData.state;
    if (formData.postcode !== undefined) apiData.postcode = formData.postcode;
    if (formData.country !== undefined) apiData.country = formData.country;
    
    // Location fields
    if (formData.latitude !== undefined) apiData.latitude = formData.latitude;
    if (formData.longitude !== undefined) apiData.longitude = formData.longitude;
    if (formData.locationAccuracy !== undefined) apiData.location_accuracy = formData.locationAccuracy;
    if (formData.locationAddress !== undefined) apiData.location_address = formData.locationAddress;
    if (formData.landmark !== undefined) apiData.landmark = formData.landmark;
    if (formData.areaDescription !== undefined) apiData.area_description = formData.areaDescription;
    
    return apiData;
  }

  /**
   * Get sync status for UI
   */
  async getSyncStatus() {
    try {
      const hasPending = await this.hasPendingUpdates();
      const cached = await this.getCachedPersonalInfo();
      
      return {
        hasPending,
        lastSync: cached?.timestamp,
        synced: cached?.synced || false
      };
    } catch (error) {
      return {
        hasPending: false,
        lastSync: null,
        synced: false
      };
    }
  }
}

export default new PersonalInfoService();