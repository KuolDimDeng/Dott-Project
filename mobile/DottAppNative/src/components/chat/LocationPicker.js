import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';

const { width, height } = Dimensions.get('window');

export default function LocationPicker({ onSendLocation, onCancel, visible }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');

  useEffect(() => {
    if (visible) {
      getCurrentLocation();
    }
  }, [visible]);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      // iOS permissions are handled through Info.plist
      return true;
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'App needs access to your location to share it.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      // Using a free reverse geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        return data.display_name;
      }
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.log('Reverse geocoding failed:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      
      // Request location permissions
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission required',
          'Please grant location permission to share your location',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() },
          ]
        );
        setIsLoading(false);
        return;
      }

      // Get current location
      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          // Get address
          const address = await reverseGeocode(latitude, longitude);
          
          setCurrentLocation({
            latitude,
            longitude,
            address,
            accuracy,
          });
          
          setIsLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          Alert.alert('Error', 'Could not get your current location. Please try again.');
          setIsLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );

    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get your current location. Please try again.');
      setIsLoading(false);
    }
  };

  const handleLocationTypeSelect = (type) => {
    setSelectedType(type);
    
    if (type === 'current') {
      // Send current location immediately
      sendLocation('current', currentLocation);
    }
  };

  const sendLocation = (type, locationData = currentLocation) => {
    if (!locationData) {
      Alert.alert('Error', 'Location data not available');
      return;
    }

    const locationMessage = {
      type: 'location',
      location: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: type === 'pin' ? customAddress || locationData.address : locationData.address,
        name: type === 'pin' ? customName : undefined,
        type: type,
        accuracy: locationData.accuracy,
        // For live location, set expiry time (8 hours from now)
        expiresAt: type === 'live' ? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() : undefined,
      },
    };

    onSendLocation(locationMessage);
    resetState();
  };

  const resetState = () => {
    setSelectedType(null);
    setCustomName('');
    setCustomAddress('');
    setCurrentLocation(null);
  };

  const handleCancel = () => {
    resetState();
    onCancel();
  };

  const openInMaps = () => {
    if (!currentLocation) return;
    
    const { latitude, longitude } = currentLocation;
    const url = `maps://app?saddr=${latitude},${longitude}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps web
        const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        Linking.openURL(googleMapsUrl);
      }
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Icon name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share Location</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
          ) : currentLocation ? (
            <>
              {/* Current Location Preview */}
              <View style={styles.locationPreview}>
                <View style={styles.mapPlaceholder}>
                  <Icon name="location" size={48} color="#2563eb" />
                  <Text style={styles.coordinatesText}>
                    {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                  </Text>
                </View>
                
                <View style={styles.locationInfo}>
                  <Text style={styles.addressText}>{currentLocation.address}</Text>
                  <Text style={styles.accuracyText}>
                    Accuracy: ±{Math.round(currentLocation.accuracy)}m
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.openMapsButton}
                  onPress={openInMaps}
                >
                  <Icon name="map-outline" size={20} color="#2563eb" />
                  <Text style={styles.openMapsText}>Open in Maps</Text>
                </TouchableOpacity>
              </View>

              {/* Location Type Options */}
              <View style={styles.optionsContainer}>
                <Text style={styles.optionsTitle}>Choose how to share:</Text>
                
                <TouchableOpacity
                  style={[styles.option, selectedType === 'current' && styles.selectedOption]}
                  onPress={() => handleLocationTypeSelect('current')}
                >
                  <Icon name="location-outline" size={24} color="#2563eb" />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Current Location</Text>
                    <Text style={styles.optionDescription}>
                      Share your exact location once
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.option, selectedType === 'live' && styles.selectedOption]}
                  onPress={() => setSelectedType('live')}
                >
                  <Icon name="radio-outline" size={24} color="#10b981" />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Live Location</Text>
                    <Text style={styles.optionDescription}>
                      Share your location for 8 hours (updates automatically)
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.option, selectedType === 'pin' && styles.selectedOption]}
                  onPress={() => setSelectedType('pin')}
                >
                  <Icon name="pin-outline" size={24} color="#f59e0b" />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Custom Pin</Text>
                    <Text style={styles.optionDescription}>
                      Add a custom name and description
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Custom Pin Form */}
              {selectedType === 'pin' && (
                <View style={styles.customForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="Location name (e.g., 'Coffee Shop', 'My Office')"
                    value={customName}
                    onChangeText={setCustomName}
                    maxLength={50}
                  />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Custom address or description"
                    value={customAddress}
                    onChangeText={setCustomAddress}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                  />
                  
                  <TouchableOpacity
                    style={[styles.sendButton, (!customName.trim()) && styles.disabledButton]}
                    onPress={() => sendLocation('pin')}
                    disabled={!customName.trim()}
                  >
                    <Icon name="send" size={20} color="#ffffff" />
                    <Text style={styles.sendButtonText}>Send Custom Location</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Live Location Confirmation */}
              {selectedType === 'live' && (
                <View style={styles.liveLocationForm}>
                  <View style={styles.warningBox}>
                    <Icon name="information-circle-outline" size={24} color="#f59e0b" />
                    <Text style={styles.warningText}>
                      Your live location will be shared for 8 hours and update automatically. 
                      You can stop sharing anytime.
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={() => sendLocation('live')}
                  >
                    <Icon name="radio" size={20} color="#ffffff" />
                    <Text style={styles.sendButtonText}>Start Live Sharing</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Icon name="location-outline" size={64} color="#9ca3af" />
              <Text style={styles.errorText}>Unable to get your location</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={getCurrentLocation}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 60, // Account for status bar
  },
  cancelButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  locationPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  mapPlaceholder: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 12,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  locationInfo: {
    marginBottom: 12,
  },
  addressText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  accuracyText: {
    fontSize: 12,
    color: '#6b7280',
  },
  openMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  openMapsText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  selectedOption: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  optionContent: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  customForm: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  liveLocationForm: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#fef3cd',
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#92400e',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});