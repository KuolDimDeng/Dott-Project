import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// African and common countries with phone codes
const COUNTRIES = [
  // African countries prioritized
  { code: 'SS', name: 'South Sudan', dialCode: '+211', flag: '🇸🇸' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳' },
  { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹' },
  { code: 'ZM', name: 'Zambia', dialCode: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', dialCode: '+263', flag: '🇿🇼' },
  { code: 'BW', name: 'Botswana', dialCode: '+267', flag: '🇧🇼' },
  { code: 'MW', name: 'Malawi', dialCode: '+265', flag: '🇲🇼' },
  { code: 'MZ', name: 'Mozambique', dialCode: '+258', flag: '🇲🇿' },
  { code: 'AO', name: 'Angola', dialCode: '+244', flag: '🇦🇴' },
  { code: 'CM', name: 'Cameroon', dialCode: '+237', flag: '🇨🇲' },
  { code: 'CI', name: 'Ivory Coast', dialCode: '+225', flag: '🇨🇮' },
  { code: 'SN', name: 'Senegal', dialCode: '+221', flag: '🇸🇳' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼' },
  { code: 'BI', name: 'Burundi', dialCode: '+257', flag: '🇧🇮' },
  { code: 'DJ', name: 'Djibouti', dialCode: '+253', flag: '🇩🇯' },
  { code: 'ER', name: 'Eritrea', dialCode: '+291', flag: '🇪🇷' },
  { code: 'SO', name: 'Somalia', dialCode: '+252', flag: '🇸🇴' },
  { code: 'SD', name: 'Sudan', dialCode: '+249', flag: '🇸🇩' },
  { code: 'LY', name: 'Libya', dialCode: '+218', flag: '🇱🇾' },
  { code: 'TD', name: 'Chad', dialCode: '+235', flag: '🇹🇩' },
  { code: 'CF', name: 'Central African Republic', dialCode: '+236', flag: '🇨🇫' },
  { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬' },
  { code: 'CD', name: 'Democratic Republic of Congo', dialCode: '+243', flag: '🇨🇩' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦' },
  // Common international numbers
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
];

const PhoneInput = ({
  label,
  value,
  onChangeText,
  placeholder = 'Enter phone number',
  required = false,
  error = null,
  defaultCountry = 'SS', // Default to South Sudan
  editable = true,
  containerStyle = {},
  ...props
}) => {
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRIES.find(country => country.code === defaultCountry) || COUNTRIES[0]
  );
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchText.toLowerCase()) ||
    country.dialCode.includes(searchText) ||
    country.code.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
    setSearchText('');
    
    // If there's existing phone number, try to preserve it without country code
    if (value && value.startsWith('+')) {
      const phoneWithoutCode = value.replace(/^\+\d+\s*/, '');
      if (onChangeText) {
        onChangeText(`${country.dialCode} ${phoneWithoutCode}`.trim());
      }
    } else if (onChangeText && !value) {
      onChangeText(country.dialCode + ' ');
    }
  };

  const handlePhoneChange = (text) => {
    // Ensure the text always starts with the selected country's dial code
    if (!text.startsWith(selectedCountry.dialCode)) {
      text = selectedCountry.dialCode + ' ' + text.replace(/^\+\d+\s*/, '');
    }
    
    if (onChangeText) {
      onChangeText(text);
    }
  };

  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Basic formatting - add spaces for readability
    let formatted = phoneNumber;
    
    // For common formats, add some basic spacing
    if (formatted.length > 4) {
      formatted = formatted.replace(/(\+\d{1,4})\s*(\d{3})(\d{3})(\d+)/, '$1 $2-$3-$4');
    }
    
    return formatted;
  };

  const renderCountryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => handleCountrySelect(item)}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <View style={styles.countryInfo}>
        <Text style={styles.countryName}>{item.name}</Text>
        <Text style={styles.countryCode}>{item.dialCode}</Text>
      </View>
      {selectedCountry.code === item.code && (
        <Icon name="checkmark" size={20} color="#047857" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
        !editable && styles.inputContainerDisabled,
      ]}>
        <TouchableOpacity
          style={styles.countrySelector}
          onPress={() => editable && setShowCountryPicker(true)}
          disabled={!editable}
        >
          <Text style={styles.flagText}>{selectedCountry.flag}</Text>
          <Text style={styles.dialCodeText}>{selectedCountry.dialCode}</Text>
          {editable && (
            <Icon name="chevron-down" size={16} color="#6b7280" />
          )}
        </TouchableOpacity>
        
        <TextInput
          style={styles.phoneInput}
          value={value}
          onChangeText={handlePhoneChange}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={14} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCountryPicker(false)}
            >
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Country</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor="#9ca3af"
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
            />
          </View>
          
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            renderItem={renderCountryItem}
            style={styles.countriesList}
            keyboardShouldPersistTaps="handled"
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputContainerFocused: {
    borderColor: '#047857',
    borderWidth: 2,
    shadowColor: '#047857',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainerError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  inputContainerDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    marginRight: 12,
  },
  flagText: {
    fontSize: 18,
    marginRight: 6,
  },
  dialCodeText: {
    fontSize: 16,
    color: '#374151',
    marginRight: 4,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 4,
    flex: 1,
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
  modalCloseButton: {
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
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
  countriesList: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  countryFlag: {
    fontSize: 18,
    marginRight: 12,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  countryCode: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default PhoneInput;