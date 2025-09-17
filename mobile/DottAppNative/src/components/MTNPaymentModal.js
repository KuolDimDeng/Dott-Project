import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import paymentService from '../services/paymentService';

export default function MTNPaymentModal({
  visible,
  onClose,
  amount,
  currency = 'SSP',
  onPaymentSuccess,
  metadata = {},
}) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [step, setStep] = useState('input'); // 'input' or 'verifying'

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setPhoneNumber('');
      setStep('input');
      setTransactionId(null);
    }
  }, [visible]);

  const formatPhoneNumber = (text) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');

    // Format as groups of 3 digits
    let formatted = '';
    for (let i = 0; i < cleaned.length; i++) {
      if (i > 0 && i % 3 === 0 && i < 9) {
        formatted += ' ';
      }
      formatted += cleaned[i];
    }

    return formatted;
  };

  const handlePhoneNumberChange = (text) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  const validatePhoneNumber = () => {
    const cleaned = phoneNumber.replace(/\s+/g, '');

    // Check if it's a valid phone number (9 or 10 digits)
    if (cleaned.length < 9 || cleaned.length > 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
      return false;
    }

    return true;
  };

  const handleInitiatePayment = async () => {
    if (!validatePhoneNumber()) {
      return;
    }

    setLoading(true);
    try {
      const result = await paymentService.initiateMTNPayment(
        amount,
        phoneNumber,
        currency,
        metadata
      );

      if (result.success) {
        setTransactionId(result.transactionId);
        setStep('verifying');

        // Start polling for payment status
        pollPaymentStatus(result.transactionId);
      } else {
        Alert.alert('Payment Failed', result.error);
      }
    } catch (error) {
      console.error('MTN payment error:', error);
      Alert.alert('Error', 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (txId) => {
    setVerifying(true);
    let attempts = 0;
    const maxAttempts = 30; // Poll for 2 minutes max (30 * 4 seconds)

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        setVerifying(false);
        Alert.alert(
          'Payment Timeout',
          'Payment verification timed out. Please check your MTN MoMo account for the transaction status.'
        );
        return;
      }

      try {
        const result = await paymentService.checkMTNPaymentStatus(txId);

        if (result.success) {
          if (result.completed) {
            setVerifying(false);

            // Success animation/feedback
            Alert.alert('Payment Successful', 'Your MTN MoMo payment was successful!');

            // Notify parent component
            onPaymentSuccess({
              transactionId: txId,
              method: 'mtn',
              amount: amount,
            });

            // Close modal
            onClose();
          } else if (result.failed) {
            setVerifying(false);
            Alert.alert('Payment Failed', 'The payment was declined or failed.');
            setStep('input');
          } else {
            // Still pending, continue polling
            attempts++;
            setTimeout(checkStatus, 4000);
          }
        } else {
          // Error checking status, retry
          attempts++;
          setTimeout(checkStatus, 4000);
        }
      } catch (error) {
        console.error('Status check error:', error);
        attempts++;
        setTimeout(checkStatus, 4000);
      }
    };

    // Start checking after 3 seconds
    setTimeout(checkStatus, 3000);
  };

  const renderInputStep = () => (
    <>
      {/* Amount Display */}
      <View style={styles.amountSection}>
        <Text style={styles.amountLabel}>Amount to Pay</Text>
        <Text style={styles.amountValue}>
          {currency} {amount.toFixed(2).toLocaleString()}
        </Text>
      </View>

      {/* Phone Number Input */}
      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>Enter MTN Mobile Number</Text>

        <View style={styles.phoneInputContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+211</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder="912 345 678"
            value={phoneNumber}
            onChangeText={handlePhoneNumberChange}
            keyboardType="phone-pad"
            maxLength={11} // 9 digits + 2 spaces
            autoFocus
          />
        </View>

        <Text style={styles.hint}>
          Enter your MTN MoMo registered phone number
        </Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsSection}>
        <Text style={styles.instructionsTitle}>How it works:</Text>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>1</Text>
          <Text style={styles.instructionText}>
            Enter your MTN MoMo phone number
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>2</Text>
          <Text style={styles.instructionText}>
            You'll receive a prompt on your phone
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>3</Text>
          <Text style={styles.instructionText}>
            Enter your PIN to confirm payment
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onClose}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.payButton,
            (phoneNumber.length < 9 || loading) && styles.disabledButton,
          ]}
          onPress={handleInitiatePayment}
          disabled={phoneNumber.length < 9 || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <View style={styles.mtnLogoSmall}>
                <Text style={styles.mtnLogoTextSmall}>MTN</Text>
              </View>
              <Text style={styles.payButtonText}>
                Pay with MoMo
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderVerifyingStep = () => (
    <View style={styles.verifyingContainer}>
      <View style={styles.verifyingIcon}>
        <ActivityIndicator size="large" color="#FFEB3B" />
      </View>

      <Text style={styles.verifyingTitle}>Processing Payment</Text>
      <Text style={styles.verifyingText}>
        Please check your phone and enter your MTN MoMo PIN to complete the payment
      </Text>

      <View style={styles.waitingSection}>
        <Icon name="time-outline" size={20} color="#6b7280" />
        <Text style={styles.waitingText}>
          Waiting for confirmation...
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.cancelButton, styles.fullWidthButton]}
        onPress={() => {
          setVerifying(false);
          setStep('input');
        }}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <SafeAreaView style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.mtnLogo}>
                  <Text style={styles.mtnLogoText}>MTN</Text>
                </View>
                <Text style={styles.title}>Mobile Money</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            {step === 'input' ? renderInputStep() : renderVerifyingStep()}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mtnLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFEB3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mtnLogoText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mtnLogoSmall: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#FFEB3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mtnLogoTextSmall: {
    color: '#000',
    fontSize: 8,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  amountSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  inputSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 12,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  instructionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFEB3B',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: 'bold',
    fontSize: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  payButton: {
    backgroundColor: '#2563eb',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.5,
  },
  fullWidthButton: {
    marginHorizontal: 20,
  },
  verifyingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  verifyingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  verifyingText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  waitingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  waitingText: {
    fontSize: 14,
    color: '#6b7280',
  },
});