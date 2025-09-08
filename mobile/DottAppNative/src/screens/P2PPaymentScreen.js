import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import dualQRApi from '../services/dualQRApi';

export default function P2PPaymentScreen({ navigation, route }) {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { scannedQRData, qrType } = route.params || {};
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiverInfo, setReceiverInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  
  // Determine if user is paying or receiving based on QR types
  const isPaying = qrType?.includes('PAY');
  const actionColor = isPaying ? '#2563eb' : '#10b981'; // Blue for pay, Green for receive
  
  useEffect(() => {
    if (scannedQRData) {
      verifyScannedQR();
    }
  }, [scannedQRData]);
  
  const verifyScannedQR = async () => {
    try {
      setVerifying(true);
      // Parse QR data to get receiver information
      const qrInfo = JSON.parse(scannedQRData);
      setReceiverInfo({
        name: qrInfo.user_name || 'Unknown User',
        merchant_id: qrInfo.merchant_id,
        qr_type: qrInfo.type,
        amount: qrInfo.amount, // For dynamic QRs
      });
      
      // Pre-fill amount if it's a dynamic QR
      if (qrInfo.amount) {
        setAmount(qrInfo.amount.toString());
      }
    } catch (error) {
      console.error('Error verifying QR:', error);
      Alert.alert('Error', 'Invalid QR code data');
      navigation.goBack();
    } finally {
      setVerifying(false);
    }
  };
  
  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await dualQRApi.universalScan({
        my_qr_type: qrType,
        scanned_qr_data: scannedQRData,
        amount: parseFloat(amount),
        currency: currency?.code || 'USD',
        description: description || `P2P ${isPaying ? 'Payment' : 'Receipt'}`,
        location: {
          latitude: 0, // Would get from device
          longitude: 0,
        },
      });
      
      if (response.success) {
        Alert.alert(
          'Success',
          `${isPaying ? 'Payment' : 'Receipt'} of ${currency?.symbol || '$'}${amount} ${response.message || 'completed successfully'}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Tabs'),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Transaction failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Failed to process transaction');
    } finally {
      setLoading(false);
    }
  };
  
  const formatAmount = (value) => {
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  };
  
  if (verifying) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={actionColor} />
        <Text style={styles.loadingText}>Verifying QR Code...</Text>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: actionColor }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isPaying ? 'Send Payment' : 'Receive Payment'}
        </Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Transaction Info Card */}
        <View style={[styles.infoCard, { borderColor: actionColor }]}>
          <View style={styles.qrTypeIndicator}>
            <View style={[styles.qrColorDot, { backgroundColor: actionColor }]} />
            <Text style={styles.qrTypeText}>
              {isPaying ? 'PAYMENT QR (BLUE)' : 'RECEIVE QR (GREEN)'}
            </Text>
          </View>
          
          <View style={styles.recipientInfo}>
            <Icon 
              name={isPaying ? 'arrow-up-circle' : 'arrow-down-circle'} 
              size={48} 
              color={actionColor} 
            />
            <View style={styles.recipientDetails}>
              <Text style={styles.recipientLabel}>
                {isPaying ? 'Paying to:' : 'Receiving from:'}
              </Text>
              <Text style={styles.recipientName}>{receiverInfo?.name}</Text>
              {receiverInfo?.merchant_id && (
                <Text style={styles.merchantId}>ID: {receiverInfo.merchant_id}</Text>
              )}
            </View>
          </View>
        </View>
        
        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.sectionLabel}>Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>
              {currency?.symbol || '$'}
            </Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(text) => setAmount(formatAmount(text))}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!receiverInfo?.amount} // Disable if dynamic QR with fixed amount
            />
            <Text style={styles.currencyCode}>
              {currency?.code || 'USD'}
            </Text>
          </View>
        </View>
        
        {/* Description Input */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionLabel}>Description (Optional)</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder={`What's this ${isPaying ? 'payment' : 'receipt'} for?`}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
        
        {/* Payment Methods (for paying) */}
        {isPaying && (
          <View style={styles.paymentMethodSection}>
            <Text style={styles.sectionLabel}>Payment Method</Text>
            <TouchableOpacity style={styles.paymentMethod}>
              <Icon name="wallet-outline" size={24} color="#666" />
              <Text style={styles.paymentMethodText}>Dott Wallet</Text>
              <Text style={styles.paymentMethodBalance}>
                {currency?.symbol || '$'}0.00
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount:</Text>
            <Text style={styles.summaryValue}>
              {currency?.symbol || '$'}{amount || '0.00'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Fee:</Text>
            <Text style={styles.summaryValue}>
              {currency?.symbol || '$'}0.00
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={[styles.totalValue, { color: actionColor }]}>
              {currency?.symbol || '$'}{amount || '0.00'}
            </Text>
          </View>
        </View>
        
        {/* Safety Notice */}
        <View style={styles.safetyNotice}>
          <Icon name="shield-checkmark" size={20} color="#10b981" />
          <Text style={styles.safetyText}>
            Transaction protected by Dott Pay Security
          </Text>
        </View>
      </ScrollView>
      
      {/* Action Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: actionColor },
            (!amount || loading) && styles.disabledButton,
          ]}
          onPress={handlePayment}
          disabled={!amount || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Icon 
                name={isPaying ? 'send' : 'download'} 
                size={20} 
                color="white" 
              />
              <Text style={styles.actionButtonText}>
                {isPaying ? 'Send Payment' : 'Request Payment'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
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
    color: 'white',
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  qrColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  qrTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientDetails: {
    marginLeft: 16,
    flex: 1,
  },
  recipientLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  merchantId: {
    fontSize: 12,
    color: '#999',
  },
  amountSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#111',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentMethodSection: {
    marginBottom: 20,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentMethodText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
  },
  paymentMethodBalance: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  summary: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  safetyText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#10b981',
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});