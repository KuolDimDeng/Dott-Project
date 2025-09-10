import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useCountry } from '../../context/CountryContext';
import { getSupportedCountries } from '../../config/countryConfigurations';

const CountrySettingsScreen = () => {
  const navigation = useNavigation();
  const { currentCountry, config, changeCountry, formatPrice } = useCountry();
  const [selectedCountry, setSelectedCountry] = useState(currentCountry);
  const supportedCountries = getSupportedCountries();

  const handleCountryChange = async () => {
    if (selectedCountry !== currentCountry) {
      Alert.alert(
        'Change Country',
        `Switch to ${supportedCountries.find(c => c.code === selectedCountry)?.name}? This will update payment methods, currency, and delivery options.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Change',
            onPress: async () => {
              await changeCountry(selectedCountry);
              Alert.alert('Success', 'Country settings updated successfully!');
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const renderCountryOption = (country) => {
    const isSelected = selectedCountry === country.code;
    
    return (
      <TouchableOpacity
        key={country.code}
        style={[
          styles.countryOption,
          isSelected && styles.selectedCountry
        ]}
        onPress={() => setSelectedCountry(country.code)}
      >
        <View style={styles.countryInfo}>
          <Text style={styles.countryName}>{country.name}</Text>
          <Text style={styles.currencyInfo}>
            {country.currency.code} ({country.currency.symbol}) - {country.currency.name}
          </Text>
        </View>
        
        <View style={styles.countryRight}>
          {isSelected && (
            <Icon name="checkmark-circle" size={24} color="#10b981" />
          )}
          {country.code === currentCountry && !isSelected && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentText}>Current</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getFeaturePreview = () => {
    const previewConfig = supportedCountries.find(c => c.code === selectedCountry);
    if (!previewConfig) return null;

    // Get payment methods and vehicles for preview
    const { getPaymentMethods, getVehicleTypes } = require('../../config/countryConfigurations');
    const payments = getPaymentMethods(selectedCountry);
    const vehicles = getVehicleTypes(selectedCountry);

    return (
      <View style={styles.previewSection}>
        <Text style={styles.previewTitle}>Preview for {previewConfig.name}</Text>
        
        <View style={styles.featureGroup}>
          <Text style={styles.featureGroupTitle}>
            Payment Methods ({payments.length})
          </Text>
          <View style={styles.featureList}>
            {payments.slice(0, 3).map((payment, index) => (
              <View key={payment.id} style={styles.featureItem}>
                <Icon name={payment.icon} size={16} color={payment.color} />
                <Text style={styles.featureText}>
                  {index + 1}. {payment.name}
                </Text>
              </View>
            ))}
            {payments.length > 3 && (
              <Text style={styles.moreText}>+{payments.length - 3} more</Text>
            )}
          </View>
        </View>

        <View style={styles.featureGroup}>
          <Text style={styles.featureGroupTitle}>
            Delivery Options ({vehicles.length})
          </Text>
          <View style={styles.featureList}>
            {vehicles.slice(0, 3).map((vehicle) => (
              <View key={vehicle.id} style={styles.featureItem}>
                <Icon name={vehicle.icon} size={16} color={vehicle.color} />
                <Text style={styles.featureText}>{vehicle.name}</Text>
              </View>
            ))}
            {vehicles.length > 3 && (
              <Text style={styles.moreText}>+{vehicles.length - 3} more</Text>
            )}
          </View>
        </View>

        <View style={styles.featureGroup}>
          <Text style={styles.featureGroupTitle}>Currency</Text>
          <View style={styles.currencyPreview}>
            <Text style={styles.currencyExample}>
              Example: {previewConfig.currency.symbol} 25.00
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Country Settings</Text>
        
        <TouchableOpacity 
          onPress={handleCountryChange}
          style={styles.saveButton}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Your Country</Text>
          <Text style={styles.sectionSubtitle}>
            This affects payment methods, currency, and delivery options
          </Text>
        </View>

        <View style={styles.countryList}>
          {supportedCountries.map(renderCountryOption)}
        </View>

        {getFeaturePreview()}

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Icon name="information-circle-outline" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>
              Changing your country will update the app interface to show 
              region-specific payment methods and delivery options. Your core 
              business features remain the same.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  countryList: {
    marginBottom: 32,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCountry: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  currencyInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  countryRight: {
    marginLeft: 12,
    alignItems: 'center',
  },
  currentBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  previewSection: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  featureGroup: {
    marginBottom: 16,
  },
  featureGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  featureList: {
    gap: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#6b7280',
  },
  moreText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginLeft: 24,
  },
  currencyPreview: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currencyExample: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    fontFamily: 'monospace',
  },
  infoSection: {
    marginBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
});

export default CountrySettingsScreen;