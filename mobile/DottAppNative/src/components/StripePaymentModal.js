import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import {
  StripeProvider,
  CardField,
  useStripe,
} from '@stripe/stripe-react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import paymentService from '../services/paymentService';
import ENV from '../config/environment';

export default function StripePaymentModal({
  visible,
  onClose,
  amount,
  currency = 'USD',
  onPaymentSuccess,
  metadata = {},
}) {
  const [loading, setLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const { confirmPayment } = useStripe();

  // Check if Stripe key is configured
  useEffect(() => {
    if (visible && (!ENV.stripePublishableKey || ENV.stripePublishableKey === 'pk_live_YOUR_PRODUCTION_KEY_HERE')) {
      console.error('Stripe publishable key not configured in environment.js');
      Alert.alert(
        'Configuration Error',
        'Payment service is not properly configured. Please contact support.',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  }, [visible]);

  useEffect(() => {
    if (visible && amount > 0 && ENV.stripePublishableKey && ENV.stripePublishableKey !== 'pk_live_YOUR_PRODUCTION_KEY_HERE') {
      initializePayment();
    }
  }, [visible, amount]);

  const initializePayment = async () => {
    setLoading(true);
    try {
      const result = await paymentService.createPaymentIntent(amount, currency, metadata);

      if (result.success) {
        setClientSecret(result.clientSecret);
      } else {
        // Don't close modal on error, let user retry
        console.error('Payment initialization failed:', result.error);
        Alert.alert(
          'Payment Setup Failed',
          result.error || 'Unable to initialize payment. Please try again.',
          [
            { text: 'Cancel', onPress: onClose, style: 'cancel' },
            { text: 'Retry', onPress: initializePayment }
          ]
        );
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      // Don't close modal on error, let user retry
      Alert.alert(
        'Connection Error',
        'Unable to connect to payment service. Please check your connection.',
        [
          { text: 'Cancel', onPress: onClose, style: 'cancel' },
          { text: 'Retry', onPress: initializePayment }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!cardDetails?.complete || !clientSecret) {
      Alert.alert('Error', 'Please enter complete card details');
      return;
    }

    setLoading(true);
    try {
      const { paymentIntent, error } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        console.error('Payment error:', error);
        Alert.alert('Payment Failed', error.message);
      } else if (paymentIntent) {
        console.log('Payment successful:', paymentIntent);

        // Notify parent component
        onPaymentSuccess({
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100, // Convert back from cents
        });

        // Close modal
        onClose();
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      Alert.alert('Error', 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <StripeProvider
        publishableKey={ENV.stripePublishableKey}
        merchantIdentifier="merchant.com.dottapps"
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Card Payment</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Amount Display */}
            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>Amount to Pay</Text>
              <Text style={styles.amountValue}>
                {currency} {amount.toFixed(2)}
              </Text>
            </View>

            {/* Card Input */}
            <View style={styles.cardSection}>
              <Text style={styles.sectionTitle}>Enter Card Details</Text>
              <CardField
                postalCodeEnabled={true}
                placeholder={{
                  number: '4242 4242 4242 4242',
                }}
                cardStyle={styles.cardField}
                style={styles.cardFieldContainer}
                onCardChange={(details) => {
                  setCardDetails(details);
                }}
              />

              {/* Test card hint */}
              <Text style={styles.hint}>
                Test card: 4242 4242 4242 4242, Any future date, Any CVC
              </Text>
            </View>

            {/* Security Badge */}
            <View style={styles.securityBadge}>
              <Icon name="shield-checkmark-outline" size={20} color="#10b981" />
              <Text style={styles.securityText}>
                Secure payment powered by Stripe
              </Text>
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
                  (!cardDetails?.complete || loading) && styles.disabledButton,
                ]}
                onPress={handlePayment}
                disabled={!cardDetails?.complete || loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Icon name="card" size={20} color="white" />
                    <Text style={styles.payButtonText}>
                      Pay {currency} {amount.toFixed(2)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </StripeProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
  cardSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 12,
  },
  cardFieldContainer: {
    height: 50,
    marginBottom: 8,
  },
  cardField: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 14,
    color: '#10b981',
    marginLeft: 8,
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
});