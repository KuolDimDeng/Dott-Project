// Offline-First Data Management for Capacitor
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { Toast } from '@capacitor/toast';

class OfflineManager {
  constructor() {
    this.isOnline = true;
    this.pendingRequests = [];
    this.initializeNetworkListener();
  }

  async initializeNetworkListener() {
    // Check current network status
    const status = await Network.getStatus();
    this.isOnline = status.connected;

    // Listen for network changes
    Network.addListener('networkStatusChange', (status) => {
      this.isOnline = status.connected;
      
      if (this.isOnline) {
        this.showToast('Back online! Syncing data...');
        this.syncPendingRequests();
      } else {
        this.showToast('Working offline - changes will sync when connected');
      }
    });
  }

  async saveLocalData(key, data) {
    try {
      await Preferences.set({
        key: key,
        value: JSON.stringify({
          data,
          timestamp: Date.now(),
          synced: false
        })
      });
    } catch (error) {
      console.error('Failed to save local data:', error);
    }
  }

  async getLocalData(key) {
    try {
      const { value } = await Preferences.get({ key });
      if (value) {
        const parsed = JSON.parse(value);
        // Return data even if not synced (offline-first)
        return parsed.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get local data:', error);
      return null;
    }
  }

  async queueRequest(request) {
    // Save request to queue for later sync
    this.pendingRequests.push({
      ...request,
      timestamp: Date.now()
    });
    
    // Persist queue
    await this.saveLocalData('pending_requests', this.pendingRequests);
    
    if (this.isOnline) {
      // Try to sync immediately if online
      return this.executeRequest(request);
    } else {
      // Return optimistic response
      return {
        success: true,
        offline: true,
        message: 'Saved locally - will sync when online'
      };
    }
  }

  async syncPendingRequests() {
    if (!this.isOnline) return;

    const { value } = await Preferences.get({ key: 'pending_requests' });
    if (value) {
      this.pendingRequests = JSON.parse(value);
    }

    for (const request of this.pendingRequests) {
      try {
        await this.executeRequest(request);
        // Remove from queue after successful sync
        this.pendingRequests = this.pendingRequests.filter(r => r !== request);
      } catch (error) {
        console.error('Failed to sync request:', error);
      }
    }

    // Update persisted queue
    await this.saveLocalData('pending_requests', this.pendingRequests);
    
    if (this.pendingRequests.length === 0) {
      this.showToast('All data synced successfully!');
    }
  }

  async executeRequest(request) {
    const { url, method, body } = request;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  }

  async showToast(message) {
    if (typeof Toast !== 'undefined') {
      await Toast.show({
        text: message,
        duration: 'short'
      });
    }
  }

  // Cache API responses for offline use
  async cacheApiResponse(endpoint, data) {
    const cacheKey = `cache_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
    await this.saveLocalData(cacheKey, data);
  }

  async getCachedResponse(endpoint) {
    const cacheKey = `cache_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
    return this.getLocalData(cacheKey);
  }

  // Smart fetch that works offline
  async smartFetch(url, options = {}) {
    const endpoint = url.replace(process.env.NEXT_PUBLIC_API_URL || '', '');
    
    if (this.isOnline) {
      try {
        const response = await fetch(url, {
          ...options,
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          // Cache successful responses
          await this.cacheApiResponse(endpoint, data);
          return data;
        }
      } catch (error) {
        console.error('Fetch failed, trying cache:', error);
      }
    }
    
    // Fall back to cached data when offline or request fails
    const cachedData = await this.getCachedResponse(endpoint);
    if (cachedData) {
      return {
        ...cachedData,
        fromCache: true
      };
    }
    
    throw new Error('No data available offline');
  }
}

// Singleton instance
const offlineManager = new OfflineManager();
export default offlineManager;