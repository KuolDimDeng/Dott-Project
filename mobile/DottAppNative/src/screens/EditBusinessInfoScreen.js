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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import marketplaceApi from '../services/marketplaceApi';

export default function EditBusinessInfoScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({
    phone: '',
    business_email: '',
    address: '',
    website: '',
    postal_code: '',
    state: '',
    city: '',
    country: '',
    business_hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '09:00', close: '14:00' },
      sunday: { isClosed: true }
    },
    delivery_options: {
      delivery: false,
      pickup: false,
      dinein: false,
      shipping: false
    },
    payment_methods: []
  });

  useEffect(() => {
    loadBusinessInfo();
  }, []);

  const loadBusinessInfo = async () => {
    setLoading(true);
    try {
      const response = await marketplaceApi.getMyListing();
      if (response) {
        setBusinessInfo({
          phone: response.phone || '',
          business_email: response.business_email || '',
          address: response.address || '',
          website: response.website || '',
          postal_code: response.postal_code || '',
          state: response.state || '',
          city: response.city || '',
          country: response.country || '',
          business_hours: response.business_hours || businessInfo.business_hours,
          delivery_options: response.delivery_options || businessInfo.delivery_options,
          payment_methods: response.payment_methods || []
        });
      }
    } catch (error) {
      console.error('Error loading business info:', error);
      Alert.alert('Error', 'Failed to load business information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await marketplaceApi.updateMyListing(businessInfo);
      if (response.success) {
        Alert.alert('Success', 'Business information updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to update business information');
      }
    } catch (error) {
      console.error('Error saving business info:', error);
      Alert.alert('Error', 'Failed to save business information');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncFromProfile = async () => {
    setSaving(true);
    try {
      const response = await marketplaceApi.syncBusinessInfo();
      if (response.success) {
        Alert.alert('Success', response.message || 'Information synced successfully');
        loadBusinessInfo(); // Reload to show updated data
      } else {
        Alert.alert('Info', response.message || 'No changes needed');
      }
    } catch (error) {
      console.error('Error syncing business info:', error);
      Alert.alert('Error', 'Failed to sync business information');
    } finally {
      setSaving(false);
    }
  };

  const updateBusinessHours = (day, field, value) => {
    setBusinessInfo(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day],
          [field]: value
        }
      }
    }));
  };

  const toggleDayClosed = (day) => {
    setBusinessInfo(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: prev.business_hours[day].isClosed
          ? { open: '09:00', close: '17:00' }
          : { isClosed: true }
      }
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading business information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Business Info</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.syncButton} onPress={handleSyncFromProfile}>
            <Icon name="sync-outline" size={20} color="#2563eb" />
            <Text style={styles.syncButtonText}>Sync from Profile</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={businessInfo.phone}
                onChangeText={(text) => setBusinessInfo({...businessInfo, phone: text})}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Email</Text>
              <TextInput
                style={styles.input}
                value={businessInfo.business_email}
                onChangeText={(text) => setBusinessInfo({...businessInfo, business_email: text})}
                placeholder="Enter business email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                value={businessInfo.website}
                onChangeText={(text) => setBusinessInfo({...businessInfo, website: text})}
                placeholder="https://www.example.com"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street Address</Text>
              <TextInput
                style={styles.input}
                value={businessInfo.address}
                onChangeText={(text) => setBusinessInfo({...businessInfo, address: text})}
                placeholder="Enter street address"
                multiline
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={businessInfo.city}
                  onChangeText={(text) => setBusinessInfo({...businessInfo, city: text})}
                  placeholder="City"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>State/Province</Text>
                <TextInput
                  style={styles.input}
                  value={businessInfo.state}
                  onChangeText={(text) => setBusinessInfo({...businessInfo, state: text})}
                  placeholder="State"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Postal Code</Text>
                <TextInput
                  style={styles.input}
                  value={businessInfo.postal_code}
                  onChangeText={(text) => setBusinessInfo({...businessInfo, postal_code: text})}
                  placeholder="Postal code"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={styles.input}
                  value={businessInfo.country}
                  onChangeText={(text) => setBusinessInfo({...businessInfo, country: text})}
                  placeholder="Country"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Hours</Text>

            {Object.entries(businessInfo.business_hours).map(([day, hours]) => (
              <View key={day} style={styles.hoursRow}>
                <Text style={styles.dayLabel}>
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </Text>

                {hours.isClosed ? (
                  <TouchableOpacity
                    style={styles.closedButton}
                    onPress={() => toggleDayClosed(day)}
                  >
                    <Text style={styles.closedText}>Closed</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.hoursInputs}>
                    <TextInput
                      style={styles.timeInput}
                      value={hours.open}
                      onChangeText={(text) => updateBusinessHours(day, 'open', text)}
                      placeholder="09:00"
                    />
                    <Text style={styles.timeSeparator}>-</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={hours.close}
                      onChangeText={(text) => updateBusinessHours(day, 'close', text)}
                      placeholder="17:00"
                    />
                    <TouchableOpacity
                      style={styles.closeDay}
                      onPress={() => toggleDayClosed(day)}
                    >
                      <Icon name="close-circle-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Options</Text>

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Delivery</Text>
              <Switch
                value={businessInfo.delivery_options?.delivery || false}
                onValueChange={(value) => setBusinessInfo({
                  ...businessInfo,
                  delivery_options: { ...businessInfo.delivery_options, delivery: value }
                })}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Pickup</Text>
              <Switch
                value={businessInfo.delivery_options?.pickup || false}
                onValueChange={(value) => setBusinessInfo({
                  ...businessInfo,
                  delivery_options: { ...businessInfo.delivery_options, pickup: value }
                })}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Dine-in</Text>
              <Switch
                value={businessInfo.delivery_options?.dinein || false}
                onValueChange={(value) => setBusinessInfo({
                  ...businessInfo,
                  delivery_options: { ...businessInfo.delivery_options, dinein: value }
                })}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Shipping</Text>
              <Switch
                value={businessInfo.delivery_options?.shipping || false}
                onValueChange={(value) => setBusinessInfo({
                  ...businessInfo,
                  delivery_options: { ...businessInfo.delivery_options, shipping: value }
                })}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Cash</Text>
              <Switch
                value={businessInfo.payment_methods?.includes('cash') || false}
                onValueChange={(value) => {
                  const methods = [...(businessInfo.payment_methods || [])];
                  if (value) {
                    if (!methods.includes('cash')) methods.push('cash');
                  } else {
                    const index = methods.indexOf('cash');
                    if (index > -1) methods.splice(index, 1);
                  }
                  setBusinessInfo({ ...businessInfo, payment_methods: methods });
                }}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Credit/Debit Card</Text>
              <Switch
                value={businessInfo.payment_methods?.includes('card') || false}
                onValueChange={(value) => {
                  const methods = [...(businessInfo.payment_methods || [])];
                  if (value) {
                    if (!methods.includes('card')) methods.push('card');
                  } else {
                    const index = methods.indexOf('card');
                    if (index > -1) methods.splice(index, 1);
                  }
                  setBusinessInfo({ ...businessInfo, payment_methods: methods });
                }}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Mobile Money</Text>
              <Switch
                value={businessInfo.payment_methods?.includes('mobile_money') || false}
                onValueChange={(value) => {
                  const methods = [...(businessInfo.payment_methods || [])];
                  if (value) {
                    if (!methods.includes('mobile_money')) methods.push('mobile_money');
                  } else {
                    const index = methods.indexOf('mobile_money');
                    if (index > -1) methods.splice(index, 1);
                  }
                  setBusinessInfo({ ...businessInfo, payment_methods: methods });
                }}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Bank Transfer</Text>
              <Switch
                value={businessInfo.payment_methods?.includes('bank_transfer') || false}
                onValueChange={(value) => {
                  const methods = [...(businessInfo.payment_methods || [])];
                  if (value) {
                    if (!methods.includes('bank_transfer')) methods.push('bank_transfer');
                  } else {
                    const index = methods.indexOf('bank_transfer');
                    if (index > -1) methods.splice(index, 1);
                  }
                  setBusinessInfo({ ...businessInfo, payment_methods: methods });
                }}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  syncButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a1a',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    width: 80,
  },
  hoursInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    width: 60,
    textAlign: 'center',
  },
  timeSeparator: {
    marginHorizontal: 8,
    color: '#6b7280',
  },
  closedButton: {
    flex: 1,
    backgroundColor: '#fee2e2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  closedText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  closeDay: {
    marginLeft: 8,
    padding: 4,
  },
  bottomPadding: {
    height: 100,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionLabel: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
});