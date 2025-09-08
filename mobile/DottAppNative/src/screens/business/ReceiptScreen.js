import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Share,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';
import { useBusinessContext } from '../../context/BusinessContext';
import { useCurrency } from '../../context/CurrencyContext';

export default function ReceiptScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { transactionId } = route.params || {};
  const { businessData } = useBusinessContext();
  const { currency } = useCurrency();
  
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [sendMethod, setSendMethod] = useState('');
  const [recipient, setRecipient] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTransactionDetails();
  }, [transactionId]);

  const loadTransactionDetails = async () => {
    try {
      setLoading(true);
      
      // Try multiple endpoints to get transaction details
      let transactionData = null;
      
      // Try POS transaction endpoint first
      try {
        const posResponse = await api.get(`/pos/transactions/${transactionId}/`);
        if (posResponse.data) {
          transactionData = {
            id: posResponse.data.id || transactionId,
            type: 'POS Sale',
            amount: parseFloat(posResponse.data.total || 0),
            tax: parseFloat(posResponse.data.tax_amount || 0),
            subtotal: parseFloat(posResponse.data.subtotal || 0),
            customer: posResponse.data.customer_name || 'Walk-in Customer',
            date: posResponse.data.created_at,
            paymentMethod: posResponse.data.payment_method || 'cash',
            items: posResponse.data.items || [],
            status: posResponse.data.status || 'completed',
            receiptNumber: posResponse.data.receipt_number || transactionId,
          };
        }
      } catch (e) {
        console.log('Not a POS transaction, trying other endpoints...');
      }
      
      // Try invoices endpoint
      if (!transactionData) {
        try {
          const invoiceResponse = await api.get(`/sales/invoices/${transactionId}/`);
          if (invoiceResponse.data) {
            transactionData = {
              id: invoiceResponse.data.id || transactionId,
              type: 'Invoice',
              amount: parseFloat(invoiceResponse.data.total || 0),
              tax: parseFloat(invoiceResponse.data.tax_amount || 0),
              subtotal: parseFloat(invoiceResponse.data.subtotal || 0),
              customer: invoiceResponse.data.customer_name || 'Unknown',
              date: invoiceResponse.data.date || invoiceResponse.data.created_at,
              paymentMethod: invoiceResponse.data.payment_method || 'bank_transfer',
              items: invoiceResponse.data.line_items || [],
              status: invoiceResponse.data.status || 'pending',
              receiptNumber: `INV-${invoiceResponse.data.invoice_number || transactionId}`,
            };
          }
        } catch (e) {
          console.log('Not an invoice, trying general transactions...');
        }
      }
      
      // Try general transactions endpoint
      if (!transactionData) {
        try {
          const txnResponse = await api.get(`/finance/transactions/${transactionId}/`);
          if (txnResponse.data) {
            transactionData = {
              id: txnResponse.data.id || transactionId,
              type: txnResponse.data.transaction_type || 'Payment',
              amount: parseFloat(txnResponse.data.amount || 0),
              tax: 0,
              subtotal: parseFloat(txnResponse.data.amount || 0),
              customer: txnResponse.data.payee || txnResponse.data.payer || 'Unknown',
              date: txnResponse.data.date || txnResponse.data.created_at,
              paymentMethod: txnResponse.data.payment_method || 'card',
              items: [],
              status: txnResponse.data.status || 'completed',
              receiptNumber: transactionId,
              description: txnResponse.data.description || '',
            };
          }
        } catch (e) {
          console.log('Could not load transaction details');
        }
      }
      
      if (transactionData) {
        setTransaction(transactionData);
      } else {
        // Create a basic transaction from route params if available
        setTransaction({
          id: transactionId,
          type: 'Transaction',
          amount: 0,
          tax: 0,
          subtotal: 0,
          customer: 'Unknown',
          date: new Date().toISOString(),
          paymentMethod: 'cash',
          items: [],
          status: 'completed',
          receiptNumber: transactionId,
        });
      }
    } catch (error) {
      console.error('Error loading transaction details:', error);
      Alert.alert('Error', 'Failed to load transaction details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const currencySymbol = currency?.symbol || '$';
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateReceiptText = () => {
    if (!transaction) return '';
    
    const businessName = businessData?.businessName || 'Business';
    const businessAddress = businessData?.address || '';
    const businessPhone = businessData?.phone || '';
    
    let receipt = `${businessName}\n`;
    if (businessAddress) receipt += `${businessAddress}\n`;
    if (businessPhone) receipt += `Tel: ${businessPhone}\n`;
    receipt += `\n${'='.repeat(30)}\n`;
    receipt += `RECEIPT #${transaction.receiptNumber}\n`;
    receipt += `${'='.repeat(30)}\n\n`;
    
    receipt += `Date: ${formatDate(transaction.date)}\n`;
    receipt += `Customer: ${transaction.customer}\n`;
    receipt += `Payment: ${transaction.paymentMethod.replace('_', ' ').toUpperCase()}\n\n`;
    
    if (transaction.items && transaction.items.length > 0) {
      receipt += `ITEMS:\n`;
      receipt += `${'-'.repeat(30)}\n`;
      transaction.items.forEach(item => {
        const itemName = item.name || item.product_name || 'Item';
        const quantity = item.quantity || 1;
        const price = parseFloat(item.unit_price || item.price || 0);
        const total = quantity * price;
        receipt += `${itemName}\n`;
        receipt += `  ${quantity} x ${formatCurrency(price)} = ${formatCurrency(total)}\n`;
      });
      receipt += `${'-'.repeat(30)}\n`;
    }
    
    if (transaction.subtotal !== transaction.amount) {
      receipt += `Subtotal: ${formatCurrency(transaction.subtotal)}\n`;
      if (transaction.tax > 0) {
        receipt += `Tax: ${formatCurrency(transaction.tax)}\n`;
      }
    }
    
    receipt += `\nTOTAL: ${formatCurrency(transaction.amount)}\n`;
    receipt += `\n${'='.repeat(30)}\n`;
    receipt += `Thank you for your business!\n`;
    receipt += `${businessName}\n`;
    
    return receipt;
  };

  const handleShare = async () => {
    try {
      const receiptText = generateReceiptText();
      await Share.share({
        message: receiptText,
        title: `Receipt #${transaction.receiptNumber}`,
      });
    } catch (error) {
      console.error('Error sharing receipt:', error);
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  const handlePrint = () => {
    Alert.alert(
      'Print Receipt',
      'Receipt will be converted to PDF for printing. This feature requires a printer connection.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              // Generate PDF and send to backend for processing
              const response = await api.post('/receipts/generate-pdf/', {
                transaction_id: transaction.id,
                receipt_text: generateReceiptText(),
              });
              
              if (response.data.pdf_url) {
                Alert.alert('Success', 'PDF receipt generated. Opening print dialog...');
                // In a real app, would open PDF viewer or print dialog
              }
            } catch (error) {
              console.error('Error generating PDF:', error);
              Alert.alert('Error', 'Failed to generate PDF receipt');
            }
          },
        },
      ]
    );
  };

  const handleSendReceipt = async () => {
    if (!recipient) {
      Alert.alert('Error', 'Please enter recipient details');
      return;
    }
    
    setSending(true);
    try {
      const receiptText = generateReceiptText();
      
      if (sendMethod === 'email') {
        // Send via email using backend
        await api.post('/receipts/send-email/', {
          transaction_id: transaction.id,
          recipient_email: recipient,
          receipt_text: receiptText,
        });
        Alert.alert('Success', `Receipt sent to ${recipient}`);
      } else if (sendMethod === 'sms') {
        // Send via SMS using backend
        await api.post('/receipts/send-sms/', {
          transaction_id: transaction.id,
          recipient_phone: recipient,
          receipt_text: receiptText,
        });
        Alert.alert('Success', `Receipt sent to ${recipient}`);
      } else if (sendMethod === 'whatsapp') {
        // Send via WhatsApp using backend
        await api.post('/receipts/send-whatsapp/', {
          transaction_id: transaction.id,
          recipient_phone: recipient,
          receipt_text: receiptText,
        });
        Alert.alert('Success', `Receipt sent via WhatsApp to ${recipient}`);
      }
      
      setSendModalVisible(false);
      setRecipient('');
      setSendMethod('');
    } catch (error) {
      console.error('Error sending receipt:', error);
      Alert.alert('Error', 'Failed to send receipt. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderSendModal = () => (
    <Modal
      visible={sendModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setSendModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Send Receipt</Text>
            <TouchableOpacity
              onPress={() => setSendModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalSubtitle}>Choose how to send the receipt:</Text>
          
          <View style={styles.sendOptions}>
            <TouchableOpacity
              style={[styles.sendOption, sendMethod === 'email' && styles.sendOptionActive]}
              onPress={() => setSendMethod('email')}
            >
              <Icon name="mail-outline" size={24} color={sendMethod === 'email' ? '#2563eb' : '#6b7280'} />
              <Text style={[styles.sendOptionText, sendMethod === 'email' && styles.sendOptionTextActive]}>
                Email
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sendOption, sendMethod === 'sms' && styles.sendOptionActive]}
              onPress={() => setSendMethod('sms')}
            >
              <Icon name="chatbubble-outline" size={24} color={sendMethod === 'sms' ? '#2563eb' : '#6b7280'} />
              <Text style={[styles.sendOptionText, sendMethod === 'sms' && styles.sendOptionTextActive]}>
                SMS
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sendOption, sendMethod === 'whatsapp' && styles.sendOptionActive]}
              onPress={() => setSendMethod('whatsapp')}
            >
              <Icon name="logo-whatsapp" size={24} color={sendMethod === 'whatsapp' ? '#2563eb' : '#6b7280'} />
              <Text style={[styles.sendOptionText, sendMethod === 'whatsapp' && styles.sendOptionTextActive]}>
                WhatsApp
              </Text>
            </TouchableOpacity>
          </View>
          
          {sendMethod && (
            <View style={styles.recipientSection}>
              <Text style={styles.inputLabel}>
                {sendMethod === 'email' ? 'Email Address' : 'Phone Number'}
              </Text>
              <TextInput
                style={styles.recipientInput}
                value={recipient}
                onChangeText={setRecipient}
                placeholder={sendMethod === 'email' ? 'customer@example.com' : '+1234567890'}
                keyboardType={sendMethod === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
              />
            </View>
          )}
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setSendModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sendButton, (!sendMethod || !recipient) && styles.sendButtonDisabled]}
              onPress={handleSendReceipt}
              disabled={!sendMethod || !recipient || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Icon name="send" size={18} color="#ffffff" />
                  <Text style={styles.sendButtonText}>Send Receipt</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading receipt...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="receipt-outline" size={64} color="#e5e7eb" />
          <Text style={styles.emptyText}>Receipt not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receipt</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerActionButton}>
            <Icon name="share-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePrint} style={styles.headerActionButton}>
            <Icon name="print-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.receiptContainer}>
          <View style={styles.receiptHeader}>
            <Text style={styles.businessName}>{businessData?.businessName || 'Business'}</Text>
            {businessData?.address && (
              <Text style={styles.businessAddress}>{businessData.address}</Text>
            )}
            {businessData?.phone && (
              <Text style={styles.businessPhone}>Tel: {businessData.phone}</Text>
            )}
          </View>

          <View style={styles.receiptDivider} />
          
          <View style={styles.receiptInfo}>
            <Text style={styles.receiptNumber}>Receipt #{transaction.receiptNumber}</Text>
            <Text style={styles.receiptDate}>{formatDate(transaction.date)}</Text>
          </View>

          <View style={styles.receiptDivider} />

          <View style={styles.customerInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Customer:</Text>
              <Text style={styles.infoValue}>{transaction.customer}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment:</Text>
              <Text style={styles.infoValue}>
                {transaction.paymentMethod.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.infoValue, styles.statusCompleted]}>
                {transaction.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {transaction.items && transaction.items.length > 0 && (
            <>
              <View style={styles.receiptDivider} />
              <View style={styles.itemsSection}>
                <Text style={styles.itemsHeader}>Items</Text>
                {transaction.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>
                        {item.name || item.product_name || 'Item'}
                      </Text>
                      <Text style={styles.itemQuantity}>
                        {item.quantity || 1} x {formatCurrency(parseFloat(item.unit_price || item.price || 0))}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      {formatCurrency((item.quantity || 1) * parseFloat(item.unit_price || item.price || 0))}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {transaction.description && (
            <>
              <View style={styles.receiptDivider} />
              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionLabel}>Description:</Text>
                <Text style={styles.descriptionText}>{transaction.description}</Text>
              </View>
            </>
          )}

          <View style={styles.receiptDivider} />

          <View style={styles.totalsSection}>
            {transaction.subtotal !== transaction.amount && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal:</Text>
                  <Text style={styles.totalValue}>{formatCurrency(transaction.subtotal)}</Text>
                </View>
                {transaction.tax > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tax:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(transaction.tax)}</Text>
                  </View>
                )}
              </>
            )}
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(transaction.amount)}</Text>
            </View>
          </View>

          <View style={styles.receiptDivider} />

          <View style={styles.receiptFooter}>
            <Text style={styles.thankYouText}>Thank you for your business!</Text>
            <Text style={styles.footerBusinessName}>{businessData?.businessName || 'Business'}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setSendModalVisible(true)}
          >
            <Icon name="send-outline" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Send Receipt</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderSendModal()}
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  receiptContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  businessAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  businessPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  receiptInfo: {
    alignItems: 'center',
  },
  receiptNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  customerInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  statusCompleted: {
    color: '#059669',
  },
  itemsSection: {
    gap: 12,
  },
  itemsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#6b7280',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  descriptionSection: {
    gap: 4,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  descriptionText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  totalsSection: {
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  receiptFooter: {
    alignItems: 'center',
  },
  thankYouText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6b7280',
    marginBottom: 4,
  },
  footerBusinessName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  actionButtons: {
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  sendOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  sendOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    gap: 8,
  },
  sendOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  sendOptionText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  sendOptionTextActive: {
    color: '#2563eb',
  },
  recipientSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  recipientInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});