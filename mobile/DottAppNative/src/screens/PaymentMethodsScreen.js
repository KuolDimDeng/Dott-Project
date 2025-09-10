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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { CardField, useStripe } from '@stripe/stripe-react-native';
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
  const { createPaymentMethod } = useStripe();
  
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [defaultMethod, setDefaultMethod] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showMobileMoneyModal, setShowMobileMoneyModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [addMethodType, setAddMethodType] = useState('');
  const [formData, setFormData] = useState({});
  const [cardDetails, setCardDetails] = useState(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);


  const loadPaymentMethods = async () => {
    setLoading(true);
    try {
      // Use dottPayApi to get payment methods
      const methods = await dottPayApi.getPaymentMethods();
      setPaymentMethods(methods || []);
      
      // Find default method
      const defaultMethod = methods?.find(m => m.is_default);
      setDefaultMethod(defaultMethod?.id);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = () => {
    setShowAddModal(false);
    setShowCardModal(true);
  };

  const processCardAddition = async () => {
    if (!cardDetails?.complete) {
      Alert.alert('Error', 'Please enter valid card details');
      return;
    }

    try {
      setLoading(true);

      // Create payment method with Stripe
      const { error, paymentMethod } = await createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (error) {
        throw new Error(error.message);
      }

      // Send payment method to backend
      await dottPayApi.linkCard({
        stripe_payment_method_id: paymentMethod.id,
        details: {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.expMonth,
          exp_year: paymentMethod.card.expYear,
        },
      });

      Alert.alert('Success', 'Card added successfully!');
      loadPaymentMethods();
      setShowCardModal(false);
      setCardDetails(null);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add card');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMobileMoney = (provider) => {
    setSelectedProvider(provider);
    setMobileNumber('');
    setShowAddModal(false);
    setShowMobileMoneyModal(true);
  };

  const processMobileMoneyAddition = async () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    const providerDetails = {
      mpesa: {
        name: 'M-Pesa',
        gateway: 'M_PESA',
      },
      mtn: {
        name: 'MTN Mobile Money',
        gateway: 'MTN',
      },
    };

    const details = providerDetails[selectedProvider];

    try {
      setLoading(true);
      
      // Use dottPayApi instead of direct API call
      await dottPayApi.linkMobileMoney(mobileNumber, selectedProvider.toUpperCase());
      
      Alert.alert('Success', `${details.name} added successfully!`);
      await loadPaymentMethods();
      setShowMobileMoneyModal(false);
      setMobileNumber('');
      setSelectedProvider('');
    } catch (error) {
      console.error('Error adding mobile money:', error);
      Alert.alert(
        'Error', 
        error.response?.data?.message || 'Failed to add mobile money account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
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

  const renderMobileMoneyModal = () => {
    const providerInfo = {
      mpesa: {
        name: 'M-Pesa',
        color: '#00B251',
        placeholder: '254XXXXXXXXX',
        example: 'e.g., 254712345678',
        instructions: 'Enter your M-Pesa registered phone number'
      },
      mtn: {
        name: 'MTN Mobile Money',
        color: '#FFCC00',
        placeholder: '211XXXXXXXXX',
        example: 'e.g., 211123456789',
        instructions: 'Enter your MTN Mobile Money number'
      }
    };

    const info = providerInfo[selectedProvider] || providerInfo.mtn;

    return (
      <Modal
        visible={showMobileMoneyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowMobileMoneyModal(false);
          setMobileNumber('');
          setSelectedProvider('');
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.mobileMoneyModalContainer}>
            <View style={styles.mobileMoneyHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowMobileMoneyModal(false);
                  setMobileNumber('');
                  setSelectedProvider('');
                }}
              >
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.mobileMoneyTitle}>Add {info.name}</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.mobileMoneyBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.providerBanner, { backgroundColor: info.color }]}>
                <Icon name="phone-portrait-outline" size={48} color="white" />
                <Text style={styles.providerBannerText}>{info.name}</Text>
              </View>

              <View style={styles.mobileMoneyInputSection}>
                <Text style={styles.mobileMoneyLabel}>Phone Number</Text>
                <TextInput
                  style={styles.mobileMoneyInput}
                  placeholder={info.placeholder}
                  placeholderTextColor="#9ca3af"
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                  autoFocus={true}
                />
                <Text style={styles.mobileMoneyExample}>{info.example}</Text>
                <Text style={styles.mobileMoneyInstructions}>{info.instructions}</Text>
              </View>

              <View style={styles.mobileMoneyInfo}>
                <Icon name="information-circle" size={16} color="#6b7280" />
                <Text style={styles.mobileMoneyInfoText}>
                  You will receive a verification SMS to confirm your number
                </Text>
              </View>
            </ScrollView>

            <View style={styles.mobileMoneyFooter}>
              <TouchableOpacity
                style={styles.mobileMoneyCancelButton}
                onPress={() => {
                  setShowMobileMoneyModal(false);
                  setMobileNumber('');
                  setSelectedProvider('');
                }}
              >
                <Text style={styles.mobileMoneyCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.mobileMoneyAddButton,
                  { backgroundColor: info.color },
                  (!mobileNumber || loading) && styles.mobileMoneyAddButtonDisabled,
                ]}
                onPress={processMobileMoneyAddition}
                disabled={!mobileNumber || loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.mobileMoneyAddText}>Add Number</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderCardModal = () => (
    <Modal
      visible={showCardModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setShowCardModal(false);
        setCardDetails(null);
      }}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.cardModalContainer}>
          <View style={styles.cardModalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowCardModal(false);
                setCardDetails(null);
              }}
            >
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.cardModalTitle}>Add Credit Card</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.cardModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.cardInputSection}>
              <Text style={styles.cardInputLabel}>Card Information</Text>
              <CardField
                postalCodeEnabled={false}
                placeholder={{
                  number: '4242 4242 4242 4242',
                  expiration: 'MM/YY',
                  cvc: 'CVC',
                }}
                cardStyle={{
                  backgroundColor: '#ffffff',
                  textColor: '#000000',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                }}
                style={styles.cardField}
                onCardChange={(details) => {
                  setCardDetails(details);
                }}
              />
              <View style={styles.cardSecurityInfo}>
                <Icon name="lock-closed" size={14} color="#6b7280" />
                <Text style={styles.cardSecurityText}>
                  Your card information is securely processed by Stripe
                </Text>
              </View>
            </View>

            <View style={styles.cardBenefits}>
              <Text style={styles.benefitsTitle}>Benefits of adding a card:</Text>
              <View style={styles.benefitItem}>
                <Icon name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.benefitText}>Instant payments to businesses</Text>
              </View>
              <View style={styles.benefitItem}>
                <Icon name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.benefitText}>Secure Stripe encryption</Text>
              </View>
              <View style={styles.benefitItem}>
                <Icon name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.benefitText}>Easy QR code payments</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.cardModalFooter}>
            <TouchableOpacity
              style={[styles.cardCancelButton]}
              onPress={() => {
                setShowCardModal(false);
                setCardDetails(null);
              }}
            >
              <Text style={styles.cardCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.cardAddButton,
                (!cardDetails?.complete || loading) && styles.cardAddButtonDisabled,
              ]}
              onPress={processCardAddition}
              disabled={!cardDetails?.complete || loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.cardAddButtonText}>Add Card</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

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
      {renderCardModal()}
      {renderMobileMoneyModal()}
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
  qrWrapper: {
    alignItems: 'center',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  qrHeaderLogo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  qrHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
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
  // Card Modal Styles
  cardModalContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  cardModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cardModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cardModalBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cardInputSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  cardInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  cardField: {
    height: 50,
    marginBottom: 12,
  },
  cardSecurityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cardSecurityText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  cardBenefits: {
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  cardModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cardCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cardCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  cardAddButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  cardAddButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  cardAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Mobile Money Modal Styles
  mobileMoneyModalContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  mobileMoneyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  mobileMoneyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  mobileMoneyBody: {
    flex: 1,
  },
  providerBanner: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  providerBannerText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginTop: 8,
  },
  mobileMoneyInputSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  mobileMoneyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  mobileMoneyInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  mobileMoneyExample: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  mobileMoneyInstructions: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 20,
  },
  mobileMoneyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  mobileMoneyInfoText: {
    fontSize: 12,
    color: '#065f46',
    marginLeft: 8,
    flex: 1,
  },
  mobileMoneyFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  mobileMoneyCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  mobileMoneyCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  mobileMoneyAddButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  mobileMoneyAddButtonDisabled: {
    opacity: 0.6,
  },
  mobileMoneyAddText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});