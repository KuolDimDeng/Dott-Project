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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

export default function SetupPINScreen() {
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const pinInputRefs = useRef([]);
  const confirmInputRefs = useRef([]);
  const navigation = useNavigation();
  const route = useRoute();
  const { signIn } = useAuth();

  const { phoneNumber, userId } = route.params || {};

  useEffect(() => {
    // Focus first input on mount
    if (pinInputRefs.current[0]) {
      pinInputRefs.current[0].focus();
    }
  }, []);

  const handlePinChange = (value, index, isConfirmField = false) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    if (isConfirmField) {
      const newPin = [...confirmPin];
      newPin[index] = value;
      setConfirmPin(newPin);

      // Auto-focus next input
      if (value && index < 3) {
        confirmInputRefs.current[index + 1]?.focus();
      }

      // Check if PIN matches when complete
      if (value && index === 3 && newPin.every(digit => digit)) {
        if (newPin.join('') === pin.join('')) {
          handleSavePIN(newPin.join(''));
        } else {
          Alert.alert('PIN Mismatch', 'The PINs you entered do not match. Please try again.');
          setConfirmPin(['', '', '', '']);
          confirmInputRefs.current[0]?.focus();
        }
      }
    } else {
      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);

      // Auto-focus next input
      if (value && index < 3) {
        pinInputRefs.current[index + 1]?.focus();
      }

      // Move to confirm PIN when complete
      if (value && index === 3 && newPin.every(digit => digit)) {
        setIsConfirming(true);
        setTimeout(() => {
          confirmInputRefs.current[0]?.focus();
        }, 100);
      }
    }
  };

  const handleKeyPress = (e, index, isConfirmField = false) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (isConfirmField) {
        if (!confirmPin[index] && index > 0) {
          confirmInputRefs.current[index - 1]?.focus();
        }
      } else {
        if (!pin[index] && index > 0) {
          pinInputRefs.current[index - 1]?.focus();
        }
      }
    }
  };

  const handleSavePIN = async (pinCode) => {
    setLoading(true);
    try {
      // Save PIN to backend
      const response = await fetch('https://staging.dottapps.com/api/auth/phone/set-pin/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          user_id: userId,
          pin: pinCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store PIN locally (encrypted in production)
        await AsyncStorage.setItem('userPIN', pinCode);
        await AsyncStorage.setItem('pinEnabled', 'true');

        Alert.alert(
          'PIN Set Successfully',
          'You can now use your PIN for quick sign-in',
          [
            {
              text: 'Continue',
              onPress: async () => {
                // Get stored session data and sign in
                const sessionData = await AsyncStorage.getItem('userData');
                if (sessionData) {
                  const userData = JSON.parse(sessionData);
                  await signIn(userData);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to save PIN');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    Alert.alert(
      'Skip PIN Setup?',
      'You can set up a PIN later in your account settings. You\'ll need to use OTP for each sign-in.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: async () => {
            // Get stored session data and sign in
            const sessionData = await AsyncStorage.getItem('userData');
            if (sessionData) {
              const userData = JSON.parse(sessionData);
              await signIn(userData);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Icon 
            name={isConfirming ? "lock-closed-outline" : "key-outline"} 
            size={48} 
            color="#14532d" 
          />
          <Text style={styles.title}>
            {isConfirming ? 'Confirm Your PIN' : 'Create a PIN'}
          </Text>
          <Text style={styles.subtitle}>
            {isConfirming 
              ? 'Re-enter your 4-digit PIN to confirm'
              : 'Set up a 4-digit PIN for quick sign-in'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* PIN Input Fields */}
          {!isConfirming ? (
            <View style={styles.pinContainer}>
              {pin.map((digit, index) => (
                <TextInput
                  key={`pin-${index}`}
                  ref={(ref) => (pinInputRefs.current[index] = ref)}
                  style={[
                    styles.pinInput,
                    digit && styles.pinInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(value) => handlePinChange(value, index, false)}
                  onKeyPress={(e) => handleKeyPress(e, index, false)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  secureTextEntry
                />
              ))}
            </View>
          ) : (
            <View style={styles.pinContainer}>
              {confirmPin.map((digit, index) => (
                <TextInput
                  key={`confirm-${index}`}
                  ref={(ref) => (confirmInputRefs.current[index] = ref)}
                  style={[
                    styles.pinInput,
                    digit && styles.pinInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(value) => handlePinChange(value, index, true)}
                  onKeyPress={(e) => handleKeyPress(e, index, true)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  secureTextEntry
                />
              ))}
            </View>
          )}

          {/* Security Tips */}
          <View style={styles.tipsContainer}>
            <Icon name="shield-checkmark-outline" size={20} color="#28a745" />
            <View style={styles.tipsList}>
              <Text style={styles.tipText}>• Choose a PIN you'll remember</Text>
              <Text style={styles.tipText}>• Don't use obvious numbers (1234, 0000)</Text>
              <Text style={styles.tipText}>• Keep your PIN private</Text>
            </View>
          </View>

          {/* Skip Button (only on initial PIN setup) */}
          {!isConfirming && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          )}

          {/* Back Button (only on confirm screen) */}
          {isConfirming && (
            <TouchableOpacity
              style={styles.backButtonBottom}
              onPress={() => {
                setIsConfirming(false);
                setConfirmPin(['', '', '', '']);
                setPin(['', '', '', '']);
                pinInputRefs.current[0]?.focus();
              }}
            >
              <Icon name="arrow-back" size={20} color="#14532d" />
              <Text style={styles.backButtonText}>Change PIN</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#14532d" />
            <Text style={styles.loadingText}>Setting up your PIN...</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
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
    paddingHorizontal: 20,
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
  tipsContainer: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  tipsList: {
    flex: 1,
  },
  tipText: {
    fontSize: 13,
    color: '#495057',
    lineHeight: 20,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  backButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#14532d',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#495057',
  },
});