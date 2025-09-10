import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useCountry } from '../../context/CountryContext';
import { getSupportedCountries } from '../../config/countryConfigurations';

const CountrySelector = ({ 
  style,
  testMode = true, // Enable for testing UI changes
  compact = true,
  showFlag = false
}) => {
  const { currentCountry, config, changeCountry } = useCountry();
  const [modalVisible, setModalVisible] = useState(false);
  const supportedCountries = getSupportedCountries();

  // Add testing countries for comprehensive UI testing
  const testCountries = [
    ...supportedCountries,
    { code: 'US', name: 'United States', currency: { code: 'USD', symbol: '$' } },
    { code: 'GB', name: 'United Kingdom', currency: { code: 'GBP', symbol: '£' } }
  ];

  const countriesToShow = testMode ? testCountries : supportedCountries;

  const handleCountrySelect = async (countryCode) => {
    if (countryCode !== currentCountry) {
      const country = countriesToShow.find(c => c.code === countryCode);
      
      if (testMode) {
        // For testing - immediate switch with quick notification
        await changeCountry(countryCode);
        Alert.alert(
          'Country Changed',
          `Switched to ${country.name} for testing.\n\nCheck payment methods and delivery options!`,
          [{ text: 'Got it!' }]
        );
      } else {
        // Production mode - confirmation dialog
        Alert.alert(
          'Change Country',
          `Switch to ${country.name}?\n\nThis will update:\n• Payment methods\n• Currency (${country.currency.code})\n• Delivery options`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Change',
              onPress: async () => {
                await changeCountry(countryCode);
              }
            }
          ]
        );
      }
    }
    setModalVisible(false);
  };

  const getCountryFlag = (countryCode) => {
    const flags = {
      'SS': '🇸🇸', 'KE': '🇰🇪', 'UG': '🇺🇬', 
      'TZ': '🇹🇿', 'NG': '🇳🇬', 'GH': '🇬🇭', 
      'RW': '🇷🇼', 'US': '🇺🇸', 'GB': '🇬🇧'
    };
    return flags[countryCode] || '🌍';
  };

  const getCurrentCountryData = () => {
    return countriesToShow.find(c => c.code === currentCountry) || countriesToShow[0];
  };

  const renderCountryOption = (country) => {
    const isSelected = currentCountry === country.code;
    
    return (
      <TouchableOpacity
        key={country.code}
        style={[
          styles.countryOption,
          isSelected && styles.selectedOption
        ]}
        onPress={() => handleCountrySelect(country.code)}
      >
        <View style={styles.optionLeft}>
          {showFlag && (
            <Text style={styles.flag}>{getCountryFlag(country.code)}</Text>
          )}
          <View>
            <Text style={[
              styles.countryName,
              isSelected && styles.selectedText
            ]}>
              {country.name}
            </Text>
            <Text style={styles.currencyText}>
              {country.currency.code} ({country.currency.symbol})
            </Text>
          </View>
        </View>
        
        {isSelected && (
          <Icon name="checkmark-circle" size={20} color="#10b981" />
        )}
      </TouchableOpacity>
    );
  };

  const currentCountryData = getCurrentCountryData();

  if (compact) {
    return (
      <View style={[styles.container, style]}>
        <TouchableOpacity
          style={styles.compactSelector}
          onPress={() => setModalVisible(true)}
        >
          {showFlag && (
            <Text style={styles.flagSmall}>{getCountryFlag(currentCountry)}</Text>
          )}
          <Text style={styles.compactText}>
            {testMode ? currentCountryData.name : currentCountryData.currency.code}
          </Text>
          <Icon name="chevron-down" size={16} color="#6b7280" />
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>
                {testMode ? 'Test Country (UI Preview)' : 'Select Country'}
              </Text>
              
              <View style={styles.placeholder} />
            </View>

            {testMode && (
              <View style={styles.testBanner}>
                <Icon name="flask-outline" size={16} color="#f59e0b" />
                <Text style={styles.testText}>
                  Testing Mode: See how the UI changes for different countries
                </Text>
              </View>
            )}

            <ScrollView style={styles.optionsList}>
              {countriesToShow.map(renderCountryOption)}
            </ScrollView>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.fullSelector, style]}
      onPress={() => setModalVisible(true)}
    >
      {showFlag && (
        <Text style={styles.flag}>{getCountryFlag(currentCountry)}</Text>
      )}
      <Text style={styles.countryText}>{currentCountryData.name}</Text>
      <Text style={styles.currencyCode}>{currentCountryData.currency.code}</Text>
      <Icon name="chevron-down" size={20} color="#6b7280" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  compactSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    minWidth: 80,
  },
  compactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginHorizontal: 4,
  },
  flagSmall: {
    fontSize: 14,
    marginRight: 4,
  },
  fullSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  countryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginLeft: 8,
  },
  currencyCode: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  flag: {
    fontSize: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  testBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
  },
  testText: {
    fontSize: 14,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  optionsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  selectedText: {
    color: '#3b82f6',
  },
  currencyText: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default CountrySelector;