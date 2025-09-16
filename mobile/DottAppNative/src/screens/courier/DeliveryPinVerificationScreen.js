import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import courierApi from '../../services/courierApi';

export default function DeliveryPinVerificationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { deliveryId, customerName, deliveryAddress, courierEarnings } = route.params;

  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  const handlePinChange = (value, index) => {
    // Allow only numbers
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (index === 3 && value) {
      const fullPin = newPin.join('');
      if (fullPin.length === 4) {
        verifyDeliveryPin(fullPin);
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyDeliveryPin = async (pinCode) => {
    setLoading(true);
    try {
      const response = await courierApi.verifyDeliveryPin(deliveryId, pinCode);

      if (response.data.success) {
        // Payment is now released to courier
        Alert.alert(
          'Delivery Complete!',
          `Great job! You've earned $${courierEarnings?.toFixed(2) || '0.00'}. Your payment will be processed shortly.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to deliveries screen
                navigation.navigate('CourierDeliveries');
              },
            },
          ]
        );
      } else {
        Alert.alert('Invalid PIN', 'The PIN you entered is incorrect. Please ask the customer for the correct PIN.');
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('Error verifying delivery PIN:', error);
      Alert.alert('Error', 'Failed to verify PIN. Please try again.');
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    const fullPin = pin.join('');
    if (fullPin.length !== 4) {
      Alert.alert('Incomplete PIN', 'Please enter all 4 digits');
      return;
    }
    verifyDeliveryPin(fullPin);
  };

  const handleContactCustomer = () => {
    Alert.alert(
      'Contact Customer',
      'How would you like to contact the customer?',
      [
        {
          text: 'Call',
          onPress: () => {
            // In production, this would initiate a call
            Alert.alert('Calling', 'Calling customer...');
          },
        },
        {
          text: 'Message',
          onPress: () => {
            navigation.navigate('ChatConversation', {
              customerId: customerName,
              customerName: customerName,
            });
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  useEffect(() => {
    // Focus first input on mount
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Verification</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Icon name="home" size={48} color="#8b5cf6" />
          </View>
        </View>

        <Text style={styles.title}>Enter Customer PIN</Text>
        <Text style={styles.subtitle}>
          Ask the customer for their 4-digit delivery PIN
        </Text>

        <View style={styles.customerInfo}>
          <View style={styles.customerHeader}>
            <Text style={styles.customerName}>{customerName}</Text>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContactCustomer}
            >
              <Icon name="call-outline" size={20} color="#3b82f6" />
            </TouchableOpacity>
          </View>
          <Text style={styles.addressText}>{deliveryAddress}</Text>
        </View>

        <View style={styles.pinContainer}>
          {[0, 1, 2, 3].map((index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.pinInput,
                pin[index] && styles.pinInputFilled,
              ]}
              value={pin[index]}
              onChangeText={(value) => handlePinChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
              editable={!loading}
            />
          ))}
        </View>

        <View style={styles.earningsPreview}>
          <Text style={styles.earningsLabel}>Your Earnings:</Text>
          <Text style={styles.earningsAmount}>${courierEarnings?.toFixed(2) || '0.00'}</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Icon name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.submitButtonText}>Complete Delivery</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Icon name="information-circle" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Once verified, you'll receive your payment for this delivery
          </Text>
        </View>

        <TouchableOpacity
          style={styles.problemButton}
          onPress={() => {
            Alert.alert(
              'Report Problem',
              'What issue are you experiencing?',
              [
                { text: 'Customer not available', onPress: () => {} },
                { text: 'Wrong address', onPress: () => {} },
                { text: 'Customer refuses order', onPress: () => {} },
                { text: 'Other', onPress: () => {} },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }}
        >
          <Icon name="warning-outline" size={20} color="#ef4444" />
          <Text style={styles.problemButtonText}>Report a Problem</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#14532d',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#faf5ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  customerInfo: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  contactButton: {
    padding: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#6b7280',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  pinInput: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a1a',
  },
  pinInputFilled: {
    borderColor: '#8b5cf6',
    backgroundColor: '#faf5ff',
  },
  earningsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#374151',
  },
  earningsAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#3b82f6',
    lineHeight: 18,
  },
  problemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  problemButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
});