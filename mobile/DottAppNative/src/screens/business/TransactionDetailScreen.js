import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';
import { useBusinessContext } from '../../context/BusinessContext';
import { useCurrency } from '../../context/CurrencyContext';

export default function TransactionDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { transactionId } = route.params || {};
  const { businessData } = useBusinessContext();
  const { currency } = useCurrency();
  
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactionDetails();
  }, [transactionId]);

  const loadTransactionDetails = async () => {
    try {
      setLoading(true);
      
      // Try to load transaction details from various endpoints
      let transactionData = null;
      
      // Check if it's a POS transaction
      if (transactionId?.startsWith('POS-')) {
        try {
          const response = await api.get(`/pos/transactions/${transactionId}/`);
          transactionData = formatPOSTransaction(response.data);
        } catch (e) {
          console.log('Not a POS transaction');
        }
      }
      
      // Check if it's an invoice
      if (!transactionData && transactionId?.startsWith('INV-')) {
        try {
          const invoiceId = transactionId.replace('INV-', '');
          const response = await api.get(`/sales/invoices/${invoiceId}/`);
          transactionData = formatInvoiceTransaction(response.data);
        } catch (e) {
          console.log('Not an invoice');
        }
      }
      
      // Try general transaction endpoint
      if (!transactionData) {
        try {
          const response = await api.get(`/finance/transactions/${transactionId}/`);
          transactionData = formatFinanceTransaction(response.data);
        } catch (e) {
          console.log('Could not load transaction');
        }
      }
      
      if (transactionData) {
        setTransaction(transactionData);
      }
    } catch (error) {
      console.error('Error loading transaction details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPOSTransaction = (data) => ({
    id: data.id,
    type: 'POS Sale',
    amount: parseFloat(data.total || 0),
    tax: parseFloat(data.tax_amount || 0),
    subtotal: parseFloat(data.subtotal || 0),
    customer: data.customer_name || 'Walk-in Customer',
    date: data.created_at,
    paymentMethod: data.payment_method || 'cash',
    items: data.items || [],
    status: data.status || 'completed',
    receiptNumber: data.receipt_number || data.id,
    notes: data.notes || '',
  });

  const formatInvoiceTransaction = (data) => ({
    id: `INV-${data.invoice_number || data.id}`,
    type: 'Invoice',
    amount: parseFloat(data.total || 0),
    tax: parseFloat(data.tax_amount || 0),
    subtotal: parseFloat(data.subtotal || 0),
    customer: data.customer_name || data.customer || 'Unknown',
    date: data.date || data.created_at,
    paymentMethod: data.payment_method || 'bank_transfer',
    items: data.line_items || [],
    status: data.status || 'pending',
    receiptNumber: `INV-${data.invoice_number || data.id}`,
    notes: data.notes || '',
    dueDate: data.due_date,
  });

  const formatFinanceTransaction = (data) => ({
    id: data.id || transactionId,
    type: data.transaction_type || 'Payment',
    amount: parseFloat(data.amount || 0),
    tax: 0,
    subtotal: parseFloat(data.amount || 0),
    customer: data.payee || data.payer || 'Unknown',
    date: data.date || data.created_at,
    paymentMethod: data.payment_method || 'card',
    items: [],
    status: data.status || 'completed',
    receiptNumber: data.id || transactionId,
    notes: data.description || '',
  });

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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
        return { bg: '#d1fae5', text: '#065f46' };
      case 'pending':
        return { bg: '#fed7aa', text: '#92400e' };
      case 'failed':
      case 'cancelled':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const handleViewReceipt = () => {
    navigation.navigate('Receipt', { transactionId: transaction.id });
  };

  const handleRefund = () => {
    Alert.alert(
      'Refund Transaction',
      'Are you sure you want to refund this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/finance/transactions/${transaction.id}/refund/`);
              Alert.alert('Success', 'Refund initiated successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to process refund');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading transaction details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={64} color="#e5e7eb" />
          <Text style={styles.emptyText}>Transaction not found</Text>
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
        <Text style={styles.headerTitle}>Transaction Details</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainCard}>
          <View style={styles.transactionHeader}>
            <View>
              <Text style={styles.transactionId}>{transaction.id}</Text>
              <Text style={styles.transactionType}>{transaction.type}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status).bg }]}>
              <Text style={[styles.statusText, { color: getStatusColor(transaction.status).text }]}>
                {transaction.status?.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>{formatCurrency(transaction.amount)}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Transaction Information</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>{formatDate(transaction.date)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Customer</Text>
            <Text style={styles.detailValue}>{transaction.customer}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>
              {transaction.paymentMethod?.replace('_', ' ').toUpperCase()}
            </Text>
          </View>

          {transaction.receiptNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Receipt Number</Text>
              <Text style={styles.detailValue}>{transaction.receiptNumber}</Text>
            </View>
          )}

          {transaction.dueDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>{formatDate(transaction.dueDate)}</Text>
            </View>
          )}

          {transaction.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.notesText}>{transaction.notes}</Text>
            </View>
          )}
        </View>

        {transaction.items && transaction.items.length > 0 && (
          <View style={styles.itemsCard}>
            <Text style={styles.sectionTitle}>Items</Text>
            {transaction.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {item.name || item.product_name || 'Item'}
                  </Text>
                  <Text style={styles.itemQuantity}>
                    Qty: {item.quantity || 1} × {formatCurrency(parseFloat(item.unit_price || item.price || 0))}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  {formatCurrency((item.quantity || 1) * parseFloat(item.unit_price || item.price || 0))}
                </Text>
              </View>
            ))}
            
            <View style={styles.totalSection}>
              {transaction.subtotal !== transaction.amount && (
                <>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>{formatCurrency(transaction.subtotal)}</Text>
                  </View>
                  {transaction.tax > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Tax</Text>
                      <Text style={styles.totalValue}>{formatCurrency(transaction.tax)}</Text>
                    </View>
                  )}
                </>
              )}
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(transaction.amount)}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewReceipt}
          >
            <Icon name="receipt-outline" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>View Receipt</Text>
          </TouchableOpacity>

          {transaction.status === 'completed' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.refundButton]}
              onPress={handleRefund}
            >
              <Icon name="return-down-back-outline" size={20} color="#dc2626" />
              <Text style={[styles.actionButtonText, styles.refundButtonText]}>Refund</Text>
            </TouchableOpacity>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  transactionId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  transactionType: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  amountLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#059669',
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  notesSection: {
    marginTop: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#111827',
    marginTop: 4,
    lineHeight: 20,
  },
  itemsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  itemQuantity: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  grandTotal: {
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
  actionButtons: {
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
  refundButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  refundButtonText: {
    color: '#dc2626',
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
});