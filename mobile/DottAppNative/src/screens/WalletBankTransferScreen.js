import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { transferToBank } from '../services/walletService';

export default function WalletBankTransferScreen({ navigation, route }) {
  const { wallet, bankAccounts, walletType = 'business' } = route.params;
  const { user } = useAuth();
  const { currency, formatAmount } = useCurrency();
  
  const [selectedAccount, setSelectedAccount] = useState(
    bankAccounts.find(acc => acc.is_default) || bankAccounts[0]
  );
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleTransfer = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    
    if (parseFloat(amount) > parseFloat(wallet.available_balance)) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance for this transfer');
      return;
    }
    
    Alert.alert(
      'Confirm Transfer',
      `Transfer ${formatAmount(amount)} to ${selectedAccount.bank_name} (${selectedAccount.account_number_masked})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setLoading(true);
              
              const result = await transferToBank({
                amount: parseFloat(amount),
                bank_account_id: selectedAccount.id,
                wallet_type: walletType,
                provider: 'MTN_MOMO',
                description: description || 'Transfer to bank account',
              });
              
              Alert.alert(
                'Transfer Initiated',
                `Your transfer of ${formatAmount(amount)} has been initiated successfully. Reference: ${result.reference}`,
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              console.error('Transfer error:', error);
              Alert.alert('Transfer Failed', error.message || 'Failed to process transfer');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfer to Bank</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Wallet Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatAmount(wallet.available_balance)}</Text>
        </View>
        
        {/* Select Bank Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Bank Account</Text>
          {bankAccounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={[
                styles.accountCard,
                selectedAccount?.id === account.id && styles.accountCardSelected,
              ]}
              onPress={() => setSelectedAccount(account)}
            >
              <View style={styles.accountInfo}>
                <Icon name="business" size={20} color="#6b7280" />
                <View style={styles.accountDetails}>
                  <Text style={styles.accountName}>{account.bank_name}</Text>
                  <Text style={styles.accountNumber}>{account.account_number_masked}</Text>
                  <Text style={styles.accountHolder}>{account.account_holder_name}</Text>
                </View>
              </View>
              {selectedAccount?.id === account.id && (
                <Icon name="checkmark-circle" size={24} color="#3b82f6" />
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amount</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>{currency.symbol}</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>
        
        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description (Optional)</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter transfer description"
            multiline
            numberOfLines={3}
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        {/* Transfer Note */}
        <View style={styles.noteCard}>
          <Icon name="information-circle" size={20} color="#f59e0b" />
          <Text style={styles.noteText}>
            Bank transfers typically take 1-3 business days to process. You will receive a notification once the transfer is complete.
          </Text>
        </View>
      </ScrollView>
      
      {/* Transfer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.transferButton, loading && styles.transferButtonDisabled]}
          onPress={handleTransfer}
          disabled={loading || !amount || !selectedAccount}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Icon name="send-outline" size={20} color="white" />
              <Text style={styles.transferButtonText}>Transfer to Bank</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  content: {
    padding: 20,
  },
  balanceCard: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  accountCardSelected: {
    borderColor: '#3b82f6',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountDetails: {
    marginLeft: 12,
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  accountNumber: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  accountHolder: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  descriptionInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1a1a1a',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    marginLeft: 8,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  transferButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transferButtonDisabled: {
    opacity: 0.5,
  },
  transferButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
});