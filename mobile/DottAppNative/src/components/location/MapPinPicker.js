import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Ionicons';

const MapPinPicker = ({
  visible,
  onClose,
  onLocationSelect,
  initialLocation = null,
  title = 'Select Location',
  showSearchBar = true,
}) => {
  const mapRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation || {
      latitude: -4.8517, // Juba, South Sudan default
      longitude: 31.5825,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }
  );
  const [dragging, setDragging] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [geocodedAddress, setGeocodedAddress] = useState('');

  useEffect(() => {
    if (visible && !initialLocation) {
      getCurrentLocation();
    }
  }, [visible]);

  const getCurrentLocation = () => {
    setLoadingLocation(true);
    
    Geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setCurrentLocation(location);
        setSelectedLocation(location);
        animateToLocation(location);
        reverseGeocode(location.latitude, location.longitude);
        setLoadingLocation(false);
      },
      (error) => {
        console.log('Location error:', error);
        setLoadingLocation(false);
        Alert.alert(
          'Location Error',
          'Unable to get your current location. Please select manually on the map.',
          [{ text: 'OK' }]
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const animateToLocation = (location) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...location,
        latitudeDelta: location.latitudeDelta || 0.01,
        longitudeDelta: location.longitudeDelta || 0.01,
      }, 1000);
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      // Basic reverse geocoding - in a real app, use Google Places API
      // For now, just show coordinates
      const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setGeocodedAddress(address);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setGeocodedAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    }
  };

  const handleMapPress = (event) => {
    const coordinate = event.nativeEvent.coordinate;
    setSelectedLocation({
      ...selectedLocation,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
    reverseGeocode(coordinate.latitude, coordinate.longitude);
  };

  const handleMarkerDragEnd = (event) => {
    const coordinate = event.nativeEvent.coordinate;
    setSelectedLocation({
      ...selectedLocation,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
    setDragging(false);
    reverseGeocode(coordinate.latitude, coordinate.longitude);
  };

  const handleConfirmLocation = () => {
    if (onLocationSelect) {
      onLocationSelect({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: geocodedAddress,
        accuracy: currentLocation?.accuracy || null,
      });
    }
    onClose();
  };

  const handleMyLocation = () => {
    getCurrentLocation();
  };

  const zoomIn = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...selectedLocation,
        latitudeDelta: selectedLocation.latitudeDelta * 0.5,
        longitudeDelta: selectedLocation.longitudeDelta * 0.5,
      }, 500);
      setSelectedLocation(prev => ({
        ...prev,
        latitudeDelta: prev.latitudeDelta * 0.5,
        longitudeDelta: prev.longitudeDelta * 0.5,
      }));
    }
  };

  const zoomOut = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...selectedLocation,
        latitudeDelta: selectedLocation.latitudeDelta * 2,
        longitudeDelta: selectedLocation.longitudeDelta * 2,
      }, 500);
      setSelectedLocation(prev => ({
        ...prev,
        latitudeDelta: prev.latitudeDelta * 2,
        longitudeDelta: prev.longitudeDelta * 2,
      }));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Icon name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmLocation}
          >
            <Text style={styles.confirmButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {showSearchBar && (
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a place..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                // TODO: Implement place search
                console.log('Search for:', searchQuery);
              }}
            />
          </View>
        )}

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            region={selectedLocation}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
            mapType="standard"
          >
            <Marker
              coordinate={{
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              }}
              draggable={true}
              onDragStart={() => setDragging(true)}
              onDragEnd={handleMarkerDragEnd}
              pinColor="#047857"
            />
          </MapView>

          {/* Floating Controls */}
          <View style={styles.mapControls}>
            <TouchableOpacity
              style={[styles.controlButton, loadingLocation && styles.controlButtonDisabled]}
              onPress={handleMyLocation}
              disabled={loadingLocation}
            >
              {loadingLocation ? (
                <ActivityIndicator size="small" color="#047857" />
              ) : (
                <Icon name="locate" size={20} color="#047857" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={zoomIn}>
              <Icon name="add" size={20} color="#047857" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={zoomOut}>
              <Icon name="remove" size={20} color="#047857" />
            </TouchableOpacity>
          </View>

          {/* Center Crosshair (alternative to draggable marker) */}
          {dragging && (
            <View style={styles.centerMarker}>
              <Icon name="add" size={30} color="#047857" />
            </View>
          )}
        </View>

        {/* Location Info */}
        <View style={styles.locationInfo}>
          <View style={styles.coordinatesContainer}>
            <Icon name="location" size={16} color="#047857" />
            <Text style={styles.coordinatesText}>
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </Text>
          </View>
          
          {geocodedAddress && (
            <View style={styles.addressContainer}>
              <Icon name="home" size={16} color="#6b7280" />
              <Text style={styles.addressText}>{geocodedAddress}</Text>
            </View>
          )}
          
          <Text style={styles.instructionText}>
            {dragging ? 'Drag the pin to adjust location' : 'Tap on the map or drag the pin to select location'}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  confirmButton: {
    backgroundColor: '#047857',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
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
    right: 20,
    top: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  controlButtonDisabled: {
    opacity: 0.6,
  },
  centerMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -15,
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
  },
  locationInfo: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  coordinatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coordinatesText: {
    fontSize: 14,
    color: '#047857',
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
    flex: 1,
  },
  instructionText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default MapPinPicker;