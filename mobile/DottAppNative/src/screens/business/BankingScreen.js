import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function BankingScreen({ navigation }) {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const connectBank = () => {
    Alert.alert(
      'Connect Bank Account',
      'Bank connection will be available soon. We support Plaid for US banks and manual entry for international accounts.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Banking</Text>
        <TouchableOpacity onPress={connectBank}>
          <Icon name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>$0.00</Text>
          <View style={styles.balanceStats}>
            <View style={styles.balanceStat}>
              <Icon name="arrow-up" size={16} color="#10b981" />
              <Text style={styles.balanceStatText}>Income: $0.00</Text>
            </View>
            <View style={styles.balanceStat}>
              <Icon name="arrow-down" size={16} color="#ef4444" />
              <Text style={styles.balanceStatText}>Expenses: $0.00</Text>
            </View>
          </View>
        </View>

        {accounts.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="business-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No bank accounts connected</Text>
            <Text style={styles.emptyStateSubtext}>
              Connect your bank account to track transactions and manage cash flow
            </Text>
            <TouchableOpacity style={styles.connectButton} onPress={connectBank}>
              <Icon name="add-circle-outline" size={20} color="#ffffff" />
              <Text style={styles.connectButtonText}>Connect Bank Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.accountsList}>
              <Text style={styles.sectionTitle}>Connected Accounts</Text>
              {accounts.map((account, index) => (
                <TouchableOpacity key={index} style={styles.accountItem}>
                  <View style={styles.accountIcon}>
                    <Icon name="card-outline" size={24} color="#84cc16" />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountNumber}>****{account.last4}</Text>
                  </View>
                  <Text style={styles.accountBalance}>${account.balance}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.transactionsList}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              {transactions.map((transaction, index) => (
                <View key={index} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <Text style={styles.transactionName}>{transaction.name}</Text>
                    <Text style={styles.transactionDate}>{transaction.date}</Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: transaction.amount > 0 ? '#10b981' : '#ef4444' }
                  ]}>
                    {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#84cc16',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  balanceStats: {
    flexDirection: 'row',
    gap: 24,
  },
  balanceStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceStatText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#84cc16',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  accountsList: {
    marginBottom: 24,
  },
  accountItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#84cc1620',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  accountNumber: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  accountBalance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  transactionsList: {
    paddingBottom: 20,
  },
  transactionItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  transactionDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});