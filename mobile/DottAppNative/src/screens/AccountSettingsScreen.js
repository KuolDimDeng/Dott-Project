import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function AccountSettingsScreen({ navigation }) {
  const { user } = useAuth();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadBankAccounts();
  }, []);
  
  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/banking/wise-accounts/');
      if (response.data.success) {
        setBankAccounts(response.data.data);
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddBank = () => {
    navigation.navigate('BankingSetup');
  };
  
  const handleDeleteBank = (accountId) => {
    Alert.alert(
      'Delete Bank Account',
      'Are you sure you want to delete this bank account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/banking/wise-accounts/${accountId}/`);
              loadBankAccounts();
              Alert.alert('Success', 'Bank account deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bank account');
            }
          },
        },
      ]
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading bank accounts...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Accounts</Text>
        <TouchableOpacity onPress={handleAddBank}>
          <Icon name="add-circle-outline" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Bank Accounts List */}
        {bankAccounts.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="business-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Bank Accounts</Text>
            <Text style={styles.emptyText}>
              Add a bank account to receive transfers from your wallet
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddBank}>
              <Icon name="add-circle-outline" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Bank Account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {bankAccounts.map((account) => (
              <View key={account.id} style={styles.accountCard}>
                <View style={styles.accountIcon}>
                  <Icon name="business" size={24} color="#6b7280" />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.bank_name}</Text>
                  <Text style={styles.accountNumber}>
                    {account.account_number_last4 ? `****${account.account_number_last4}` : '****'}
                  </Text>
                  <Text style={styles.accountHolder}>{account.account_holder_name}</Text>
                  <View style={styles.accountBadges}>
                    {account.is_verified && (
                      <View style={styles.verifiedBadge}>
                        <Icon name="checkmark-circle" size={12} color="#10b981" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                    {account.is_default_for_pos && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteBank(account.id)}
                >
                  <Icon name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Icon name="information-circle" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Bank account details are securely stored using bank-grade encryption. 
            Only the last 4 digits are visible for your security.
          </Text>
        </View>
      </ScrollView>
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  accountNumber: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  accountHolder: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
  },
  accountBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 4,
  },
  defaultBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    marginLeft: 8,
    lineHeight: 18,
  },
});