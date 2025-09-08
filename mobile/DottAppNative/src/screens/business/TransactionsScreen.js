import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useBusinessContext } from '../../context/BusinessContext';

export default function TransactionsScreen() {
  const navigation = useNavigation();
  const { businessData } = useBusinessContext();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, [filterType, filterStatus]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Fetch transactions from the finance API like the web app
      const response = await api.get('/finance/transactions/');
      
      let transactionsData = [];
      if (Array.isArray(response.data)) {
        transactionsData = response.data;
      } else if (response.data.results) {
        transactionsData = response.data.results;
      } else if (response.data.transactions) {
        transactionsData = response.data.transactions;
      }
      
      // Also fetch invoices and payments for a complete view
      const [invoicesRes, paymentsRes] = await Promise.all([
        api.get('/sales/invoices/').catch(() => ({ data: [] })),
        api.get('/payments/transactions/').catch(() => ({ data: [] })),
      ]);
      
      const invoices = Array.isArray(invoicesRes.data) 
        ? invoicesRes.data 
        : (invoicesRes.data.results || invoicesRes.data.invoices || []);
        
      const payments = Array.isArray(paymentsRes.data)
        ? paymentsRes.data
        : (paymentsRes.data.results || paymentsRes.data.payments || []);
      
      // Combine and format all transaction types
      const allTransactions = [
        // Format finance transactions
        ...transactionsData.map(t => ({
          id: t.id || t.transaction_id,
          type: t.transaction_type || 'payment',
          amount: parseFloat(t.amount || 0),
          status: t.status || 'completed',
          customer: t.description || t.payee || t.payer || 'Unknown',
          description: t.description || t.notes || '',
          date: t.date || t.created_at,
          paymentMethod: t.payment_method || 'bank_transfer',
        })),
        // Format invoices as transactions
        ...invoices.map(i => ({
          id: `INV-${i.invoice_number || i.id}`,
          type: 'payment',
          amount: parseFloat(i.total || i.amount || 0),
          status: i.status === 'paid' || i.payment_status === 'paid' ? 'completed' : 
                  i.status === 'draft' ? 'pending' : 'pending',
          customer: i.customer_name || i.customer || 'Unknown',
          description: `Invoice #${i.invoice_number || i.id}`,
          date: i.date || i.created_at,
          paymentMethod: i.payment_method || 'card',
        })),
        // Format payments
        ...payments.map(p => ({
          id: `PAY-${p.id}`,
          type: p.type || 'payment',
          amount: parseFloat(p.amount || 0),
          status: p.status || 'completed',
          customer: p.customer_name || p.customer || 'Unknown',
          description: p.description || `Payment ${p.id}`,
          date: p.date || p.created_at,
          paymentMethod: p.payment_method || 'card',
        })),
      ];
      
      // Sort by date (most recent first)
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Apply filters
      let filteredTransactions = allTransactions;
      if (filterType !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === filterType);
      }
      if (filterStatus !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.status === filterStatus);
      }
      
      setTransactions(filteredTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      // No mock data - just show empty state
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleSearch = () => {
    // Filter transactions based on search query
    const filtered = transactions.filter(txn => 
      txn.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setTransactions(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return { bg: '#d1fae5', text: '#065f46' };
      case 'pending':
        return { bg: '#fed7aa', text: '#92400e' };
      case 'failed':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const getAmountColor = (amount) => {
    return amount >= 0 ? '#059669' : '#dc2626';
  };

  const formatCurrency = (amount) => {
    const currency = businessData?.preferredCurrency?.symbol || '$';
    return `${amount >= 0 ? '' : '-'}${currency}${Math.abs(amount).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'card':
        return 'card-outline';
      case 'cash':
        return 'cash-outline';
      case 'mobile_money':
        return 'phone-portrait-outline';
      case 'bank_transfer':
        return 'business-outline';
      default:
        return 'wallet-outline';
    }
  };

  const handleTransactionAction = (transaction, action) => {
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Transaction`,
      `Are you sure you want to ${action} this transaction?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            Alert.alert('Success', `Transaction ${action} initiated`);
          }
        }
      ]
    );
  };

  const renderTransaction = (transaction) => (
    <TouchableOpacity
      key={transaction.id}
      style={styles.transactionCard}
      onPress={() => navigation.navigate('TransactionDetail', { transactionId: transaction.id })}
    >
      <View style={styles.transactionHeader}>
        <View>
          <Text style={styles.transactionId}>{transaction.id}</Text>
          <Text style={styles.customerName}>{transaction.customer}</Text>
        </View>
        <Text style={[styles.transactionAmount, { color: getAmountColor(transaction.amount) }]}>
          {formatCurrency(transaction.amount)}
        </Text>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Icon name={getPaymentMethodIcon(transaction.paymentMethod)} size={16} color="#9ca3af" />
          <Text style={styles.detailText}>
            {transaction.paymentMethod?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="time-outline" size={16} color="#9ca3af" />
          <Text style={styles.detailText}>{formatDate(transaction.date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status).bg }]}>
            <Text style={[styles.statusText, { color: getStatusColor(transaction.status).text }]}>
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      {transaction.description && (
        <Text style={styles.description}>{transaction.description}</Text>
      )}

      {transaction.status === 'pending' && (
        <View style={styles.transactionActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleTransactionAction(transaction, 'retry')}
          >
            <Icon name="refresh-outline" size={18} color="#6b7280" />
            <Text style={styles.actionButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => handleTransactionAction(transaction, 'confirm')}
          >
            <Icon name="checkmark-outline" size={18} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      )}

      {transaction.type === 'payment' && transaction.status === 'completed' && (
        <View style={styles.transactionActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Receipt', { transactionId: transaction.id })}
          >
            <Icon name="receipt-outline" size={18} color="#6b7280" />
            <Text style={styles.actionButtonText}>Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleTransactionAction(transaction, 'refund')}
          >
            <Icon name="return-down-back-outline" size={18} color="#6b7280" />
            <Text style={styles.actionButtonText}>Refund</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Icon name="search" size={20} color="#ffffff" />
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filters}
          contentContainerStyle={styles.filtersContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
              All Types
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'payment' && styles.filterChipActive]}
            onPress={() => setFilterType('payment')}
          >
            <Text style={[styles.filterChipText, filterType === 'payment' && styles.filterChipTextActive]}>
              Payments
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'refund' && styles.filterChipActive]}
            onPress={() => setFilterType('refund')}
          >
            <Text style={[styles.filterChipText, filterType === 'refund' && styles.filterChipTextActive]}>
              Refunds
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'payout' && styles.filterChipActive]}
            onPress={() => setFilterType('payout')}
          >
            <Text style={[styles.filterChipText, filterType === 'payout' && styles.filterChipTextActive]}>
              Payouts
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : transactions.length > 0 ? (
          transactions.map(renderTransaction)
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="receipt-outline" size={64} color="#e5e7eb" />
            <Text style={styles.emptyText}>No transactions found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Your transactions will appear here'}
            </Text>
          </View>
        )}
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
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  searchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    fontSize: 16,
    color: '#1a1a1a',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
  },
  filters: {
    maxHeight: 40,
  },
  filtersContent: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 13,
    color: '#6b7280',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  transactionDetails: {
    gap: 6,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
  },
  transactionActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
});