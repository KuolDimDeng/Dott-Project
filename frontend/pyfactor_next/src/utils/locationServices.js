/**
 * Location Services Utility
 * Handles GPS capture, geocoding, and location verification
 */

// Geocoding service configuration
const GEOCODING_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const USE_NOMINATIM = !GEOCODING_API_KEY; // Fallback to free OpenStreetMap service

/**
 * Capture current GPS location
 * @returns {Promise<Object>} Location data with coordinates and accuracy
 */
export const captureLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: new Date(position.timestamp).toISOString(),
        });
      },
      (error) => {
        let errorMessage = 'Unable to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Convert coordinates to human-readable address
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<string>} Formatted address
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    if (USE_NOMINATIM) {
      // Use free OpenStreetMap Nominatim service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Dott Business App',
          },
        }
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      // Format address from Nominatim response
      const parts = [];
      if (data.address.house_number) parts.push(data.address.house_number);
      if (data.address.road) parts.push(data.address.road);
      if (data.address.suburb || data.address.neighbourhood) {
        parts.push(data.address.suburb || data.address.neighbourhood);
      }
      if (data.address.city || data.address.town || data.address.village) {
        parts.push(data.address.city || data.address.town || data.address.village);
      }
      if (data.address.state) parts.push(data.address.state);
      if (data.address.country) parts.push(data.address.country);
      
      return parts.join(', ') || data.display_name || 'Unknown location';
    } else {
      // Use Google Maps Geocoding API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GEOCODING_API_KEY}`
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      
      return 'Unknown location';
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // Return coordinates as fallback
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
};

/**
 * Calculate distance between two coordinates (in meters)
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Check if location is within a geofence
 * @param {Object} location Current location
 * @param {Object} geofence Geofence center and radius
 * @returns {boolean} Whether location is within geofence
 */
export const isWithinGeofence = (location, geofence) => {
  const distance = calculateDistance(
    location.latitude,
    location.longitude,
    geofence.latitude,
    geofence.longitude
  );
  
  return distance <= geofence.radius;
};

/**
 * Format location for display
 * @param {Object} location 
 * @returns {string} Formatted location string
 */
export const formatLocation = (location) => {
  if (!location) return 'Location not available';
  
  if (location.address) {
    return location.address;
  }
  
  if (location.latitude && location.longitude) {
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }
  
  return 'Unknown location';
};

/**
 * Get device information for location tracking
 * @returns {Object} Device info
 */
export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // Detect device type
  let deviceType = 'desktop';
  if (/Android/i.test(userAgent)) {
    deviceType = 'android';
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    deviceType = 'ios';
  } else if (/Windows Phone/i.test(userAgent)) {
    deviceType = 'windows_phone';
  }
  
  // Detect browser
  let browser = 'unknown';
  if (/Chrome/i.test(userAgent)) {
    browser = 'chrome';
  } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    browser = 'safari';
  } else if (/Firefox/i.test(userAgent)) {
    browser = 'firefox';
  }
  
  return {
    device_type: deviceType,
    device_model: platform,
    os_version: userAgent,
    app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    browser,
  };
};

/**
 * Request location permission
 * @returns {Promise<string>} Permission state
 */
export const requestLocationPermission = async () => {
  if (!navigator.permissions) {
    // Fallback for browsers that don't support permissions API
    return 'prompt';
  }
  
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state; // 'granted', 'denied', or 'prompt'
  } catch (error) {
    console.error('Error checking location permission:', error);
    return 'prompt';
  }
};

/**
 * Check if location services are available
 * @returns {Object} Availability status
 */
export const checkLocationAvailability = async () => {
  const status = {
    supported: !!navigator.geolocation,
    permission: 'unknown',
    https: window.location.protocol === 'https:',
  };
  
  if (status.supported) {
    status.permission = await requestLocationPermission();
  }
  
  return status;
};

/**
 * Schedule random location check
 * @param {Function} callback Function to call for location check
 * @param {Date} startTime Shift start time
 * @param {Date} endTime Shift end time
 * @returns {number} Timeout ID
 */
export const scheduleRandomLocationCheck = (callback, startTime, endTime) => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // Don't schedule if outside work hours
  if (now < start || now > end) {
    return null;
  }
  
  // Calculate random time within remaining work hours
  const remainingTime = end - now;
  const randomDelay = Math.random() * remainingTime * 0.8; // Within 80% of remaining time
  
  // Minimum 30 minutes, maximum remaining time
  const delay = Math.max(30 * 60 * 1000, Math.min(randomDelay, remainingTime));
  
  return setTimeout(callback, delay);
};

/**
 * Location tracking indicator component props
 * @returns {Object} Props for location indicator
 */
export const getLocationIndicatorProps = (isTracking, lastLocation) => {
  if (!isTracking) {
    return {
      icon: '📍',
      text: 'Location off',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
    };
  }
  
  const accuracy = lastLocation?.accuracy || 0;
  
  if (accuracy <= 10) {
    return {
      icon: '📍',
      text: 'Location on (High accuracy)',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    };
  } else if (accuracy <= 50) {
    return {
      icon: '📍',
      text: 'Location on (Good accuracy)',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    };
  } else {
    return {
      icon: '📍',
      text: 'Location on (Low accuracy)',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    };
  }
};

/**
 * Check if a location is inside a circular geofence
 * @param {object} location - Location object with latitude and longitude
 * @param {object} geofence - Geofence object with center and radius
 * @returns {object} Result with isInside boolean and distance
 */
export const checkGeofence = (location, geofence) => {
  const distance = calculateDistance(
    location.latitude,
    location.longitude,
    geofence.center_latitude,
    geofence.center_longitude
  );

  return {
    isInside: distance <= geofence.radius_meters,
    distance: distance,
    distanceFromEdge: geofence.radius_meters - distance,
  };
};

/**
 * Get human-readable distance string
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
};

/**
 * Get geofence status message
 * @param {object} checkResult - Result from checkGeofence
 * @param {object} geofence - Geofence object
 * @returns {string} Status message
 */
export const getGeofenceStatus = (checkResult, geofence) => {
  if (checkResult.isInside) {
    return `✅ Inside ${geofence.name} (${formatDistance(checkResult.distance)} from center)`;
  } else {
    return `❌ Outside ${geofence.name} (${formatDistance(Math.abs(checkResult.distanceFromEdge))} away)`;
  }
};

/**
 * Check if location is required for clock in/out
 * @param {array} geofences - Array of assigned geofences
 * @param {string} action - 'CLOCK_IN' or 'CLOCK_OUT'
 * @returns {object} Requirement info
 */
export const isLocationRequired = (geofences, action) => {
  if (!geofences || geofences.length === 0) {
    return { required: false, geofences: [] };
  }

  const relevantGeofences = geofences.filter(gf => {
    if (action === 'CLOCK_IN') {
      return gf.require_for_clock_in && gf.is_active;
    } else if (action === 'CLOCK_OUT') {
      return gf.require_for_clock_out && gf.is_active;
    }
    return false;
  });

  return {
    required: relevantGeofences.length > 0,
    geofences: relevantGeofences,
  };
};

/**
 * Find the nearest geofence from current location
 * @param {object} location - Current location
 * @param {array} geofences - Array of geofences
 * @returns {object} Nearest geofence with distance
 */
export const findNearestGeofence = (location, geofences) => {
  if (!geofences || geofences.length === 0) return null;

  let nearest = null;
  let minDistance = Infinity;

  geofences.forEach(gf => {
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      gf.center_latitude,
      gf.center_longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = {
        ...gf,
        distance: distance,
        isInside: distance <= gf.radius_meters,
      };
    }
  });

  return nearest;
};

/**
 * Get geofence template by type
 * @param {string} type - Geofence type
 * @returns {object} Template configuration
 */
export const getGeofenceTemplate = (type) => {
  const templates = {
    OFFICE: {
      name: 'Office Building',
      radius_meters: 100,
      require_for_clock_in: true,
      require_for_clock_out: false,
      icon: '🏢',
      description: 'Standard office location with strict clock-in',
    },
    CONSTRUCTION: {
      name: 'Construction Site',
      radius_meters: 200,
      require_for_clock_in: true,
      require_for_clock_out: true,
      track_time_inside: true,
      alert_on_unexpected_exit: true,
      icon: '🏗️',
      description: 'Track time on site with exit alerts',
    },
    CLIENT: {
      name: 'Client Location',
      radius_meters: 100,
      require_for_clock_in: true,
      track_time_inside: true,
      icon: '🏠',
      description: 'Verify visits and track duration',
    },
    DELIVERY: {
      name: 'Delivery Zone',
      radius_meters: 50,
      require_for_clock_in: false,
      auto_clock_out_on_exit: true,
      icon: '🚚',
      description: 'Auto-verify deliveries at each stop',
    },
  };

  return templates[type] || templates.OFFICE;
};

/**
 * Location check intervals for random checks
 */
export const LOCATION_CHECK_INTERVALS = {
  CLOCK_IN: 5 * 60 * 1000,      // 5 minutes after clock in
  REGULAR: 2 * 60 * 60 * 1000,  // Every 2 hours
  MINIMUM_GAP: 1 * 60 * 60 * 1000, // Minimum 1 hour between checks
};