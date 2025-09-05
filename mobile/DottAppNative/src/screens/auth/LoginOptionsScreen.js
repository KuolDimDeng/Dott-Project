import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { countriesData } from '../../data/countries';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginOptionsScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Phone login state
  const [selectedCountry, setSelectedCountry] = useState({
    name: 'United States',
    code: 'US',
    phoneCode: '+1',
    flag: '🇺🇸'
  });
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const handlePhoneLogin = async () => {
    if (!showVerification) {
      // Send OTP
      if (!phoneNumber) {
        Alert.alert('Error', 'Please enter your phone number');
        return;
      }
      setLoading(true);
      try {
        await api.post('/auth/send-otp', {
          phone: `${selectedCountry.phoneCode}${phoneNumber}`,
        });
        setShowVerification(true);
        Alert.alert('Success', 'Verification code sent to your phone');
      } catch (error) {
        Alert.alert('Error', 'Unable to send verification code');
      } finally {
        setLoading(false);
      }
    } else {
      // Verify OTP
      setLoading(true);
      try {
        const response = await api.post('/auth/verify-otp', {
          phone: `${selectedCountry.phoneCode}${phoneNumber}`,
          code: verificationCode,
        });
        
        if (response.data.success) {
          // Handle successful phone login
          await login(null, null, response.data.data.token);
        }
      } catch (error) {
        Alert.alert('Error', 'Invalid verification code');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSocialLogin = (provider) => {
    Alert.alert('Coming Soon', `${provider} login will be available soon`);
  };

  // Memoize filtered countries to prevent re-renders
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countriesData;
    const searchLower = countrySearch.toLowerCase();
    return countriesData.filter(country => 
      country.name.toLowerCase().includes(searchLower) ||
      country.phoneCode.includes(countrySearch) ||
      country.code.toLowerCase().includes(searchLower)
    );
  }, [countrySearch]);

  const CountryPicker = () => {
    if (!showCountryPicker) return null;
    
    return (
      <View style={styles.fullScreenOverlay}>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCountryPicker(false);
                setCountrySearch(''); // Clear search on close
              }}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
          
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search country or code..."
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {countrySearch.length > 0 && (
              <TouchableOpacity
                onPress={() => setCountrySearch('')}
                style={styles.clearButton}
              >
                <Icon name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
          
          <ScrollView 
            style={styles.countriesList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {filteredCountries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No countries found</Text>
              </View>
            ) : (
              filteredCountries.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={styles.countryItem}
                  onPress={() => {
                    setSelectedCountry(country);
                    setShowCountryPicker(false);
                    setCountrySearch(''); // Clear search on selection
                  }}
                >
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryName}>{country.name}</Text>
                  <Text style={styles.countryCode}>{country.phoneCode}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Enter your phone number to sign in</Text>
        </View>

        <View style={styles.content}>
          {!showVerification ? (
            <>
              {/* Country Selector */}
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryName}>{selectedCountry.name}</Text>
                <Icon name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>

              {/* Phone Input */}
              <View style={styles.phoneInputContainer}>
                <View style={styles.phoneCodeBox}>
                  <Text style={styles.phoneCodeText}>{selectedCountry.phoneCode}</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Phone number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handlePhoneLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.verificationText}>
                Enter the code sent to {selectedCountry.phoneCode}{phoneNumber}
              </Text>
              <View style={styles.codeInputContainer}>
                {[...Array(6)].map((_, i) => (
                  <TextInput
                    key={i}
                    style={styles.codeInput}
                    maxLength={1}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      const code = verificationCode.split('');
                      code[i] = text;
                      setVerificationCode(code.join(''));
                    }}
                  />
                ))}
              </View>
              
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handlePhoneLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Verify</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowVerification(false)}
                style={styles.changeNumberButton}
              >
                <Text style={styles.changeNumberText}>Change phone number</Text>
              </TouchableOpacity>
            </>
          )}

          {/* OR Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Other Sign In Options */}
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Icon name="mail-outline" size={20} color="#6b7280" />
            <Text style={styles.optionText}>Sign in with Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => handleSocialLogin('Google')}
          >
            <Icon name="logo-google" size={20} color="#4285F4" />
            <Text style={styles.optionText}>Sign in with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => handleSocialLogin('Facebook')}
          >
            <Icon name="logo-facebook" size={20} color="#1877F2" />
            <Text style={styles.optionText}>Sign in with Facebook</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.appleButton}
            onPress={() => handleSocialLogin('Apple')}
          >
            <Icon name="logo-apple" size={20} color="#FFFFFF" />
            <Text style={styles.appleButtonText}>Sign in with Apple</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text
              style={styles.link}
              onPress={() => navigation.navigate('SignupOptions')}
            >
              Sign Up
            </Text>
          </Text>
        </View>
      </ScrollView>

      <CountryPicker />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 10,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  phoneCodeBox: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginRight: 10,
    justifyContent: 'center',
  },
  phoneCodeText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: '#14532d',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  verificationText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  codeInput: {
    width: 45,
    height: 50,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    backgroundColor: '#ffffff',
  },
  changeNumberButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  changeNumberText: {
    color: '#14532d',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#6b7280',
    fontSize: 14,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  optionText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  appleButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 10,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  link: {
    color: '#14532d',
    fontWeight: '600',
  },
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 999,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalInner: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  countryCode: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 'auto',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});