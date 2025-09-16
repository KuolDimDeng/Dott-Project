import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OrderConfirmationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId, orderData, passcodes } = route.params || {};

  const [orderSaved, setOrderSaved] = useState(false);

  useEffect(() => {
    saveOrderToHistory();
  }, []);

  const saveOrderToHistory = async () => {
    try {
      // Get existing orders
      const existingOrders = await AsyncStorage.getItem('orderHistory');
      const orders = existingOrders ? JSON.parse(existingOrders) : [];

      // Add new order
      const newOrder = {
        id: orderId,
        ...orderData,
        passcodes: passcodes,
        createdAt: new Date().toISOString(),
      };

      orders.unshift(newOrder); // Add to beginning

      // Keep only last 50 orders
      if (orders.length > 50) {
        orders.splice(50);
      }

      await AsyncStorage.setItem('orderHistory', JSON.stringify(orders));
      setOrderSaved(true);
    } catch (error) {
      console.error('Error saving order to history:', error);
    }
  };

  const handleSharePasscodes = async () => {
    try {
      const message = `Order #${orderId}\n\nPickup Code: ${passcodes.pickupCode}\nDelivery Code: ${passcodes.deliveryCode}\n\nThese codes expire in 2 hours.`;

      await Share.share({
        message: message,
        title: 'Order Passcodes',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleViewOrders = () => {
    navigation.navigate('PurchasesScreen');
  };

  const handleContinueShopping = () => {
    navigation.navigate('Discover');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Success Icon */}
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Icon name="checkmark" size={48} color="#ffffff" />
          </View>
          <Text style={styles.successTitle}>Order Placed Successfully!</Text>
          <Text style={styles.orderId}>Order #{orderId}</Text>
        </View>

        {/* Passcode Cards */}
        <View style={styles.passcodesContainer}>
          <Text style={styles.sectionTitle}>Your Order Verification Codes</Text>
          <Text style={styles.passcodesDescription}>
            Save these codes - you'll need them for pickup and delivery verification
          </Text>

          <View style={styles.passcodeCard}>
            <View style={styles.passcodeHeader}>
              <Icon name="storefront" size={24} color="#2563eb" />
              <Text style={styles.passcodeType}>PICKUP CODE</Text>
            </View>
            <Text style={styles.passcodeValue}>{passcodes.pickupCode}</Text>
            <Text style={styles.passcodeHint}>
              Show this code to the business when picking up your order
            </Text>
          </View>

          <View style={[styles.passcodeCard, styles.deliveryCard]}>
            <View style={styles.passcodeHeader}>
              <Icon name="bicycle" size={24} color="#10b981" />
              <Text style={[styles.passcodeType, styles.deliveryType]}>DELIVERY CODE</Text>
            </View>
            <Text style={styles.passcodeValue}>{passcodes.deliveryCode}</Text>
            <Text style={styles.passcodeHint}>
              Provide this code to the courier for delivery verification
            </Text>
          </View>

          <View style={styles.expiryWarning}>
            <Icon name="time" size={16} color="#ef4444" />
            <Text style={styles.expiryText}>
              These codes will expire in 2 hours
            </Text>
          </View>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleSharePasscodes}
          >
            <Icon name="share-outline" size={20} color="#2563eb" />
            <Text style={styles.shareButtonText}>Share Passcodes</Text>
          </TouchableOpacity>
        </View>

        {/* Order Details */}
        <View style={styles.orderDetailsContainer}>
          <Text style={styles.sectionTitle}>Order Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery Method</Text>
            <Text style={styles.detailValue}>
              {orderData.delivery_type === 'pickup' ? 'Pickup' : 'Delivery'}
            </Text>
          </View>

          {orderData.delivery_address && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivery Address</Text>
              <Text style={styles.detailValue}>
                {orderData.delivery_address.street}, {orderData.delivery_address.city}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>
              {orderData.payment_method === 'card' ? 'Credit/Debit Card' :
               orderData.payment_method === 'mpesa' ? 'M-Pesa' : 'Cash on Delivery'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subtotal</Text>
            <Text style={styles.detailValue}>${orderData.subtotal?.toFixed(2)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tax</Text>
            <Text style={styles.detailValue}>${orderData.tax_amount?.toFixed(2)}</Text>
          </View>

          {orderData.delivery_fee > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivery Fee</Text>
              <Text style={styles.detailValue}>${orderData.delivery_fee?.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service Fee</Text>
            <Text style={styles.detailValue}>${orderData.service_fee?.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>${orderData.total?.toFixed(2)}</Text>
          </View>
        </View>

        {/* What's Next Section */}
        <View style={styles.whatsNextContainer}>
          <Text style={styles.sectionTitle}>What's Next?</Text>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Order Confirmation</Text>
              <Text style={styles.stepDescription}>
                You'll receive a confirmation SMS/email shortly
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Order Preparation</Text>
              <Text style={styles.stepDescription}>
                The business will start preparing your order
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                {orderData.delivery_type === 'pickup' ? 'Pickup Ready' : 'Out for Delivery'}
              </Text>
              <Text style={styles.stepDescription}>
                {orderData.delivery_type === 'pickup'
                  ? 'You\'ll be notified when your order is ready for pickup'
                  : 'Track your order in real-time as it\'s delivered'}
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepNumber, styles.lastStep]}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Verify & Enjoy</Text>
              <Text style={styles.stepDescription}>
                Use your passcode to verify and receive your order
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.viewOrdersButton}
            onPress={handleViewOrders}
          >
            <Icon name="list-outline" size={20} color="#2563eb" />
            <Text style={styles.viewOrdersButtonText}>View My Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinueShopping}
          >
            <Text style={styles.continueButtonText}>Continue Shopping</Text>
            <Icon name="arrow-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    paddingBottom: 30,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#ffffff',
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    color: '#6b7280',
  },
  passcodesContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  passcodesDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  passcodeCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  deliveryCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  passcodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  passcodeType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  deliveryType: {
    color: '#10b981',
  },
  passcodeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: 4,
    marginVertical: 12,
  },
  passcodeHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  expiryText: {
    fontSize: 13,
    color: '#ef4444',
    marginLeft: 6,
    fontWeight: '500',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  shareButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  orderDetailsContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  whatsNextContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lastStep: {
    marginBottom: 0,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  actionButtons: {
    paddingHorizontal: 20,
    gap: 12,
  },
  viewOrdersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  viewOrdersButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
  },
});