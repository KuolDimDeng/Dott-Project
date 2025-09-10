import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function AddEditAddressScreen({ navigation, route }) {
  const { user } = useAuth();
  const { address, isEdit } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState({
    title: address?.title || '',
    address: address?.address || '',
    latitude: address?.latitude || 4.8594, // Default to Juba
    longitude: address?.longitude || 31.5713,
    type: address?.type || 'home',
    notes: address?.notes || '',
  });

  const addressTypes = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'work', label: 'Work', icon: 'business' },
    { id: 'other', label: 'Other', icon: 'location' },
  ];

  useEffect(() => {
    // Get current location if adding new address
    if (!isEdit) {
      getCurrentLocation();
    }
  }, []);

  const getCurrentLocation = () => {
    setGettingLocation(true);
    
    Geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setGettingLocation(false);
      },
      (error) => {
        console.log('Location error:', error);
        Alert.alert(
          'Location Access',
          'Unable to get your current location. You can manually select location on the map.',
          [{ text: 'OK' }]
        );
        setGettingLocation(false);
      },
      { 
        enableHighAccuracy: false, 
        timeout: 15000, 
        maximumAge: 10000 
      }
    );
  };

  const openMapPicker = () => {
    navigation.navigate('AddressMapPicker', {
      initialLocation: {
        latitude: formData.latitude,
        longitude: formData.longitude,
      },
      onLocationSelected: (location) => {
        setFormData(prev => ({
          ...prev,
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || prev.address,
        }));
      },
    });
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      // TODO: Implement reverse geocoding with Google Maps API
      // For now, return a formatted address
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title for this address');
      return false;
    }
    
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter the address or select location on map');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const addressData = {
        id: isEdit ? address.id : Date.now().toString(),
        ...formData,
        isDefault: isEdit ? address.isDefault : false,
      };

      // TODO: Replace with actual API call
      // if (isEdit) {
      //   await api.patch(`/user/delivery-addresses/${address.id}/`, addressData);
      // } else {
      //   await api.post('/user/delivery-addresses/', addressData);
      // }

      // Update local storage
      const cachedAddresses = await AsyncStorage.getItem(`addresses_${user?.id}`);
      let addresses = cachedAddresses ? JSON.parse(cachedAddresses) : [];

      if (isEdit) {
        addresses = addresses.map(addr => 
          addr.id === address.id ? addressData : addr
        );
      } else {
        addresses.push(addressData);
        
        // If this is the first address, make it default
        if (addresses.length === 1) {
          addressData.isDefault = true;
          await AsyncStorage.setItem(`defaultAddress_${user?.id}`, addressData.id);
        }
      }

      await AsyncStorage.setItem(`addresses_${user?.id}`, JSON.stringify(addresses));

      Alert.alert(
        'Success',
        `Address ${isEdit ? 'updated' : 'added'} successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEdit ? 'update' : 'add'} address`);
    } finally {
      setLoading(false);
    }
  };

  const onMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const address = await reverseGeocode(latitude, longitude);
    
    setFormData(prev => ({
      ...prev,
      latitude,
      longitude,
      address: address || prev.address,
    }));
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
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Address' : 'Add Address'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Address Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address Type</Text>
            <View style={styles.typeSelector}>
              {addressTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeOption,
                    formData.type === type.id && styles.typeOptionActive,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, type: type.id }))}
                >
                  <Icon
                    name={type.icon}
                    size={20}
                    color={formData.type === type.id ? '#2563eb' : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      formData.type === type.id && styles.typeLabelActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Address Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Home, Office, Apartment"
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            />
          </View>

          {/* Address Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter full address or select on map"
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Map Section */}
          <View style={styles.section}>
            <View style={styles.mapHeader}>
              <Text style={styles.sectionTitle}>Location on Map</Text>
              <View style={styles.mapActions}>
                <TouchableOpacity
                  style={styles.mapActionButton}
                  onPress={getCurrentLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    <Icon name="locate" size={16} color="#2563eb" />
                  )}
                  <Text style={styles.mapActionText}>My Location</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.mapActionButton}
                  onPress={openMapPicker}
                >
                  <Icon name="expand" size={16} color="#2563eb" />
                  <Text style={styles.mapActionText}>Full Map</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: formData.latitude,
                  longitude: formData.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                onPress={onMapPress}
                showsUserLocation={true}
                showsMyLocationButton={false}
              >
                <Marker
                  coordinate={{
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                  }}
                  title={formData.title || 'Selected Location'}
                  description={formData.address}
                  pinColor="#2563eb"
                />
              </MapView>
              
              <View style={styles.mapInstruction}>
                <Icon name="information-circle" size={16} color="#6b7280" />
                <Text style={styles.mapInstructionText}>
                  Tap on the map to select exact location
                </Text>
              </View>
            </View>
          </View>

          {/* Delivery Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Gate code, building entrance, landmarks"
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Icon name="checkmark-circle" size={20} color="white" />
                <Text style={styles.saveButtonText}>
                  {isEdit ? 'Update Address' : 'Save Address'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    gap: 8,
  },
  typeOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  typeLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  typeLabelActive: {
    color: '#2563eb',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapActions: {
    flexDirection: 'row',
    gap: 12,
  },
  mapActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: 'white',
    gap: 4,
  },
  mapActionText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  map: {
    width: '100%',
    height: 200,
  },
  mapInstruction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    gap: 8,
  },
  mapInstructionText: {
    fontSize: 12,
    color: '#6b7280',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
    marginBottom: 32,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});