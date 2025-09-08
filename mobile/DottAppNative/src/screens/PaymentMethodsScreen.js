import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Switch,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import dottPayApi from '../services/dottPayApi';

const { width: screenWidth } = Dimensions.get('window');

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { currency } = useCurrency();
  
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [defaultMethod, setDefaultMethod] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMethodType, setAddMethodType] = useState('');
  const [formData, setFormData] = useState({});
  const [showQRDetails, setShowQRDetails] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    try {
      // Get QR code from Dott Pay API
      const qrResponse = await dottPayApi.getQRCode();
      setQrData(qrResponse.qr_code);
      
      // Store locally for offline access
      await AsyncStorage.setItem('dott_pay_qr', qrResponse.qr_code);
    } catch (error) {
      console.log('Error getting QR code:', error);
      
      // Try to load from local storage if API fails
      const cachedQR = await AsyncStorage.getItem('dott_pay_qr');
      if (cachedQR) {
        setQrData(cachedQR);
      } else {
        // Generate fallback QR if no cached version
        const qrPayload = {
          userId: user?.id,
          userEmail: user?.email,
          timestamp: Date.now(),
          version: '1.0',
          type: 'DOTT_PAY',
        };
        const qrString = btoa(JSON.stringify(qrPayload));
        setQrData(qrString);
      }
    }
  };

  const loadPaymentMethods = async () => {
    setLoading(true);
    try {
      // Get payment methods from Dott Pay API
      const methods = await dottPayApi.getPaymentMethods();
      setPaymentMethods(methods || []);
      
      // Get Dott Pay profile to find default method
      const profile = await dottPayApi.getMyProfile();
      if (profile?.default_payment_method) {
        setDefaultMethod(profile.default_payment_method);
      } else {
        // Find default from methods list
        const defaultMethod = methods?.find(m => m.is_default);
        setDefaultMethod(defaultMethod?.id);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    try {
      setLoading(true);
      
      // Create Stripe Setup Intent
      const response = await api.post('/payments/stripe/setup-intent/');
      const { client_secret } = response.data;
      
      // In production, use Stripe's CardField component
      Alert.alert(
        'Add Card',
        'Card linking will open Stripe secure form',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              // Mock card addition for now
              const mockCard = {
                type: 'card',
                brand: 'Visa',
                last4: '4242',
                exp_month: 12,
                exp_year: 2025,
              };
              
              await api.post('/payments/methods/add/', {
                type: 'card',
                stripe_payment_method_id: 'pm_mock_' + Date.now(),
                details: mockCard,
              });
              
              loadPaymentMethods();
              setShowAddModal(false);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add card');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMobileMoney = async (provider) => {
    const providerDetails = {
      mpesa: {
        name: 'M-Pesa',
        icon: 'phone-portrait-outline',
        color: '#00B251',
        placeholder: '254XXXXXXXXX',
      },
      mtn: {
        name: 'MTN Mobile Money',
        icon: 'phone-portrait-outline',
        color: '#FFCC00',
        placeholder: '256XXXXXXXXX',
      },
    };

    const details = providerDetails[provider];
    
    Alert.prompt(
      `Add ${details.name}`,
      'Enter your mobile money number',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (phoneNumber) => {
            if (!phoneNumber) return;
            
            try {
              setLoading(true);
              await api.post('/payments/methods/add/', {
                type: 'mobile_money',
                provider: provider,
                phone_number: phoneNumber,
                details: {
                  provider: provider,
                  phone_number: phoneNumber,
                  name: details.name,
                },
              });
              
              Alert.alert('Success', `${details.name} added successfully`);
              loadPaymentMethods();
              setShowAddModal(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to add mobile money account');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      'plain-text',
      '',
      'phone-pad'
    );
  };

  const handleSetDefault = async (methodId) => {
    try {
      await api.patch(`/payments/methods/${methodId}/set-default/`);
      setDefaultMethod(methodId);
      Alert.alert('Success', 'Default payment method updated');
      loadPaymentMethods();
    } catch (error) {
      Alert.alert('Error', 'Failed to update default payment method');
    }
  };

  const handleDeleteMethod = async (methodId) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/payments/methods/${methodId}/`);
              Alert.alert('Success', 'Payment method deleted');
              loadPaymentMethods();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete payment method');
            }
          },
        },
      ]
    );
  };

  const renderPaymentMethod = (method) => {
    const isDefault = method.id === defaultMethod;
    
    const getMethodIcon = () => {
      switch (method.type) {
        case 'card':
          return 'card-outline';
        case 'mobile_money':
          return 'phone-portrait-outline';
        case 'bank':
          return 'business-outline';
        default:
          return 'wallet-outline';
      }
    };

    const getMethodDisplay = () => {
      if (method.type === 'card') {
        return `${method.details?.brand || 'Card'} •••• ${method.details?.last4 || '****'}`;
      } else if (method.type === 'mobile_money') {
        return `${method.details?.name || method.provider} - ${method.details?.phone_number || ''}`;
      }
      return method.display_name || 'Payment Method';
    };

    return (
      <View key={method.id} style={styles.paymentMethodCard}>
        <View style={styles.methodHeader}>
          <View style={styles.methodInfo}>
            <Icon name={getMethodIcon()} size={24} color="#2563eb" />
            <View style={styles.methodDetails}>
              <Text style={styles.methodName}>{getMethodDisplay()}</Text>
              {method.type === 'card' && method.details?.exp_month && (
                <Text style={styles.methodExpiry}>
                  Expires {method.details.exp_month}/{method.details.exp_year}
                </Text>
              )}
            </View>
          </View>
          {isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>
        
        <View style={styles.methodActions}>
          {!isDefault && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSetDefault(method.id)}
            >
              <Text style={styles.actionButtonText}>Set as Default</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteMethod(method.id)}
          >
            <Icon name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAddMethodModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Payment Method</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <TouchableOpacity
              style={styles.addMethodOption}
              onPress={handleAddCard}
            >
              <Icon name="card-outline" size={32} color="#2563eb" />
              <View style={styles.optionDetails}>
                <Text style={styles.optionTitle}>Credit/Debit Card</Text>
                <Text style={styles.optionDescription}>
                  Add Visa, Mastercard, or other cards
                </Text>
              </View>
              <Icon name="chevron-forward" size={24} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addMethodOption}
              onPress={() => handleAddMobileMoney('mpesa')}
            >
              <View style={[styles.providerIcon, { backgroundColor: '#00B251' }]}>
                <Text style={styles.providerInitial}>M</Text>
              </View>
              <View style={styles.optionDetails}>
                <Text style={styles.optionTitle}>M-Pesa</Text>
                <Text style={styles.optionDescription}>
                  Link your M-Pesa account
                </Text>
              </View>
              <Icon name="chevron-forward" size={24} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addMethodOption}
              onPress={() => handleAddMobileMoney('mtn')}
            >
              <View style={[styles.providerIcon, { backgroundColor: '#FFCC00' }]}>
                <Text style={[styles.providerInitial, { color: '#000' }]}>MTN</Text>
              </View>
              <View style={styles.optionDetails}>
                <Text style={styles.optionTitle}>MTN Mobile Money</Text>
                <Text style={styles.optionDescription}>
                  Link your MTN MoMo account
                </Text>
              </View>
              <Icon name="chevron-forward" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <Text style={styles.sectionTitle}>Your Dott Pay QR Code</Text>
          <Text style={styles.sectionDescription}>
            Show this QR code to receive payments instantly
          </Text>
          
          <TouchableOpacity 
            style={styles.qrContainer}
            onPress={() => setShowQRDetails(!showQRDetails)}
          >
            {qrData ? (
              <QRCode
                value={qrData}
                size={200}
                color="#000"
                backgroundColor="#fff"
                logo={require('../assets/logo.png')}
                logoSize={40}
                logoBackgroundColor="#fff"
                logoBorderRadius={20}
              />
            ) : (
              <ActivityIndicator size="large" color="#2563eb" />
            )}
          </TouchableOpacity>

          {showQRDetails && (
            <View style={styles.qrDetails}>
              <Text style={styles.qrDetailText}>
                <Icon name="checkmark-circle" size={16} color="#10b981" /> 
                {' '}Instant payments
              </Text>
              <Text style={styles.qrDetailText}>
                <Icon name="shield-checkmark" size={16} color="#10b981" /> 
                {' '}Secure & encrypted
              </Text>
              <Text style={styles.qrDetailText}>
                <Icon name="flash" size={16} color="#10b981" /> 
                {' '}Works offline temporarily
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.shareButton}>
            <Icon name="share-outline" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Share QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.methodsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Linked Payment Methods</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Icon name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
          ) : paymentMethods.length > 0 ? (
            paymentMethods.map(renderPaymentMethod)
          ) : (
            <View style={styles.emptyState}>
              <Icon name="wallet-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No payment methods added</Text>
              <Text style={styles.emptySubtext}>
                Add a payment method to start using Dott Pay
              </Text>
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.emptyAddButtonText}>Add Payment Method</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Icon name="lock-closed" size={20} color="#6b7280" />
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure. We never store your full card details.
          </Text>
        </View>
      </ScrollView>

      {renderAddMethodModal()}
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  qrSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  qrDetails: {
    marginTop: 16,
    gap: 8,
  },
  qrDetailText: {
    fontSize: 14,
    color: '#6b7280',
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  methodsSection: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  paymentMethodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  methodExpiry: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  methodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  deleteButton: {
    flex: 0,
    paddingHorizontal: 12,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyAddButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    margin: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 400,
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
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  addMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
  },
  optionDetails: {
    flex: 1,
    marginLeft: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  optionDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  loader: {
    marginTop: 40,
  },
});