import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { countriesData } from '../../data/countries';

export default function PhoneLoginScreen() {
  const navigation = useNavigation();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+211'); // South Sudan default
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  
  // PIN entry state
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const pinInputRefs = useRef([]);
  
  // Smart detection
  const [hasPin, setHasPin] = useState(false);
  const [buttonText, setButtonText] = useState('Continue');

  // Format phone number for display
  const formatPhoneNumber = (number) => {
    // Remove any non-digits
    const cleaned = number.replace(/\D/g, '');
    
    // Format based on length (adjust for your needs)
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  };

  // Check if phone has account and PIN when number changes
  useEffect(() => {
    if (phoneNumber.length >= 7) {
      checkAccountStatus();
    } else {
      setButtonText('Continue');
      setHasPin(false);
    }
  }, [phoneNumber]);

  const checkAccountStatus = async () => {
    try {
      const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
      
      // Check with backend if this phone has an account
      const response = await fetch('https://staging.dottapps.com/api/auth/phone/check-account/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });
      
      const data = await response.json();
      
      if (data.has_account) {
        if (data.has_pin) {
          setButtonText('Sign In with PIN');
          setHasPin(true);
        } else {
          setButtonText('Send Verification Code');
          setHasPin(false);
        }
      } else {
        // This is login screen, guide to signup
        setButtonText('Create New Account');
        setHasPin(false);
      }
    } catch (error) {
      // Default to OTP if check fails
      setButtonText('Send Verification Code');
      setHasPin(false);
    }
  };

  const handleContinue = async () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 7) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number');
      return;
    }

    const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;

    if (buttonText === 'Create New Account') {
      // Redirect to signup
      navigation.navigate('PhoneSignup', { 
        prefilledPhone: phoneNumber,
        prefilledCountryCode: countryCode 
      });
    } else if (buttonText === 'Sign In with PIN') {
      // Show PIN entry
      setShowPinEntry(true);
      setTimeout(() => pinInputRefs.current[0]?.focus(), 100);
    } else {
      // Send OTP for users without PIN
      setLoading(true);
      try {
        const response = await fetch('https://staging.dottapps.com/api/auth/phone/send-otp/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: fullPhone }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          navigation.navigate('PhoneOTPVerification', {
            phoneNumber: fullPhone,
            displayPhone: formatPhoneNumber(phoneNumber),
            countryCode,
            isLogin: true,
          });
        } else {
          Alert.alert('Error', data.message || 'Failed to send code');
        }
      } catch (error) {
        Alert.alert('Error', 'Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePinChange = (value, index) => {
    if (value && !/^\d$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    
    // Auto-focus next
    if (value && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when complete
    if (value && index === 3 && newPin.every(digit => digit)) {
      handlePinLogin(newPin.join(''));
    }
  };

  const handlePinLogin = async (pinCode) => {
    const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    
    setLoading(true);
    try {
      const response = await fetch('https://staging.dottapps.com/api/auth/phone/verify-pin/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: fullPhone,
          pin: pinCode 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store session
        await AsyncStorage.setItem('sessionToken', data.session_token || data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        
        // Sign in
        await signIn(data);
      } else {
        Alert.alert('Invalid PIN', data.message || 'Please try again');
        setPin(['', '', '', '']);
        pinInputRefs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showPinEntry) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity
          onPress={() => setShowPinEntry(false)}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <Icon name="lock-closed-outline" size={48} color="#14532d" />
            <Text style={styles.title}>Enter Your PIN</Text>
            <Text style={styles.subtitle}>
              Enter your 4-digit PIN to sign in
            </Text>
            <Text style={styles.phoneDisplay}>
              {countryCode} {formatPhoneNumber(phoneNumber)}
            </Text>
          </View>

          <View style={styles.pinContainer}>
            {pin.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (pinInputRefs.current[index] = ref)}
                style={[styles.pinInput, digit && styles.pinInputFilled]}
                value={digit}
                onChangeText={(value) => handlePinChange(value, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                secureTextEntry
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.forgotPinButton}
            onPress={() => {
              setShowPinEntry(false);
              setButtonText('Send Verification Code');
              setHasPin(false);
            }}
          >
            <Text style={styles.forgotPinText}>Forgot PIN? Use verification code</Text>
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#14532d" />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Country picker modal would go here (simplified for now)
  const countries = [
    { name: 'South Sudan', code: '+211', flag: '🇸🇸' },
    { name: 'Kenya', code: '+254', flag: '🇰🇪' },
    { name: 'Uganda', code: '+256', flag: '🇺🇬' },
    { name: 'USA', code: '+1', flag: '🇺🇸' },
  ];

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
          <Text style={styles.subtitle}>Sign in with your phone number</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            
            <View style={styles.phoneInputRow}>
              <TouchableOpacity
                style={styles.countryCodeButton}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={styles.countryCodeText}>{countryCode}</Text>
                <Icon name="chevron-down" size={16} color="#6b7280" />
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

          <TouchableOpacity
            style={[
              styles.button,
              hasPin && styles.pinButton,
              loading && styles.buttonDisabled
            ]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                {hasPin && <Icon name="lock-closed" size={20} color="white" style={styles.buttonIcon} />}
                <Text style={styles.buttonText}>{buttonText}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.alternativeButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Icon name="mail-outline" size={20} color="#14532d" />
            <Text style={styles.alternativeButtonText}>Sign in with Email</Text>
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
    </KeyboardAvoidingView>
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  countryCodeText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  button: {
    backgroundColor: '#14532d',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pinButton: {
    backgroundColor: '#16a34a',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: 8,
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
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    paddingHorizontal: 10,
    color: '#6b7280',
    fontSize: 14,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
  },
  alternativeButtonText: {
    color: '#14532d',
    fontSize: 16,
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
  // PIN entry styles
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  phoneDisplay: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 8,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 30,
  },
  pinInput: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a1a',
  },
  pinInputFilled: {
    borderColor: '#14532d',
    backgroundColor: '#f0f7ff',
  },
  forgotPinButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  forgotPinText: {
    color: '#14532d',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});