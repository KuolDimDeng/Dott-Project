import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import NetInfo from '@react-native-community/netinfo';

import FormInput from '../components/forms/FormInput';
import PhoneInput from '../components/forms/PhoneInput';
import MapPinPicker from '../components/location/MapPinPicker';
import { useAuth } from '../context/AuthContext';
import personalInfoService from '../services/personalInfoService';

// Common countries for the picker
const COUNTRIES = [
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
];

export default function PersonalInfoScreen({ navigation }) {
  const { user, sessionToken, refreshUser } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    street: '',
    city: '',
    state: '',
    postcode: '',
    country: 'SS',
    latitude: null,
    longitude: null,
    locationAccuracy: null,
    locationAddress: '',
    landmark: '',
    areaDescription: '',
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState({ hasPending: false, synced: true });
  const [errors, setErrors] = useState({});

  // Load user data on mount
  useEffect(() => {
    loadUserData();
    checkSyncStatus();
    setupNetworkListener();
  }, [user]);

  // Track form changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [formData]);

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });
    
    return unsubscribe;
  };

  const loadUserData = () => {
    if (user) {
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        phoneNumber: user.phone_number || '',
        street: user.street || '',
        city: user.city || '',
        state: user.state || '',
        postcode: user.postcode || '',
        country: user.country || 'SS',
        latitude: user.latitude ? parseFloat(user.latitude) : null,
        longitude: user.longitude ? parseFloat(user.longitude) : null,
        locationAccuracy: user.location_accuracy || null,
        locationAddress: user.location_address || '',
        landmark: user.landmark || '',
        areaDescription: user.area_description || '',
      });
      setHasUnsavedChanges(false);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const status = await personalInfoService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleLocationSelect = (location) => {
    updateFormData('latitude', location.latitude);
    updateFormData('longitude', location.longitude);
    updateFormData('locationAccuracy', location.accuracy);
    updateFormData('locationAddress', location.address);
  };

  const clearLocation = () => {
    Alert.alert(
      'Clear Location',
      'Are you sure you want to remove the selected location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            updateFormData('latitude', null);
            updateFormData('longitude', null);
            updateFormData('locationAccuracy', null);
            updateFormData('locationAddress', '');
          }
        }
      ]
    );
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    // Phone number validation
    if (formData.phoneNumber) {
      const phoneRegex = /^\+\d{1,4}\s?\d{7,15}$/;
      if (!phoneRegex.test(formData.phoneNumber)) {
        newErrors.phoneNumber = 'Please enter a valid phone number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please correct the errors before saving.');
      return;
    }

    try {
      setSaving(true);
      
      // Format data for API
      const apiData = personalInfoService.formatForAPI(formData);
      
      // Save using service with offline support
      const result = await personalInfoService.updatePersonalInfo(apiData, sessionToken);
      
      if (result.success) {
        setHasUnsavedChanges(false);
        
        if (result.synced) {
          // Successfully synced to backend
          Alert.alert(
            'Success',
            'Your personal information has been updated successfully.',
            [{ text: 'OK' }]
          );
          
          // Refresh user data
          if (refreshUser) {
            await refreshUser();
          }
        } else {
          // Saved offline
          Alert.alert(
            'Saved Offline',
            'Your information has been saved and will be synced when you have an internet connection.',
            [{ text: 'OK' }]
          );
        }
        
        // Update sync status
        checkSyncStatus();
        
      } else {
        throw new Error('Failed to save personal information');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert(
        'Error',
        `Failed to save personal information: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGoBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save before leaving?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: handleSave },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const getSelectedCountryName = () => {
    const country = COUNTRIES.find(c => c.code === formData.country);
    return country ? `${country.flag} ${country.name}` : formData.country;
  };

  const renderSyncStatusBanner = () => {
    if (!syncStatus.hasPending) return null;
    
    return (
      <View style={styles.syncBanner}>
        <Icon name="cloud-upload-outline" size={16} color="#f59e0b" />
        <Text style={styles.syncBannerText}>
          {isOnline ? 'Syncing changes...' : 'Changes will sync when online'}
        </Text>
        {!isOnline && (
          <Icon name="wifi-off" size={16} color="#ef4444" />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Icon name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
        <TouchableOpacity
          style={[styles.saveButton, (!hasUnsavedChanges || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasUnsavedChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {renderSyncStatusBanner()}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Basic Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BASIC INFORMATION</Text>
            
            <FormInput
              label="First Name"
              value={formData.firstName}
              onChangeText={(value) => updateFormData('firstName', value)}
              placeholder="Enter your first name"
              required
              error={errors.firstName}
              showClearButton
              autoCapitalize="words"
            />
            
            <FormInput
              label="Last Name"
              value={formData.lastName}
              onChangeText={(value) => updateFormData('lastName', value)}
              placeholder="Enter your last name"
              required
              error={errors.lastName}
              showClearButton
              autoCapitalize="words"
            />
          </View>

          {/* Contact Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTACT</Text>
            
            <FormInput
              label="Email (cannot be changed)"
              value={user?.email || ''}
              placeholder="Email address"
              editable={false}
              leftIcon="mail"
            />
            
            <PhoneInput
              label="Phone Number"
              value={formData.phoneNumber}
              onChangeText={(value) => updateFormData('phoneNumber', value)}
              placeholder="Enter phone number"
              error={errors.phoneNumber}
              defaultCountry={formData.country}
            />
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LOCATION (Optional)</Text>
            
            {/* Map Pin Picker */}
            <View style={styles.locationContainer}>
              <Text style={styles.locationLabel}>Drop Pin on Map</Text>
              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => setShowMapPicker(true)}
              >
                <Icon name="location" size={20} color="#047857" />
                <Text style={styles.mapButtonText}>
                  {formData.latitude && formData.longitude 
                    ? `Selected: ${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(6)}`
                    : 'Select Location on Map'
                  }
                </Text>
                {formData.latitude && formData.longitude && (
                  <TouchableOpacity
                    style={styles.clearLocationButton}
                    onPress={clearLocation}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="close-circle" size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.orText}>OR enter address manually:</Text>

            <FormInput
              label="City/Area"
              value={formData.city}
              onChangeText={(value) => updateFormData('city', value)}
              placeholder="e.g., Juba, Tongping"
              showClearButton
              autoCapitalize="words"
            />

            <FormInput
              label="Landmark/Description"
              value={formData.landmark}
              onChangeText={(value) => updateFormData('landmark', value)}
              placeholder="e.g., Near Total Energies Station"
              multiline
              numberOfLines={2}
              showClearButton
            />

            <FormInput
              label="Area Description"
              value={formData.areaDescription}
              onChangeText={(value) => updateFormData('areaDescription', value)}
              placeholder="Additional details for delivery"
              multiline
              numberOfLines={2}
              showClearButton
            />

            <TouchableOpacity style={styles.countrySelector}>
              <Text style={styles.countryLabel}>Country</Text>
              <View style={styles.countryValue}>
                <Text style={styles.countryText}>{getSelectedCountryName()}</Text>
                <Icon name="chevron-down" size={16} color="#6b7280" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Optional Fields Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADDITIONAL DETAILS (Optional)</Text>
            
            <FormInput
              label="Street Address"
              value={formData.street}
              onChangeText={(value) => updateFormData('street', value)}
              placeholder="Street address if available"
              showClearButton
            />

            <View style={styles.row}>
              <FormInput
                label="State/Province"
                value={formData.state}
                onChangeText={(value) => updateFormData('state', value)}
                placeholder="State or region"
                containerStyle={styles.halfWidth}
                showClearButton
              />

              <FormInput
                label="Postal Code"
                value={formData.postcode}
                onChangeText={(value) => updateFormData('postcode', value)}
                placeholder="ZIP/Postal code"
                containerStyle={styles.halfWidth}
                keyboardType="default"
                showClearButton
              />
            </View>
          </View>

          {/* Bottom padding for keyboard */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Map Picker Modal */}
      <MapPinPicker
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={
          formData.latitude && formData.longitude
            ? {
                latitude: formData.latitude,
                longitude: formData.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : null
        }
        title="Select Your Location"
      />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    backgroundColor: '#047857',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  syncBannerText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#064e3b',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  locationContainer: {
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#047857',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderStyle: 'dashed',
  },
  mapButtonText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#047857',
    fontWeight: '500',
  },
  clearLocationButton: {
    marginLeft: 8,
  },
  orText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginVertical: 16,
    fontStyle: 'italic',
  },
  countrySelector: {
    marginTop: 16,
  },
  countryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  countryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  countryText: {
    fontSize: 16,
    color: '#111827',
  },
});
