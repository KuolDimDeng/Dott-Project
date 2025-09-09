import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { useAuth } from '../../context/AuthContext';
import walletService from '../../services/walletService';

export default function TopUpScreen({ navigation, route }) {
  const { user } = useAuth();
  const { confirmPayment } = useStripe();
  const provider = route.params?.provider || 'MTN_MOMO';
  
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [cardDetails, setCardDetails] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(null);

  const quickAmounts = [10, 25, 50, 100, 250, 500];

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const walletData = await walletService.getWallet(provider);
      setWallet(walletData);
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const selectQuickAmount = (value) => {
    setSelectedAmount(value);
    setAmount(value.toString());
  };

  const validateInput = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }

    if (parseFloat(amount) < 1) {
      Alert.alert('Error', 'Minimum top-up amount is $1');
      return false;
    }

    if (parseFloat(amount) > 10000) {
      Alert.alert('Error', 'Maximum top-up amount is $10,000');
      return false;
    }

    if (!cardDetails?.complete) {
      Alert.alert('Error', 'Please enter valid card details');
      return false;
    }

    return true;
  };

  const handleTopUp = async () => {
    if (!validateInput()) return;

    Alert.alert(
      'Confirm Top-up',
      `Add ${walletService.formatAmount(amount, 'USD')} to your wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: processTopUp },
      ]
    );
  };

  const processTopUp = async () => {
    try {
      setLoading(true);

      // Step 1: Create top-up and get payment intent from backend
      const topUpResult = await walletService.topUp(parseFloat(amount), provider);
      
      if (!topUpResult.client_secret) {
        throw new Error('Failed to create payment intent');
      }

      // Step 2: Confirm payment with Stripe
      const { error, paymentIntent } = await confirmPayment(topUpResult.client_secret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        throw new Error(error.message);
      }

      // Step 3: Success
      Alert.alert(
        'Success',
        `Your wallet has been topped up with ${walletService.formatAmount(amount, 'USD')}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to top up wallet');
    } finally {
      setLoading(false);
    }
  };

  const calculateFee = (amt) => {
    const numAmount = parseFloat(amt || 0);
    // Stripe fee: 2.9% + $0.30
    // Platform fee: 0.1% + $0.30
    const stripeFee = numAmount * 0.029 + 0.30;
    const platformFee = numAmount * 0.001 + 0.30;
    const totalFee = stripeFee + platformFee;
    return {
      stripeFee: stripeFee.toFixed(2),
      platformFee: platformFee.toFixed(2),
      totalFee: totalFee.toFixed(2),
      totalCharge: (numAmount + totalFee).toFixed(2),
    };
  };

  const fees = amount ? calculateFee(amount) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Top Up Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Balance Display */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceAmount}>
              {walletService.formatAmount(wallet?.available_balance || 0, 'USD')}
            </Text>
          </View>

          {/* Quick Amount Selection */}
          <View style={styles.quickAmountSection}>
            <Text style={styles.sectionTitle}>Quick Top-up</Text>
            <View style={styles.quickAmountGrid}>
              {quickAmounts.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.quickAmountButton,
                    selectedAmount === value && styles.quickAmountButtonActive,
                  ]}
                  onPress={() => selectQuickAmount(value)}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      selectedAmount === value && styles.quickAmountTextActive,
                    ]}
                  >
                    ${value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Amount Input */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Or Enter Amount</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  setSelectedAmount(null);
                }}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Card Input */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Payment Card</Text>
            <CardField
              postalCodeEnabled={false}
              placeholder={{
                number: '4242 4242 4242 4242',
              }}
              cardStyle={{
                backgroundColor: '#FFFFFF',
                textColor: '#000000',
                borderRadius: 8,
              }}
              style={styles.cardField}
              onCardChange={(details) => {
                setCardDetails(details);
              }}
            />
            <View style={styles.cardInfo}>
              <Icon name="lock-closed" size={14} color="#6b7280" />
              <Text style={styles.cardInfoText}>Your payment info is secure</Text>
            </View>
          </View>

          {/* Fee Breakdown */}
          {fees && (
            <View style={styles.feeSection}>
              <Text style={styles.feeTitle}>Fee Breakdown</Text>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Top-up Amount:</Text>
                <Text style={styles.feeValue}>${amount}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Processing Fee:</Text>
                <Text style={styles.feeValue}>${fees.totalFee}</Text>
              </View>
              <View style={styles.feeDivider} />
              <View style={styles.feeRow}>
                <Text style={styles.feeTotalLabel}>Total Charge:</Text>
                <Text style={styles.feeTotalValue}>${fees.totalCharge}</Text>
              </View>
            </View>
          )}

          {/* Top-up Button */}
          <TouchableOpacity
            style={[styles.topUpButton, loading && styles.topUpButtonDisabled]}
            onPress={handleTopUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Icon name="add-circle" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.topUpButtonText}>
                  Top Up {amount ? `$${amount}` : 'Wallet'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Icon name="shield-checkmark" size={16} color="#047857" />
            <Text style={styles.securityText}>
              Secure payment powered by Stripe. Your card details are never stored.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  balanceSection: {
    backgroundColor: '#047857',
    padding: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  quickAmountSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickAmountButtonActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  quickAmountText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
  },
  quickAmountTextActive: {
    color: 'white',
  },
  inputSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 24,
    color: '#6b7280',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingVertical: 12,
  },
  cardSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 1,
  },
  cardField: {
    height: 50,
    marginBottom: 12,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfoText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  feeSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 12,
  },
  feeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  feeValue: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  feeDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  feeTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  feeTotalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#047857',
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  topUpButtonDisabled: {
    opacity: 0.6,
  },
  topUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  securityText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
});
