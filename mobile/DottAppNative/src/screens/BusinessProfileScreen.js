import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useBusinessContext } from '../context/BusinessContext';
import MapPinPicker from '../components/location/MapPinPicker';
import api from '../services/api';
import businessApi from '../services/businessApi';
import businessProfileService from '../services/businessProfileService';
import NetInfo from '@react-native-community/netinfo';

const BUSINESS_TYPES = [
  { value: 'RESTAURANT_CAFE', label: 'Restaurant & Cafe' },
  { value: 'RETAIL_STORE', label: 'Retail Store' },
  { value: 'SERVICE_BUSINESS', label: 'Service Business' },
  { value: 'HOTEL_ACCOMMODATION', label: 'Hotel & Accommodation' },
  { value: 'TRANSPORT_LOGISTICS', label: 'Transport & Logistics' },
  { value: 'HEALTH_WELLNESS', label: 'Health & Wellness' },
  { value: 'EDUCATION_TRAINING', label: 'Education & Training' },
  { value: 'PROFESSIONAL_SERVICES', label: 'Professional Services' },
  { value: 'OTHER', label: 'Other' },
];

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export default function BusinessProfileScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const { businessData, refreshBusinessData } = useBusinessContext();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState({ hasPending: false, synced: true });
  
  // Form state
  const [formData, setFormData] = useState({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    businessType: 'OTHER',
    description: '',
    website: '',
    // Address fields
    street: '',
    city: '',
    state: '',
    postcode: '',
    country: 'SS',
    latitude: '',
    longitude: '',
    locationAddress: '',
    // Business hours
    businessHours: {},
    // Tax and registration
    taxId: '',
    registrationNumber: '',
    // Social media
    facebook: '',
    instagram: '',
    twitter: '',
  });

  // Business hours state
  const [businessHours, setBusinessHours] = useState({});

  useEffect(() => {
    loadBusinessData();
    checkSyncStatus();
    setupNetworkListener();
  }, []);

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
      if (state.isConnected && state.isInternetReachable) {
        // Trigger sync when coming online
        businessProfileService.syncPendingUpdates().then(() => {
          checkSyncStatus();
        });
      }
    });
    
    return () => unsubscribe();
  };

  const checkSyncStatus = async () => {
    try {
      const status = await businessProfileService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  };

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      
      // Initialize with existing business data
      if (businessData) {
        setFormData({
          businessName: businessData.businessName || '',
          businessEmail: businessData.businessEmail || user?.email || '',
          businessPhone: businessData.businessPhone || user?.phone_number || '',
          businessType: businessData.businessType || 'OTHER',
          description: businessData.description || '',
          website: businessData.website || '',
          street: businessData.street || '',
          city: businessData.businessCity || '',
          state: businessData.businessState || '',
          postcode: businessData.postcode || '',
          country: businessData.businessCountry || 'SS',
          latitude: businessData.latitude || null,
          longitude: businessData.longitude || null,
          locationAddress: businessData.locationAddress || '',
          taxId: businessData.taxId || '',
          registrationNumber: businessData.registrationNumber || '',
          facebook: businessData.facebook || '',
          instagram: businessData.instagram || '',
          twitter: businessData.twitter || '',
        });
        
        // Load business hours
        if (businessData.businessHours) {
          setBusinessHours(businessData.businessHours);
        } else {
          // Initialize default business hours
          const defaultHours = {};
          DAYS_OF_WEEK.forEach(day => {
            defaultHours[day.toLowerCase()] = {
              isOpen: day !== 'Sunday',
              openTime: '09:00',
              closeTime: '17:00',
            };
          });
          setBusinessHours(defaultHours);
        }
      }
    } catch (error) {
      console.error('Error loading business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.businessName) {
      Alert.alert('Error', 'Business name is required');
      return;
    }
    
    if (!formData.businessPhone) {
      Alert.alert('Error', 'Business phone number is required');
      return;
    }

    try {
      setSaving(true);
      
      // Prepare data with business hours
      const dataToSave = {
        ...formData,
        businessHours: businessHours,
      };

      // Format data for API
      const apiData = businessProfileService.formatForAPI(dataToSave);

      // Save using service with offline support
      const result = await businessProfileService.updateBusinessProfile(apiData, user?.sessionToken);
      
      if (result.success) {
        if (result.synced) {
          // Successfully synced to backend
          Alert.alert(
            'Success',
            'Business profile updated successfully',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          
          // Refresh business data and user data
          if (refreshBusinessData) {
            await refreshBusinessData();
          }
          if (refreshUser) {
            await refreshUser();
          }
        } else {
          // Saved offline
          Alert.alert(
            'Saved Offline',
            isOnline ? 
              'Business profile saved. Will retry syncing to server.' : 
              'Business profile saved offline. Will sync when you have internet connection.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
        
        // Update sync status
        await checkSyncStatus();
      } else {
        Alert.alert(
          'Error',
          result.message || 'Failed to save business profile'
        );
      }
    } catch (error) {
      console.error('Error saving business profile:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLocationSelect = (location) => {
    if (location && !isNaN(location.latitude) && !isNaN(location.longitude)) {
      setFormData(prev => ({
        ...prev,
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        locationAddress: location.address || '',
      }));
    }
  };

  const updateBusinessHours = (day, field, value) => {
    setBusinessHours(prev => ({
      ...prev,
      [day.toLowerCase()]: {
        ...prev[day.toLowerCase()],
        [field]: value,
      },
    }));
  };

  const renderBusinessHours = () => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BUSINESS HOURS</Text>
        {DAYS_OF_WEEK.map(day => {
          const dayKey = day.toLowerCase();
          const hours = businessHours[dayKey] || {};
          
          return (
            <View key={day} style={styles.dayRow}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{day}</Text>
                <Switch
                  value={hours.isOpen}
                  onValueChange={(value) => updateBusinessHours(day, 'isOpen', value)}
                  trackColor={{ false: '#e5e7eb', true: '#86efac' }}
                  thumbColor={hours.isOpen ? '#16a34a' : '#9ca3af'}
                />
              </View>
              
              {hours.isOpen && (
                <View style={styles.hoursRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={hours.openTime}
                    onChangeText={(value) => updateBusinessHours(day, 'openTime', value)}
                    placeholder="09:00"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={styles.toText}>to</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={hours.closeTime}
                    onChangeText={(value) => updateBusinessHours(day, 'closeTime', value)}
                    placeholder="17:00"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading business profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderSyncStatusBanner = () => {
    if (!syncStatus.hasPending) return null;
    
    return (
      <View style={styles.syncBanner}>
        <Icon name="cloud-upload-outline" size={16} color="#f59e0b" />
        <Text style={styles.syncBannerText}>
          {isOnline ? 'Syncing changes...' : 'Changes will sync when online'}
        </Text>
        {syncStatus.pendingCount > 0 && (
          <Text style={styles.syncBannerCount}>({syncStatus.pendingCount})</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderSyncStatusBanner()}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BASIC INFORMATION</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.businessName}
                onChangeText={(text) => setFormData({...formData, businessName: text})}
                placeholder="Enter business name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Type *</Text>
              <TouchableOpacity style={styles.pickerButton}>
                <Text style={styles.pickerText}>
                  {BUSINESS_TYPES.find(t => t.value === formData.businessType)?.label || 'Select Type'}
                </Text>
                <Icon name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
                placeholder="Describe your business"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.businessEmail}
                onChangeText={(text) => setFormData({...formData, businessEmail: text})}
                placeholder="business@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Phone *</Text>
              <TextInput
                style={styles.input}
                value={formData.businessPhone}
                onChangeText={(text) => setFormData({...formData, businessPhone: text})}
                placeholder="+1234567890"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                value={formData.website}
                onChangeText={(text) => setFormData({...formData, website: text})}
                placeholder="https://www.example.com"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BUSINESS LOCATION</Text>
            
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => setShowMapPicker(true)}
            >
              <Icon name="location" size={20} color="#2563eb" />
              <Text style={styles.mapButtonText}>
                {formData.locationAddress || 'Set Location on Map'}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street Address</Text>
              <TextInput
                style={styles.input}
                value={formData.street}
                onChangeText={(text) => setFormData({...formData, street: text})}
                placeholder="123 Main Street"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(text) => setFormData({...formData, city: text})}
                  placeholder="City"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>State/Province</Text>
                <TextInput
                  style={styles.input}
                  value={formData.state}
                  onChangeText={(text) => setFormData({...formData, state: text})}
                  placeholder="State"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Postal Code</Text>
                <TextInput
                  style={styles.input}
                  value={formData.postcode}
                  onChangeText={(text) => setFormData({...formData, postcode: text})}
                  placeholder="12345"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={styles.input}
                  value={formData.country}
                  onChangeText={(text) => setFormData({...formData, country: text})}
                  placeholder="Country"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          </View>

          {/* Business Hours */}
          {renderBusinessHours()}

          {/* Tax & Registration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TAX & REGISTRATION</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tax ID / VAT Number</Text>
              <TextInput
                style={styles.input}
                value={formData.taxId}
                onChangeText={(text) => setFormData({...formData, taxId: text})}
                placeholder="Tax identification number"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Registration Number</Text>
              <TextInput
                style={styles.input}
                value={formData.registrationNumber}
                onChangeText={(text) => setFormData({...formData, registrationNumber: text})}
                placeholder="Registration number"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Social Media */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SOCIAL MEDIA</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Facebook</Text>
              <TextInput
                style={styles.input}
                value={formData.facebook}
                onChangeText={(text) => setFormData({...formData, facebook: text})}
                placeholder="facebook.com/yourbusiness"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Instagram</Text>
              <TextInput
                style={styles.input}
                value={formData.instagram}
                onChangeText={(text) => setFormData({...formData, instagram: text})}
                placeholder="@yourbusiness"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Twitter</Text>
              <TextInput
                style={styles.input}
                value={formData.twitter}
                onChangeText={(text) => setFormData({...formData, twitter: text})}
                placeholder="@yourbusiness"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <MapPinPicker
          visible={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onLocationSelect={handleLocationSelect}
          initialLocation={
            formData.latitude && formData.longitude && 
            !isNaN(formData.latitude) && !isNaN(formData.longitude)
              ? { 
                  latitude: parseFloat(formData.latitude), 
                  longitude: parseFloat(formData.longitude) 
                }
              : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  syncBannerText: {
    fontSize: 13,
    color: '#92400e',
  },
  syncBannerCount: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  pickerText: {
    fontSize: 16,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: '#eff6ff',
  },
  mapButtonText: {
    fontSize: 14,
    color: '#2563eb',
    flex: 1,
  },
  dayRow: {
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: '#111827',
    textAlign: 'center',
  },
  toText: {
    fontSize: 14,
    color: '#6b7280',
  },
});