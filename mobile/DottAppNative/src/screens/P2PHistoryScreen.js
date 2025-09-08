import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import dualQRApi from '../services/dualQRApi';

export default function P2PHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const { currency } = useCurrency();
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, sent, received
  
  useEffect(() => {
    loadTransactions();
  }, []);
  
  const loadTransactions = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const history = await dualQRApi.getP2PHistory();
      
      // Mock data for demonstration
      const mockTransactions = [
        {
          id: '1',
          type: 'sent',
          amount: 50.00,
          currency: 'USD',
          recipient: 'John Doe',
          description: 'Lunch payment',
          status: 'completed',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'received',
          amount: 100.00,
          currency: 'USD',
          sender: 'Jane Smith',
          description: 'Shared taxi',
          status: 'completed',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '3',
          type: 'sent',
          amount: 25.50,
          currency: 'USD',
          recipient: 'Mike Johnson',
          description: 'Coffee',
          status: 'completed',
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
      ];
      
      setTransactions(history?.transactions || mockTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const getFilteredTransactions = () => {
    if (filter === 'all') return transactions;
    return transactions.filter(t => t.type === filter);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today ' + date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };
  
  const renderTransaction = ({ item }) => {
    const isSent = item.type === 'sent';
    const color = isSent ? '#2563eb' : '#10b981';
    const icon = isSent ? 'arrow-up-circle' : 'arrow-down-circle';
    const otherParty = isSent ? item.recipient : item.sender;
    
    return (
      <TouchableOpacity 
        style={styles.transactionCard}
        onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Icon name={icon} size={24} color={color} />
        </View>
        
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle}>{otherParty}</Text>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
        </View>
        
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color }]}>
            {isSent ? '-' : '+'}{currency?.symbol || '$'}{item.amount.toFixed(2)}
          </Text>
          <View style={[styles.statusBadge, styles[`status${item.status}`]]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="receipt-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No transactions yet</Text>
      <Text style={styles.emptyText}>
        Your P2P payment history will appear here
      </Text>
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={() => navigation.navigate('QR')}
      >
        <Icon name="qr-code-outline" size={20} color="white" />
        <Text style={styles.scanButtonText}>Scan QR to Pay</Text>
      </TouchableOpacity>
    </View>
  );
  
  const renderHeader = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'all' && styles.filterActive]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
          All
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'sent' && styles.filterActive]}
        onPress={() => setFilter('sent')}
      >
        <Icon name="arrow-up-circle-outline" size={16} color={filter === 'sent' ? '#2563eb' : '#6b7280'} />
        <Text style={[styles.filterText, filter === 'sent' && styles.filterTextActive]}>
          Sent
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'received' && styles.filterActive]}
        onPress={() => setFilter('received')}
      >
        <Icon name="arrow-down-circle-outline" size={16} color={filter === 'received' ? '#10b981' : '#6b7280'} />
        <Text style={[styles.filterText, filter === 'received' && styles.filterTextActive]}>
          Received
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>P2P History</Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="arrow-up-circle" size={20} color="#2563eb" />
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Sent</Text>
            <Text style={styles.statValue}>
              {currency?.symbol || '$'}
              {transactions
                .filter(t => t.type === 'sent')
                .reduce((sum, t) => sum + t.amount, 0)
                .toFixed(2)}
            </Text>
          </View>
        </View>
        
        <View style={styles.statCard}>
          <Icon name="arrow-down-circle" size={20} color="#10b981" />
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Received</Text>
            <Text style={styles.statValue}>
              {currency?.symbol || '$'}
              {transactions
                .filter(t => t.type === 'received')
                .reduce((sum, t) => sum + t.amount, 0)
                .toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
      
      <FlatList
        data={getFilteredTransactions()}
        renderItem={renderTransaction}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTransactions(true)}
            tintColor="#2563eb"
          />
        }
      />
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    color: '#111',
  },
  headerRight: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  filterActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#2563eb',
  },
  listContent: {
    paddingBottom: 100,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statuscompleted: {
    backgroundColor: '#dcfce7',
  },
  statuspending: {
    backgroundColor: '#fef3c7',
  },
  statusfailed: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});