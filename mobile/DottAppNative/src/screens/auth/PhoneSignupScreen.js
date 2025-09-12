import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
  NativeModules,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function PhoneSignupScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  
  // Initialize with detected country or default
  const [selectedCountry, setSelectedCountry] = useState({
    name: 'South Sudan',
    code: '+211',
    flag: '🇸🇸',
    iso: 'SS'
  });

  // All country codes with proper data
  const countries = [
    { name: 'South Sudan', code: '+211', flag: '🇸🇸', iso: 'SS' },
    { name: 'Kenya', code: '+254', flag: '🇰🇪', iso: 'KE' },
    { name: 'Uganda', code: '+256', flag: '🇺🇬', iso: 'UG' },
    { name: 'Tanzania', code: '+255', flag: '🇹🇿', iso: 'TZ' },
    { name: 'Nigeria', code: '+234', flag: '🇳🇬', iso: 'NG' },
    { name: 'Ghana', code: '+233', flag: '🇬🇭', iso: 'GH' },
    { name: 'South Africa', code: '+27', flag: '🇿🇦', iso: 'ZA' },
    { name: 'Ethiopia', code: '+251', flag: '🇪🇹', iso: 'ET' },
    { name: 'Rwanda', code: '+250', flag: '🇷🇼', iso: 'RW' },
    { name: 'Egypt', code: '+20', flag: '🇪🇬', iso: 'EG' },
    { name: 'Morocco', code: '+212', flag: '🇲🇦', iso: 'MA' },
    { name: 'Algeria', code: '+213', flag: '🇩🇿', iso: 'DZ' },
    { name: 'Tunisia', code: '+216', flag: '🇹🇳', iso: 'TN' },
    { name: 'Libya', code: '+218', flag: '🇱🇾', iso: 'LY' },
    { name: 'Senegal', code: '+221', flag: '🇸🇳', iso: 'SN' },
    { name: 'Ivory Coast', code: '+225', flag: '🇨🇮', iso: 'CI' },
    { name: 'Cameroon', code: '+237', flag: '🇨🇲', iso: 'CM' },
    { name: 'Zambia', code: '+260', flag: '🇿🇲', iso: 'ZM' },
    { name: 'Zimbabwe', code: '+263', flag: '🇿🇼', iso: 'ZW' },
    { name: 'Botswana', code: '+267', flag: '🇧🇼', iso: 'BW' },
    { name: 'Namibia', code: '+264', flag: '🇳🇦', iso: 'NA' },
    { name: 'Mozambique', code: '+258', flag: '🇲🇿', iso: 'MZ' },
    { name: 'USA', code: '+1', flag: '🇺🇸', iso: 'US' },
    { name: 'UK', code: '+44', flag: '🇬🇧', iso: 'GB' },
    { name: 'India', code: '+91', flag: '🇮🇳', iso: 'IN' },
    { name: 'China', code: '+86', flag: '🇨🇳', iso: 'CN' },
    { name: 'UAE', code: '+971', flag: '🇦🇪', iso: 'AE' },
  ];

  useEffect(() => {
    // Auto-detect country based on device locale
    detectCountry();
    
    // Check if coming from login with prefilled data
    if (route.params?.prefilledPhone) {
      setPhoneNumber(route.params.prefilledPhone);
    }
    if (route.params?.prefilledCountryCode) {
      const country = countries.find(c => c.code === route.params.prefilledCountryCode);
      if (country) setSelectedCountry(country);
    }
  }, []);

  const detectCountry = () => {
    try {
      // Try to get device locale
      const deviceLocale = NativeModules.SettingsManager?.settings?.AppleLocale ||
                          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
                          NativeModules.I18nManager?.localeIdentifier ||
                          'en_US';
      
      // Extract country code from locale (e.g., 'en_US' -> 'US')
      const countryCode = deviceLocale.split(/[-_]/)[1] || 'US';
      
      // Find matching country
      const detectedCountry = countries.find(c => c.iso === countryCode);
      
      if (detectedCountry) {
        setSelectedCountry(detectedCountry);
        console.log('🌍 Detected country:', detectedCountry.name);
      } else {
        // Fallback to timezone-based detection for African countries
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        if (timezone.includes('Nairobi')) {
          setSelectedCountry(countries.find(c => c.iso === 'KE'));
        } else if (timezone.includes('Lagos')) {
          setSelectedCountry(countries.find(c => c.iso === 'NG'));
        } else if (timezone.includes('Johannesburg')) {
          setSelectedCountry(countries.find(c => c.iso === 'ZA'));
        } else if (timezone.includes('Cairo')) {
          setSelectedCountry(countries.find(c => c.iso === 'EG'));
        } else if (timezone.includes('Kampala')) {
          setSelectedCountry(countries.find(c => c.iso === 'UG'));
        } else if (timezone.includes('Juba')) {
          setSelectedCountry(countries.find(c => c.iso === 'SS'));
        }
      }
    } catch (error) {
      console.log('Country detection failed, using default');
    }
  };

  const filteredCountries = countrySearch
    ? countries.filter(c => 
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.code.includes(countrySearch)
      )
    : countries;

  const handleContinue = async () => {
    // Validation
    if (!firstName.trim()) {
      Alert.alert('Required', 'Please enter your first name');
      return;
    }
    if (!lastName.trim()) {
      Alert.alert('Required', 'Please enter your last name');
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.length < 7) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
      return;
    }

    const fullPhoneNumber = `${selectedCountry.code}${phoneNumber.replace(/\s/g, '')}`;
    
    console.log('📱 Sending OTP to:', fullPhoneNumber);
    console.log('📱 Request body:', { phone: fullPhoneNumber });
    
    setLoading(true);
    try {
      // Send OTP to phone number
      const apiUrl = 'https://dott-api-staging.onrender.com/api/auth/phone/send-otp/';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: fullPhoneNumber,
        }),
      });

      const data = await response.json();
      console.log('📱 Response:', data);

      if (data.success) {
        // In development, show the OTP if provided
        if (data.debug_otp) {
          console.log('📱 DEBUG OTP:', data.debug_otp);
          Alert.alert('Development Mode', `OTP Code: ${data.debug_otp}`);
        }
        
        // Navigate to OTP verification screen with user data
        navigation.navigate('PhoneOTPVerification', {
          phoneNumber: fullPhoneNumber,
          firstName,
          lastName,
          countryCode: selectedCountry.code,
          displayPhone: phoneNumber,
        });
      } else {
        Alert.alert('Error', data.message || data.error || 'Failed to send verification code');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (text) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add basic formatting (you can customize this based on country)
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  };

  return (
    <>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <Icon name="call-outline" size={48} color="#14532d" />
            <Text style={styles.title}>Sign up with Phone</Text>
            <Text style={styles.subtitle}>
              We'll send you a verification code
            </Text>
          </View>

          <View style={styles.formContainer}>
            {/* Name Fields */}
            <View style={styles.nameRow}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Doe"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Phone Number Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <TouchableOpacity
                  style={styles.countryCodeButton}
                  onPress={() => setShowCountryPicker(true)}
                >
                  <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryCodeText}>{selectedCountry.code}</Text>
                  <Icon name="chevron-down" size={16} color="#6c757d" />
                </TouchableOpacity>

                <TextInput
                  style={styles.phoneInput}
                  placeholder="912 345 678"
                  value={phoneNumber}
                  onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                  keyboardType="phone-pad"
                  maxLength={12}
                />
              </View>
            </View>

            {/* Info Text */}
            <View style={styles.infoContainer}>
              <Icon name="information-circle-outline" size={16} color="#6c757d" />
              <Text style={styles.infoText}>
                Standard SMS rates may apply. We'll never share your number.
              </Text>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>

            {/* Alternative Options */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.alternativeButton}
              onPress={() => navigation.navigate('Register')}
            >
              <Icon name="mail-outline" size={20} color="#14532d" />
              <Text style={styles.alternativeButtonText}>Sign up with Email</Text>
            </TouchableOpacity>

            {/* Social Login Options */}
            <TouchableOpacity
              style={[styles.alternativeButton, styles.socialButton]}
              onPress={() => {
                console.log('Google signup');
                // TODO: Implement Google OAuth
              }}
            >
              <Icon name="logo-google" size={20} color="#4285F4" />
              <Text style={styles.alternativeButtonText}>Sign up with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.alternativeButton, styles.socialButton]}
              onPress={() => {
                console.log('Facebook signup');
                // TODO: Implement Facebook OAuth
              }}
            >
              <Icon name="logo-facebook" size={20} color="#1877F2" />
              <Text style={styles.alternativeButtonText}>Sign up with Facebook</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.alternativeButton, styles.socialButton]}
              onPress={() => {
                console.log('Apple signup');
                // TODO: Implement Apple Sign In
              }}
            >
              <Icon name="logo-apple" size={20} color="#000000" />
              <Text style={styles.alternativeButtonText}>Sign up with Apple</Text>
            </TouchableOpacity>

            {/* Sign In Link */}
            <TouchableOpacity
              style={styles.linkContainer}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkText}>
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>

    {/* Country Picker Modal */}
    <Modal
      visible={showCountryPicker}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity
              onPress={() => setShowCountryPicker(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search country or code..."
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoCorrect={false}
            />
          </View>

          {/* Country List */}
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.iso}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.countryItem,
                  selectedCountry.iso === item.iso && styles.selectedCountryItem
                ]}
                onPress={() => {
                  setSelectedCountry(item);
                  setShowCountryPicker(false);
                  setCountrySearch('');
                }}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
                <Text style={styles.countryCode}>{item.code}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 100,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  countryCodeText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  countryPicker: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    marginBottom: 16,
    maxHeight: 200,
  },
  countryOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  countryOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#14532d',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#dee2e6',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#6c757d',
    fontSize: 14,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 10,
  },
  socialButton: {
    backgroundColor: 'white',
  },
  alternativeButtonText: {
    color: '#14532d',
    fontSize: 16,
    fontWeight: '500',
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    color: '#14532d',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6c757d',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a1a',
  },
  countryList: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  selectedCountryItem: {
    backgroundColor: '#f0f8ff',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  countryCode: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 52,
  },
});