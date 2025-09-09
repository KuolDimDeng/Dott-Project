import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { getWallet, getWalletTransactions, getUserBankAccounts } from '../services/walletService';

export default function BusinessWalletHomeScreen({ navigation }) {
  const { user } = useAuth();
  const { currency, formatAmount } = useCurrency();
  
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    loadWalletData();
  }, []);
  
  const loadWalletData = async () => {
    try {
      setLoading(true);
      
      // Load business wallet
      const walletData = await getWallet('business', 'MTN_MOMO');
      setWallet(walletData);
      
      // Load transactions
      const transactionsData = await getWalletTransactions('MTN_MOMO', 20, 0);
      setTransactions(transactionsData);
      
      // Load bank accounts
      const accountsData = await getUserBankAccounts();
      setBankAccounts(accountsData);
      
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadWalletData();
  };
  
  const handleTopUp = () => {
    navigation.navigate('WalletTopUp', { walletType: 'business' });
  };
  
  const handleTransferToBank = () => {
    if (bankAccounts.length === 0) {
      Alert.alert(
        'No Bank Account',
        'Please add a bank account in Settings to transfer funds.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => navigation.navigate('AccountSettings') }
        ]
      );
    } else {
      navigation.navigate('WalletBankTransfer', { 
        wallet,
        bankAccounts,
        walletType: 'business' 
      });
    }
  };
  
  const handlePayVendor = () => {
    Alert.alert('Coming Soon', 'Vendor payment via QR will be available soon');
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Wallet</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WalletSettings')}>
            <Icon name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            {formatAmount(wallet?.available_balance || 0)}
          </Text>
          <View style={styles.balanceDetails}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Total</Text>
              <Text style={styles.balanceItemValue}>
                {formatAmount(wallet?.balance || 0)}
              </Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceItemLabel}>Pending</Text>
              <Text style={styles.balanceItemValue}>
                {formatAmount(wallet?.pending_balance || 0)}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
      
      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleTopUp}>
          <View style={[styles.actionIcon, { backgroundColor: '#10b981' }]}>
            <Icon name="add-circle-outline" size={24} color="white" />
          </View>
          <Text style={styles.actionText}>Top Up</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleTransferToBank}>
          <View style={[styles.actionIcon, { backgroundColor: '#f59e0b' }]}>
            <Icon name="business-outline" size={24} color="white" />
          </View>
          <Text style={styles.actionText}>To Bank</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handlePayVendor}>
          <View style={[styles.actionIcon, { backgroundColor: '#8b5cf6' }]}>
            <Icon name="qr-code-outline" size={24} color="white" />
          </View>
          <Text style={styles.actionText}>Pay Vendor</Text>
        </TouchableOpacity>
      </View>
      
      {/* Bank Accounts Section */}
      {bankAccounts.length > 0 && (
        <View style={styles.bankSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bank Accounts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AccountSettings')}>
              <Icon name="add-circle-outline" size={20} color="#3b82f6" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {bankAccounts.map((account, index) => (
              <View key={account.id} style={styles.bankCard}>
                <Icon name="business" size={20} color="#6b7280" />
                <Text style={styles.bankName}>{account.bank_name}</Text>
                <Text style={styles.bankAccount}>{account.account_number_masked}</Text>
                {account.is_default && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Transactions */}
      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('WalletTransactions', { walletType: 'business' })}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="receipt-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.slice(0, 5).map((transaction, index) => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.transactionItem}
                onPress={() => navigation.navigate('TransactionDetails', { transaction })}
              >
                <View style={styles.transactionIcon}>
                  <Icon
                    name={transaction.transaction_type === 'credit' ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={transaction.transaction_type === 'credit' ? '#10b981' : '#ef4444'}
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: transaction.transaction_type === 'credit' ? '#10b981' : '#ef4444' }
                ]}>
                  {transaction.transaction_type === 'credit' ? '+' : '-'}
                  {formatAmount(transaction.amount)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
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
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingTop: 44,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  balanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  balanceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceItem: {
    flex: 1,
  },
  balanceItemLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  balanceItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  balanceDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 20,
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
    fontWeight: '500',
    color: '#1a1a1a',
  },
  bankSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  bankCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 8,
  },
  bankAccount: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  defaultBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  transactionsSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
});