/**
 * Delivery Address API Service
 * Manages user delivery addresses with GPS coordinates for courier deliveries
 */
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class DeliveryAddressService {
  /**
   * Get all delivery addresses for the current user
   */
  async getAddresses(userId) {
    try {
      // Try API first
      const response = await api.get('/user/delivery-addresses/');
      
      // Cache the response
      await AsyncStorage.setItem(`addresses_${userId}`, JSON.stringify(response.data.addresses));
      if (response.data.default_address_id) {
        await AsyncStorage.setItem(`defaultAddress_${userId}`, response.data.default_address_id);
      }
      
      return {
        addresses: response.data.addresses,
        defaultAddressId: response.data.default_address_id,
      };
    } catch (error) {
      console.log('API error, falling back to cache:', error);
      
      // Fallback to cached data
      const cachedAddresses = await AsyncStorage.getItem(`addresses_${userId}`);
      const cachedDefault = await AsyncStorage.getItem(`defaultAddress_${userId}`);
      
      return {
        addresses: cachedAddresses ? JSON.parse(cachedAddresses) : [],
        defaultAddressId: cachedDefault,
      };
    }
  }

  /**
   * Add a new delivery address
   */
  async addAddress(userId, addressData) {
    try {
      const response = await api.post('/user/delivery-addresses/', {
        title: addressData.title,
        address: addressData.address,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        type: addressData.type,
        notes: addressData.notes,
        is_default: addressData.isDefault || false,
      });
      
      // Update cache
      await this.updateCachedAddresses(userId, response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error adding address:', error);
      
      // Add to cache for offline support
      const newAddress = {
        id: Date.now().toString(),
        ...addressData,
        created_at: new Date().toISOString(),
        sync_status: 'pending', // Mark for later sync
      };
      
      await this.addToCachedAddresses(userId, newAddress);
      
      return newAddress;
    }
  }

  /**
   * Update an existing delivery address
   */
  async updateAddress(userId, addressId, addressData) {
    try {
      const response = await api.patch(`/user/delivery-addresses/${addressId}/`, {
        title: addressData.title,
        address: addressData.address,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        type: addressData.type,
        notes: addressData.notes,
      });
      
      // Update cache
      await this.updateCachedAddresses(userId, response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error updating address:', error);
      
      // Update cache for offline support
      await this.updateCachedAddress(userId, addressId, {
        ...addressData,
        sync_status: 'pending',
      });
      
      throw error;
    }
  }

  /**
   * Delete a delivery address
   */
  async deleteAddress(userId, addressId) {
    try {
      await api.delete(`/user/delivery-addresses/${addressId}/`);
      
      // Remove from cache
      await this.removeFromCachedAddresses(userId, addressId);
      
      return true;
    } catch (error) {
      console.error('Error deleting address:', error);
      
      // Mark as deleted in cache for offline support
      await this.markAddressAsDeleted(userId, addressId);
      
      throw error;
    }
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(userId, addressId) {
    try {
      const response = await api.patch(`/user/delivery-addresses/${addressId}/set-default/`);
      
      // Update cache
      await AsyncStorage.setItem(`defaultAddress_${userId}`, addressId);
      await this.updateCachedAddressDefaults(userId, addressId);
      
      return response.data;
    } catch (error) {
      console.error('Error setting default address:', error);
      
      // Update cache for offline support
      await AsyncStorage.setItem(`defaultAddress_${userId}`, addressId);
      await this.updateCachedAddressDefaults(userId, addressId);
      
      throw error;
    }
  }

  /**
   * Get the default delivery address
   */
  async getDefaultAddress(userId) {
    try {
      const response = await api.get('/user/delivery-addresses/default/');
      return response.data;
    } catch (error) {
      // Fallback to cached default
      const defaultId = await AsyncStorage.getItem(`defaultAddress_${userId}`);
      if (defaultId) {
        const addresses = await this.getCachedAddresses(userId);
        return addresses.find(addr => addr.id === defaultId);
      }
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await api.get('/utils/reverse-geocode/', {
        params: { lat: latitude, lng: longitude }
      });
      return response.data.address;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      
      // Return coordinate-based address as fallback
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  /**
   * Search for places/addresses
   */
  async searchPlaces(query, latitude, longitude) {
    try {
      const response = await api.get('/utils/places-search/', {
        params: { 
          query,
          lat: latitude,
          lng: longitude,
          radius: 10000 // 10km radius
        }
      });
      return response.data.places;
    } catch (error) {
      console.error('Places search error:', error);
      
      // Return predefined locations for Juba as fallback
      const jubaLocations = [
        {
          name: 'Juba Teaching Hospital',
          address: 'Juba Teaching Hospital Road, Juba, South Sudan',
          latitude: 4.8594,
          longitude: 31.5713,
        },
        {
          name: 'University of Juba',
          address: 'University of Juba, Juba, South Sudan',
          latitude: 4.8400,
          longitude: 31.5825,
        },
        {
          name: 'Konyokonyo Market',
          address: 'Konyokonyo Market, Juba, South Sudan',
          latitude: 4.8700,
          longitude: 31.6000,
        },
        {
          name: 'Juba International Airport',
          address: 'Juba International Airport, Juba, South Sudan',
          latitude: 4.8721,
          longitude: 31.6011,
        },
      ];
      
      return jubaLocations.filter(location =>
        location.name.toLowerCase().includes(query.toLowerCase()) ||
        location.address.toLowerCase().includes(query.toLowerCase())
      );
    }
  }

  /**
   * Sync pending addresses with server
   */
  async syncPendingAddresses(userId) {
    try {
      const addresses = await this.getCachedAddresses(userId);
      const pendingAddresses = addresses.filter(addr => addr.sync_status === 'pending');
      
      for (const address of pendingAddresses) {
        try {
          if (address.deleted) {
            await api.delete(`/user/delivery-addresses/${address.id}/`);
            await this.removeFromCachedAddresses(userId, address.id);
          } else if (address.id.toString().length > 10) {
            // New address (generated ID)
            const response = await api.post('/user/delivery-addresses/', address);
            await this.replaceCachedAddress(userId, address.id, response.data);
          } else {
            // Updated address
            const response = await api.patch(`/user/delivery-addresses/${address.id}/`, address);
            await this.updateCachedAddress(userId, address.id, response.data);
          }
        } catch (error) {
          console.error('Error syncing address:', address.id, error);
        }
      }
    } catch (error) {
      console.error('Error syncing pending addresses:', error);
    }
  }

  // Helper methods for cache management
  
  async getCachedAddresses(userId) {
    const cached = await AsyncStorage.getItem(`addresses_${userId}`);
    return cached ? JSON.parse(cached) : [];
  }

  async updateCachedAddresses(userId, newData) {
    // Implementation depends on API response structure
    if (Array.isArray(newData)) {
      await AsyncStorage.setItem(`addresses_${userId}`, JSON.stringify(newData));
    } else {
      // Single address update
      const addresses = await this.getCachedAddresses(userId);
      const updatedAddresses = addresses.map(addr => 
        addr.id === newData.id ? { ...addr, ...newData, sync_status: 'synced' } : addr
      );
      await AsyncStorage.setItem(`addresses_${userId}`, JSON.stringify(updatedAddresses));
    }
  }

  async addToCachedAddresses(userId, newAddress) {
    const addresses = await this.getCachedAddresses(userId);
    addresses.push(newAddress);
    await AsyncStorage.setItem(`addresses_${userId}`, JSON.stringify(addresses));
  }

  async updateCachedAddress(userId, addressId, updatedData) {
    const addresses = await this.getCachedAddresses(userId);
    const updatedAddresses = addresses.map(addr => 
      addr.id === addressId ? { ...addr, ...updatedData, sync_status: 'synced' } : addr
    );
    await AsyncStorage.setItem(`addresses_${userId}`, JSON.stringify(updatedAddresses));
  }

  async removeFromCachedAddresses(userId, addressId) {
    const addresses = await this.getCachedAddresses(userId);
    const filteredAddresses = addresses.filter(addr => addr.id !== addressId);
    await AsyncStorage.setItem(`addresses_${userId}`, JSON.stringify(filteredAddresses));
  }

  async markAddressAsDeleted(userId, addressId) {
    const addresses = await this.getCachedAddresses(userId);
    const updatedAddresses = addresses.map(addr => 
      addr.id === addressId ? { ...addr, deleted: true, sync_status: 'pending' } : addr
    );
    await AsyncStorage.setItem(`addresses_${userId}`, JSON.stringify(updatedAddresses));
  }

  async updateCachedAddressDefaults(userId, newDefaultId) {
    const addresses = await this.getCachedAddresses(userId);
    const updatedAddresses = addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === newDefaultId,
    }));
    await AsyncStorage.setItem(`addresses_${userId}`, JSON.stringify(updatedAddresses));
  }

  async replaceCachedAddress(userId, oldId, newAddress) {
    const addresses = await this.getCachedAddresses(userId);
    const updatedAddresses = addresses.map(addr => 
      addr.id === oldId ? { ...newAddress, sync_status: 'synced' } : addr
    );
    await AsyncStorage.setItem(`addresses_${userId}`, JSON.stringify(updatedAddresses));
  }

  /**
   * Get addresses for order placement
   */
  async getAddressesForOrder(userId) {
    const { addresses, defaultAddressId } = await this.getAddresses(userId);
    
    return {
      addresses: addresses.filter(addr => !addr.deleted),
      defaultAddress: addresses.find(addr => addr.id === defaultAddressId),
    };
  }

  /**
   * Format address for display
   */
  formatAddressForDisplay(address) {
    if (!address) return '';
    
    let formatted = address.address;
    if (address.notes) {
      formatted += `\n${address.notes}`;
    }
    
    return formatted;
  }

  /**
   * Calculate distance between two coordinates
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  degToRad(deg) {
    return deg * (Math.PI/180);
  }
}

export default new DeliveryAddressService();