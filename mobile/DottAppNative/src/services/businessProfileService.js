import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import businessApi from './businessApi';

const STORAGE_KEYS = {
  BUSINESS_PROFILE: '@business_profile_data',
  PENDING_UPDATES: '@business_profile_pending',
  SYNC_STATUS: '@business_profile_sync_status',
  LAST_SYNC: '@business_profile_last_sync',
};

class BusinessProfileService {
  constructor() {
    this.syncInProgress = false;
    this.setupNetworkListener();
  }

  /**
   * Setup network state listener for auto-sync
   */
  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        // Automatically sync when internet becomes available
        this.syncPendingUpdates();
      }
    });
  }

  /**
   * Save business profile data locally
   */
  async saveLocally(profileData) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.BUSINESS_PROFILE,
        JSON.stringify({
          ...profileData,
          lastUpdated: new Date().toISOString(),
        })
      );
      return true;
    } catch (error) {
      console.error('Error saving business profile locally:', error);
      return false;
    }
  }

  /**
   * Get locally stored business profile
   */
  async getLocalProfile() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BUSINESS_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting local business profile:', error);
      return null;
    }
  }

  /**
   * Add update to pending queue
   */
  async addToPendingUpdates(profileData) {
    try {
      const pendingData = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_UPDATES);
      const pending = pendingData ? JSON.parse(pendingData) : [];
      
      // Add new update with timestamp
      pending.push({
        data: profileData,
        timestamp: new Date().toISOString(),
        id: Date.now().toString(),
      });
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_UPDATES,
        JSON.stringify(pending)
      );
      
      // Update sync status
      await this.updateSyncStatus(false, false);
      
      return true;
    } catch (error) {
      console.error('Error adding to pending updates:', error);
      return false;
    }
  }

  /**
   * Get pending updates
   */
  async getPendingUpdates() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_UPDATES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending updates:', error);
      return [];
    }
  }

  /**
   * Clear pending updates
   */
  async clearPendingUpdates() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_UPDATES);
      await this.updateSyncStatus(true, true);
      return true;
    } catch (error) {
      console.error('Error clearing pending updates:', error);
      return false;
    }
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(synced, success) {
    try {
      const status = {
        synced,
        success,
        lastAttempt: new Date().toISOString(),
      };
      
      if (synced && success) {
        status.lastSuccessfulSync = new Date().toISOString();
      }
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.SYNC_STATUS,
        JSON.stringify(status)
      );
      
      return true;
    } catch (error) {
      console.error('Error updating sync status:', error);
      return false;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    try {
      const statusData = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
      const pendingUpdates = await this.getPendingUpdates();
      
      if (statusData) {
        const status = JSON.parse(statusData);
        return {
          ...status,
          hasPending: pendingUpdates.length > 0,
          pendingCount: pendingUpdates.length,
        };
      }
      
      return {
        synced: true,
        hasPending: pendingUpdates.length > 0,
        pendingCount: pendingUpdates.length,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return { synced: true, hasPending: false, pendingCount: 0 };
    }
  }

  /**
   * Update business profile with offline support
   */
  async updateBusinessProfile(profileData, sessionToken) {
    try {
      // Save locally first
      await this.saveLocally(profileData);
      
      // Check network status
      const netInfo = await NetInfo.fetch();
      const isOnline = netInfo.isConnected && netInfo.isInternetReachable;
      
      if (!isOnline) {
        // Save to pending updates for later sync
        await this.addToPendingUpdates(profileData);
        return {
          success: true,
          synced: false,
          message: 'Saved offline. Will sync when connected.',
        };
      }
      
      // Try to sync with backend
      try {
        const response = await businessApi.updateBusiness(profileData);
        
        // Clear any pending updates on successful sync
        await this.clearPendingUpdates();
        
        return {
          success: true,
          synced: true,
          data: response,
          message: 'Business profile updated successfully',
        };
      } catch (apiError) {
        console.error('API error updating business profile:', apiError);
        
        // Save to pending updates for retry
        await this.addToPendingUpdates(profileData);
        
        return {
          success: true,
          synced: false,
          message: 'Saved locally. Will retry sync later.',
        };
      }
    } catch (error) {
      console.error('Error updating business profile:', error);
      return {
        success: false,
        synced: false,
        message: 'Failed to save business profile',
        error: error.message,
      };
    }
  }

  /**
   * Sync pending updates with backend
   */
  async syncPendingUpdates() {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }
    
    try {
      this.syncInProgress = true;
      
      const pendingUpdates = await this.getPendingUpdates();
      
      if (pendingUpdates.length === 0) {
        console.log('No pending updates to sync');
        return { success: true, synced: 0 };
      }
      
      console.log(`Syncing ${pendingUpdates.length} pending business profile updates...`);
      
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        console.log('No internet connection, skipping sync');
        return { success: false, synced: 0 };
      }
      
      let syncedCount = 0;
      const failedUpdates = [];
      
      // Process each pending update
      for (const update of pendingUpdates) {
        try {
          await businessApi.updateBusiness(update.data);
          syncedCount++;
          console.log(`Synced update ${update.id}`);
        } catch (error) {
          console.error(`Failed to sync update ${update.id}:`, error);
          failedUpdates.push(update);
        }
      }
      
      // Update pending list with only failed updates
      if (failedUpdates.length > 0) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.PENDING_UPDATES,
          JSON.stringify(failedUpdates)
        );
        await this.updateSyncStatus(false, false);
      } else {
        await this.clearPendingUpdates();
      }
      
      console.log(`Sync complete. Synced: ${syncedCount}/${pendingUpdates.length}`);
      
      return {
        success: syncedCount > 0,
        synced: syncedCount,
        failed: failedUpdates.length,
      };
    } catch (error) {
      console.error('Error during sync:', error);
      return { success: false, synced: 0, error: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Force sync attempt
   */
  async forceSyncNow() {
    return await this.syncPendingUpdates();
  }

  /**
   * Load business profile (from local or remote)
   */
  async loadBusinessProfile(forceRemote = false) {
    try {
      // Check network status
      const netInfo = await NetInfo.fetch();
      const isOnline = netInfo.isConnected && netInfo.isInternetReachable;
      
      if (isOnline && forceRemote) {
        try {
          // Try to fetch from backend
          const response = await businessApi.getBusiness();
          
          // Save to local storage
          await this.saveLocally(response);
          
          return {
            success: true,
            data: response,
            source: 'remote',
          };
        } catch (apiError) {
          console.error('Failed to fetch from backend:', apiError);
          // Fall back to local data
        }
      }
      
      // Load from local storage
      const localData = await this.getLocalProfile();
      
      if (localData) {
        return {
          success: true,
          data: localData,
          source: 'local',
        };
      }
      
      // No data available
      return {
        success: false,
        data: null,
        source: 'none',
      };
    } catch (error) {
      console.error('Error loading business profile:', error);
      return {
        success: false,
        data: null,
        error: error.message,
      };
    }
  }

  /**
   * Clear all local business profile data
   */
  async clearAllData() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.BUSINESS_PROFILE,
        STORAGE_KEYS.PENDING_UPDATES,
        STORAGE_KEYS.SYNC_STATUS,
        STORAGE_KEYS.LAST_SYNC,
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing business profile data:', error);
      return false;
    }
  }

  /**
   * Format data for API
   */
  formatForAPI(formData) {
    const apiData = {};
    
    // Basic info
    if (formData.businessName !== undefined) apiData.business_name = formData.businessName;
    if (formData.businessEmail !== undefined) apiData.business_email = formData.businessEmail;
    if (formData.businessPhone !== undefined) apiData.business_phone = formData.businessPhone;
    if (formData.businessType !== undefined) apiData.business_type = formData.businessType;
    if (formData.description !== undefined) apiData.description = formData.description;
    if (formData.website !== undefined) apiData.website = formData.website;
    
    // Address fields
    if (formData.street !== undefined) apiData.street = formData.street;
    if (formData.city !== undefined) apiData.business_city = formData.city;
    if (formData.state !== undefined) apiData.business_state = formData.state;
    if (formData.postcode !== undefined) apiData.postcode = formData.postcode;
    if (formData.country !== undefined) apiData.business_country = formData.country;
    
    // Location - ensure valid numbers or null
    if (formData.latitude !== undefined && formData.latitude !== null && !isNaN(formData.latitude)) {
      apiData.latitude = parseFloat(formData.latitude);
    }
    if (formData.longitude !== undefined && formData.longitude !== null && !isNaN(formData.longitude)) {
      apiData.longitude = parseFloat(formData.longitude);
    }
    if (formData.locationAddress !== undefined) apiData.location_address = formData.locationAddress;
    
    // Business hours
    if (formData.businessHours !== undefined) apiData.business_hours = formData.businessHours;
    
    // Tax and registration
    if (formData.taxId !== undefined) apiData.tax_id = formData.taxId;
    if (formData.registrationNumber !== undefined) apiData.registration_number = formData.registrationNumber;
    
    // Social media
    if (formData.facebook !== undefined) apiData.facebook = formData.facebook;
    if (formData.instagram !== undefined) apiData.instagram = formData.instagram;
    if (formData.twitter !== undefined) apiData.twitter = formData.twitter;
    
    return apiData;
  }
}

// Create singleton instance
const businessProfileService = new BusinessProfileService();

export default businessProfileService;