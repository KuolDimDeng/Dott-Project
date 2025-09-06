import { Linking, Platform, Alert } from 'react-native';

/**
 * Navigation helper for map integration
 * Supports Google Maps, Apple Maps, and Waze
 */

const MAPS = {
  GOOGLE: 'google',
  APPLE: 'apple',
  WAZE: 'waze',
};

/**
 * Check if an app is installed
 */
const isAppInstalled = async (appUrl) => {
  try {
    return await Linking.canOpenURL(appUrl);
  } catch (error) {
    return false;
  }
};

/**
 * Get available navigation apps
 */
export const getAvailableNavigationApps = async () => {
  const apps = [];
  
  // Check Google Maps
  const googleMapsUrl = Platform.select({
    ios: 'comgooglemaps://',
    android: 'google.navigation:q=',
  });
  
  if (googleMapsUrl && await isAppInstalled(googleMapsUrl)) {
    apps.push({
      id: MAPS.GOOGLE,
      name: 'Google Maps',
      icon: 'navigate',
    });
  }
  
  // Check Waze
  if (await isAppInstalled('waze://')) {
    apps.push({
      id: MAPS.WAZE,
      name: 'Waze',
      icon: 'car',
    });
  }
  
  // Apple Maps is always available on iOS
  if (Platform.OS === 'ios') {
    apps.push({
      id: MAPS.APPLE,
      name: 'Apple Maps',
      icon: 'map',
    });
  }
  
  // If no apps found, web fallback is always available
  if (apps.length === 0) {
    apps.push({
      id: 'web',
      name: 'Open in Browser',
      icon: 'globe',
    });
  }
  
  return apps;
};

/**
 * Navigate to a single destination
 */
export const navigateToLocation = async (destination, preferredApp = null) => {
  const { latitude, longitude, address, name } = destination;
  
  if (!latitude || !longitude) {
    Alert.alert('Error', 'Invalid destination coordinates');
    return;
  }
  
  const encodedAddress = encodeURIComponent(address || `${latitude},${longitude}`);
  const encodedName = encodeURIComponent(name || 'Destination');
  
  let url;
  
  if (!preferredApp) {
    // Show app selection if no preference
    const availableApps = await getAvailableNavigationApps();
    if (availableApps.length > 1) {
      return showAppSelection(availableApps, destination);
    }
    preferredApp = availableApps[0]?.id;
  }
  
  switch (preferredApp) {
    case MAPS.GOOGLE:
      url = Platform.select({
        ios: `comgooglemaps://?q=${encodedName}&center=${latitude},${longitude}`,
        android: `google.navigation:q=${latitude},${longitude}`,
      });
      break;
      
    case MAPS.APPLE:
      url = `maps://app?daddr=${latitude},${longitude}&q=${encodedName}`;
      break;
      
    case MAPS.WAZE:
      url = `waze://?ll=${latitude},${longitude}&navigate=yes`;
      break;
      
    default:
      // Web fallback
      url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      break;
  }
  
  try {
    await Linking.openURL(url);
  } catch (error) {
    // Fallback to web
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(webUrl);
  }
};

/**
 * Navigate with multiple waypoints (for delivery routes)
 */
export const navigateWithWaypoints = async (waypoints, preferredApp = null) => {
  if (!waypoints || waypoints.length === 0) {
    Alert.alert('Error', 'No waypoints provided');
    return;
  }
  
  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const stops = waypoints.slice(1, -1);
  
  if (!preferredApp) {
    const availableApps = await getAvailableNavigationApps();
    if (availableApps.length > 1) {
      return showMultiStopAppSelection(availableApps, waypoints);
    }
    preferredApp = availableApps[0]?.id;
  }
  
  let url;
  
  switch (preferredApp) {
    case MAPS.GOOGLE:
      const waypointsStr = stops
        .map(w => `${w.latitude},${w.longitude}`)
        .join('|');
      
      if (Platform.OS === 'ios') {
        url = `comgooglemaps://?saddr=${origin.latitude},${origin.longitude}&daddr=${destination.latitude},${destination.longitude}`;
        if (stops.length > 0) {
          url += `&waypoints=${waypointsStr}`;
        }
      } else {
        url = `google.navigation:q=${destination.latitude},${destination.longitude}`;
      }
      break;
      
    case MAPS.APPLE:
      // Apple Maps doesn't support multiple waypoints via URL scheme
      // Navigate to first destination only
      url = `maps://app?saddr=${origin.latitude},${origin.longitude}&daddr=${destination.latitude},${destination.longitude}`;
      if (stops.length > 0) {
        Alert.alert(
          'Limited Support',
          'Apple Maps will navigate to the final destination only. Intermediate stops are not supported.',
        );
      }
      break;
      
    case MAPS.WAZE:
      // Waze doesn't support waypoints via URL scheme
      url = `waze://?ll=${destination.latitude},${destination.longitude}&navigate=yes`;
      if (stops.length > 0) {
        Alert.alert(
          'Limited Support',
          'Waze will navigate to the final destination only. Intermediate stops are not supported.',
        );
      }
      break;
      
    default:
      // Web fallback with waypoints
      const waypointsParam = stops
        .map(w => `via:${w.latitude},${w.longitude}`)
        .join('|');
      url = `https://www.google.com/maps/dir/${origin.latitude},${origin.longitude}/${waypointsParam}/${destination.latitude},${destination.longitude}`;
      break;
  }
  
  try {
    await Linking.openURL(url);
  } catch (error) {
    // Fallback to web
    const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}`;
    Linking.openURL(webUrl);
  }
};

/**
 * Show app selection dialog
 */
const showAppSelection = (apps, destination) => {
  const options = apps.map(app => app.name);
  options.push('Cancel');
  
  Alert.alert(
    'Select Navigation App',
    'Choose an app to navigate with',
    options.map((option, index) => ({
      text: option,
      onPress: () => {
        if (index < apps.length) {
          navigateToLocation(destination, apps[index].id);
        }
      },
    })),
  );
};

/**
 * Show app selection for multi-stop navigation
 */
const showMultiStopAppSelection = (apps, waypoints) => {
  const options = apps.map(app => app.name);
  options.push('Cancel');
  
  Alert.alert(
    'Select Navigation App',
    'Choose an app to navigate with',
    options.map((option, index) => ({
      text: option,
      onPress: () => {
        if (index < apps.length) {
          navigateWithWaypoints(waypoints, apps[index].id);
        }
      },
    })),
  );
};

/**
 * Calculate distance between two coordinates (in meters)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Format distance for display
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * Get directions URL for sharing
 */
export const getDirectionsUrl = (destination) => {
  const { latitude, longitude } = destination;
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
};

/**
 * Share location
 */
export const shareLocation = async (destination) => {
  const { latitude, longitude, name, address } = destination;
  const url = getDirectionsUrl(destination);
  const message = `${name || 'Location'}\n${address || ''}\n${url}`;
  
  try {
    const { Share } = require('react-native');
    await Share.share({
      message,
      url,
    });
  } catch (error) {
    Alert.alert('Error', 'Could not share location');
  }
};

export default {
  navigateToLocation,
  navigateWithWaypoints,
  getAvailableNavigationApps,
  calculateDistance,
  formatDistance,
  getDirectionsUrl,
  shareLocation,
};