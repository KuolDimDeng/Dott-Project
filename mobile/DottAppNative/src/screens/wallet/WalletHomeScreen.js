import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import walletService from '../../services/walletService';

export default function WalletHomeScreen({ navigation }) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('MTN_MOMO');
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    loadWalletData();
    loadProviders();
  }, [selectedProvider]);

  const loadProviders = async () => {
    try {
      const availableProviders = await walletService.getProviders();
      setProviders(availableProviders);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [walletData, transactionData] = await Promise.all([
        walletService.getWallet(selectedProvider),
        walletService.getTransactions(selectedProvider),
      ]);
      setWallet(walletData);
      setTransactions(transactionData);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  }, [selectedProvider]);

  const handleTopUp = () => {
    navigation.navigate('TopUp', { provider: selectedProvider });
  };

  const handleSend = () => {
    navigation.navigate('SendMoney', { provider: selectedProvider });
  };

  const handleReceive = () => {
    navigation.navigate('ReceiveMoney', { provider: selectedProvider });
  };

  const renderTransaction = ({ item }) => {
    const isCredit = item.transaction_type === 'credit' || 
                     item.transaction_type === 'transfer_in' || 
                     item.transaction_type === 'topup';
    
    return (
      <TouchableOpacity style={styles.transactionItem}>
        <View style={styles.transactionIcon}>
          <Icon 
            name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'} 
            size={32} 
            color={isCredit ? '#047857' : '#ef4444'} 
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDescription}>
            {item.description || item.transaction_type}
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={[styles.amount, isCredit ? styles.creditAmount : styles.debitAmount]}>
            {isCredit ? '+' : '-'}{walletService.formatAmount(item.amount, wallet?.currency || 'USD')}
          </Text>
          <Text style={styles.transactionStatus}>{item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mobile Money Wallet</Text>
        <TouchableOpacity onPress={() => navigation.navigate('WalletSettings')}>
          <Icon name="settings-outline" size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Provider Selector */}
        <View style={styles.providerSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {providers.map((provider) => (
              <TouchableOpacity
                key={provider.name}
                style={[
                  styles.providerButton,
                  selectedProvider === provider.name && styles.providerButtonActive,
                ]}
                onPress={() => setSelectedProvider(provider.name)}
              >
                <Text
                  style={[
                    styles.providerText,
                    selectedProvider === provider.name && styles.providerTextActive,
                  ]}
                >
                  {provider.display_name || provider.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            {walletService.formatAmount(wallet?.available_balance || 0, wallet?.currency || 'USD')}
          </Text>
          {wallet?.pending_balance > 0 && (
            <Text style={styles.pendingBalance}>
              Pending: {walletService.formatAmount(wallet.pending_balance, wallet?.currency || 'USD')}
            </Text>
          )}
          
          {/* Verification Status */}
          {wallet?.verified ? (
            <View style={styles.verifiedBadge}>
              <Icon name="shield-checkmark" size={16} color="#047857" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.verifyButton}>
              <Text style={styles.verifyText}>Verify Account</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleTopUp}>
            <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
              <Icon name="add-circle-outline" size={24} color="#2563eb" />
            </View>
            <Text style={styles.actionText}>Top Up</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleSend}>
            <View style={[styles.actionIcon, { backgroundColor: '#dcfce7' }]}>
              <Icon name="arrow-up-circle-outline" size={24} color="#047857" />
            </View>
            <Text style={styles.actionText}>Send</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleReceive}>
            <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
              <Icon name="arrow-down-circle-outline" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.actionText}>Receive</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('WalletRequests')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#fce7f3' }]}>
              <Icon name="time-outline" size={24} color="#ec4899" />
            </View>
            <Text style={styles.actionText}>Requests</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionSection}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="receipt-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
            </View>
          ) : (
            <FlatList
              data={transactions}
              renderItem={renderTransaction}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  providerSelector: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  providerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  providerButtonActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  providerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  providerTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  balanceCard: {
    backgroundColor: '#047857',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  pendingBalance: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: 'white',
    marginLeft: 4,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
  },
  verifyText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  transactionSection: {
    backgroundColor: 'white',
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  transactionIcon: {
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  creditAmount: {
    color: '#047857',
  },
  debitAmount: {
    color: '#ef4444',
  },
  transactionStatus: {
    fontSize: 11,
    color: '#9ca3af',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#4b5563',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
});
