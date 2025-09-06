import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_CACHE_KEY = '@location_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.watchId = null;
  }

  async requestLocationPermission() {
    if (Platform.OS === 'ios') {
      // iOS permissions are handled in Info.plist
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Dott needs access to your location to show nearby businesses',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Location permission error:', err);
      return false;
    }
  }

  async getCurrentLocation() {
    try {
      // FOR TESTING: Always return Juba location
      // Comment this out for production
      return this.getDefaultLocation();
      
      // Production code (currently disabled)
      // Check cache first
      const cached = await this.getCachedLocation();
      if (cached) {
        return cached;
      }

      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        return this.getDefaultLocation();
      }

      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          async (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: Date.now(),
            };

            // Reverse geocode to get city and country
            const address = await this.reverseGeocode(
              location.latitude,
              location.longitude
            );

            const fullLocation = {
              ...location,
              ...address,
            };

            this.currentLocation = fullLocation;
            await this.cacheLocation(fullLocation);
            resolve(fullLocation);
          },
          (error) => {
            console.error('Location error:', error);
            resolve(this.getDefaultLocation());
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          }
        );
      });
    } catch (error) {
      console.error('Get location error:', error);
      return this.getDefaultLocation();
    }
  }

  async reverseGeocode(latitude, longitude) {
    try {
      // Using OpenStreetMap's Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Dott App',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      
      return {
        city: data.address.city || 
              data.address.town || 
              data.address.village || 
              data.address.municipality || 
              'Unknown',
        state: data.address.state || '',
        country: data.address.country || 'Unknown',
        displayName: data.display_name || 'Current Location',
        formattedAddress: this.formatAddress(data.address),
      };
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return {
        city: 'Unknown',
        country: 'Unknown',
        displayName: 'Current Location',
        formattedAddress: 'Current Location',
      };
    }
  }

  formatAddress(address) {
    const parts = [];
    
    if (address.house_number) parts.push(address.house_number);
    if (address.road) parts.push(address.road);
    if (address.suburb) parts.push(address.suburb);
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ') || 'Current Location';
  }

  async getCachedLocation() {
    try {
      const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        const location = JSON.parse(cached);
        if (Date.now() - location.timestamp < CACHE_DURATION) {
          return location;
        }
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return null;
  }

  async cacheLocation(location) {
    try {
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  getDefaultLocation() {
    return {
      latitude: 4.8517,
      longitude: 31.5825,
      city: 'Juba',
      state: 'Central Equatoria',
      country: 'South Sudan',
      displayName: 'Juba, South Sudan',
      formattedAddress: 'Juba, Central Equatoria, South Sudan',
      isDefault: true,
    };
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  toRad(value) {
    return (value * Math.PI) / 180;
  }

  formatDistance(distance) {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  }

  startWatchingLocation(callback, errorCallback) {
    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
        };
        callback(location);
      },
      (error) => {
        console.error('Watch position error:', error);
        if (errorCallback) errorCallback(error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000, // Update every 5 seconds
      }
    );
  }

  stopWatchingLocation() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  async searchNearbyPlaces(query, radius = 5000) {
    try {
      const location = await this.getCurrentLocation();
      
      // Using Overpass API for OpenStreetMap data
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["name"~"${query}"](around:${radius},${location.latitude},${location.longitude});
          way["name"~"${query}"](around:${radius},${location.latitude},${location.longitude});
        );
        out body;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      return data.elements.map(element => ({
        id: element.id,
        name: element.tags.name,
        type: element.tags.amenity || element.tags.shop || 'place',
        latitude: element.lat || element.center?.lat,
        longitude: element.lon || element.center?.lon,
        distance: this.calculateDistance(
          location.latitude,
          location.longitude,
          element.lat || element.center?.lat,
          element.lon || element.center?.lon
        ),
      }));
    } catch (error) {
      console.error('Search nearby places error:', error);
      return [];
    }
  }
}

export default new LocationService();