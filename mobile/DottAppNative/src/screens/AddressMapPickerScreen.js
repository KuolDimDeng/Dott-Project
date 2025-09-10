import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';

const { width, height } = Dimensions.get('window');

export default function AddressMapPickerScreen({ navigation, route }) {
  const { initialLocation, onLocationSelected } = route.params;
  const mapRef = useRef(null);
  
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: initialLocation?.latitude || 4.8594,
    longitude: initialLocation?.longitude || 31.5713,
  });
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    // Reverse geocode initial location
    reverseGeocode(selectedLocation.latitude, selectedLocation.longitude);
  }, []);

  const reverseGeocode = async (latitude, longitude) => {
    try {
      setLoading(true);
      
      // TODO: Implement with Google Maps Geocoding API
      // For now, generate a simple address format
      const simpleAddress = `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      
      // Mock address based on Juba coordinates
      let mockAddress = '';
      if (latitude > 4.85 && latitude < 4.87 && longitude > 31.57 && longitude < 31.58) {
        mockAddress = 'Juba Teaching Hospital Road, Juba, South Sudan';
      } else if (latitude > 4.83 && latitude < 4.85 && longitude > 31.58 && longitude < 31.59) {
        mockAddress = 'University of Juba, Juba, South Sudan';
      } else if (latitude > 4.86 && latitude < 4.88 && longitude > 31.59 && longitude < 31.61) {
        mockAddress = 'Konyokonyo Market, Juba, South Sudan';
      } else {
        mockAddress = `${simpleAddress}, Juba, South Sudan`;
      }
      
      setAddress(mockAddress);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    } finally {
      setLoading(false);
    }
  };

  const onMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    reverseGeocode(latitude, longitude);
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedLocation({ latitude, longitude });
        reverseGeocode(latitude, longitude);
        
        // Animate map to current location
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
        
        setGettingLocation(false);
      },
      (error) => {
        console.log('Location error:', error);
        Alert.alert(
          'Location Error',
          'Unable to get your current location. Please check location permissions.',
          [{ text: 'OK' }]
        );
        setGettingLocation(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 10000 
      }
    );
  };

  const handleConfirmLocation = () => {
    if (onLocationSelected) {
      onLocationSelected({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: address,
      });
    }
    navigation.goBack();
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      
      // TODO: Implement with Google Places API
      // For now, provide some predefined locations in Juba
      const predefinedLocations = {
        'juba teaching hospital': { latitude: 4.8594, longitude: 31.5713 },
        'university of juba': { latitude: 4.8400, longitude: 31.5825 },
        'konyokonyo market': { latitude: 4.8700, longitude: 31.6000 },
        'juba international airport': { latitude: 4.8721, longitude: 31.6011 },
        'freedom hall': { latitude: 4.8515, longitude: 31.5820 },
      };
      
      const searchKey = searchQuery.toLowerCase();
      let foundLocation = null;
      
      for (const [key, location] of Object.entries(predefinedLocations)) {
        if (key.includes(searchKey) || searchKey.includes(key.split(' ')[0])) {
          foundLocation = location;
          break;
        }
      }
      
      if (foundLocation) {
        setSelectedLocation(foundLocation);
        reverseGeocode(foundLocation.latitude, foundLocation.longitude);
        
        mapRef.current?.animateToRegion({
          ...foundLocation,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      } else {
        Alert.alert('Location Not Found', 'Try searching for popular places in Juba');
      }
    } catch (error) {
      Alert.alert('Search Error', 'Unable to search for location');
    } finally {
      setLoading(false);
    }
  };

  const zoomIn = () => {
    mapRef.current?.getCamera().then((camera) => {
      camera.zoom += 1;
      mapRef.current?.animateCamera(camera, { duration: 300 });
    });
  };

  const zoomOut = () => {
    mapRef.current?.getCamera().then((camera) => {
      camera.zoom -= 1;
      mapRef.current?.animateCamera(camera, { duration: 300 });
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Location</Text>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmLocation}
        >
          <Text style={styles.confirmButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for places in Juba..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchLocation}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Icon name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={searchLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Icon name="search" size={16} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={onMapPress}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
        >
          <Marker
            coordinate={selectedLocation}
            title="Selected Location"
            description={address}
            pinColor="#2563eb"
          />
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.controlButton, gettingLocation && styles.controlButtonActive]}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Icon name="locate" size={20} color="#2563eb" />
            )}
          </TouchableOpacity>
          
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomButton} onPress={zoomIn}>
              <Icon name="add" size={20} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomButton} onPress={zoomOut}>
              <Icon name="remove" size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Center Crosshair */}
        <View style={styles.centerMarker}>
          <Icon name="add" size={24} color="#2563eb" />
        </View>
      </View>

      {/* Selected Address Info */}
      <View style={styles.addressInfo}>
        <View style={styles.addressHeader}>
          <Icon name="location" size={20} color="#2563eb" />
          <Text style={styles.addressTitle}>Selected Location</Text>
        </View>
        
        <Text style={styles.addressText}>
          {loading ? 'Getting address...' : address}
        </Text>
        
        <Text style={styles.coordinatesText}>
          {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
        </Text>

        <View style={styles.helpText}>
          <Icon name="information-circle" size={16} color="#6b7280" />
          <Text style={styles.helpTextContent}>
            Tap anywhere on the map to select a different location
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 20,
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButtonActive: {
    backgroundColor: '#eff6ff',
  },
  zoomControls: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  zoomButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressInfo: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  helpText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpTextContent: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
});