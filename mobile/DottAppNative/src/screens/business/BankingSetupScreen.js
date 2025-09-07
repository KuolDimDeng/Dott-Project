import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Countries where Plaid is available
const PLAID_COUNTRIES = [
  'US', 'CA', 'GB', 'FR', 'ES', 'NL', 'IE', 'DE',
  'IT', 'PL', 'DK', 'NO', 'SE', 'EE', 'LT', 'LV', 'PT', 'BE'
];

export default function BankingSetupScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [businessCountry, setBusinessCountry] = useState(null);
  const [provider, setProvider] = useState(null);
  const [showAddBank, setShowAddBank] = useState(false);
  const [showMPesaSetup, setShowMPesaSetup] = useState(false);

  useEffect(() => {
    loadBankingData();
  }, []);

  const loadBankingData = async () => {
    try {
      // Get user's business country
      const profileRes = await api.get('/api/users/profile/');
      const country = profileRes.data?.business_country || profileRes.data?.country || 'US';
      setBusinessCountry(country);
      
      // Determine provider based on country
      const useProvider = PLAID_COUNTRIES.includes(country) ? 'plaid' : 'wise';
      setProvider(useProvider);

      // Load existing bank connections
      const banksRes = await api.get('/api/banking/connections/');
      setBankAccounts(banksRes.data?.connections || []);
    } catch (error) {
      console.error('Error loading banking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBank = () => {
    if (provider === 'plaid') {
      // For Plaid countries, launch Plaid Link
      Alert.alert(
        'Connect Bank Account',
        'This will open Plaid to securely connect your bank account.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => launchPlaidLink() }
        ]
      );
    } else {
      // For non-Plaid countries, show manual entry form
      setShowAddBank(true);
    }
  };

  const launchPlaidLink = async () => {
    Alert.alert('Plaid Link', 'Plaid integration coming soon. For now, use manual entry.');
    setShowAddBank(true);
  };

  const handleSetDefault = async (accountId, module) => {
    try {
      await api.post(`/api/banking/${module}/set-default/`, {
        account_id: accountId
      });
      Alert.alert('Success', `Account set as default for ${module}`);
      loadBankingData();
    } catch (error) {
      Alert.alert('Error', 'Failed to set default account');
    }
  };

  const handleRemoveAccount = (accountId) => {
    Alert.alert(
      'Remove Bank Account',
      'Are you sure you want to remove this bank account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/banking/connections/${accountId}/`);
              Alert.alert('Success', 'Bank account removed');
              loadBankingData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove bank account');
            }
          }
        }
      ]
    );
  };

  const renderBankAccount = (account) => (
    <View key={account.id} style={styles.bankCard}>
      <View style={styles.bankHeader}>
        <Icon name="business" size={24} color="#2563eb" />
        <View style={styles.bankInfo}>
          <Text style={styles.bankName}>{account.bank_name}</Text>
          <Text style={styles.accountNumber}>****{account.account_number_last4}</Text>
        </View>
      </View>
      
      <View style={styles.defaultBadges}>
        {account.is_default_for_pos && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>POS Default</Text>
          </View>
        )}
        {account.is_default_for_invoices && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Invoice Default</Text>
          </View>
        )}
      </View>

      <View style={styles.bankActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleSetDefault(account.id, 'pos')}
        >
          <Text style={styles.actionText}>Set for POS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => handleRemoveAccount(account.id)}
        >
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading banking information...</Text>
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
        <Text style={styles.headerTitle}>Banking & Payouts</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Country Detection Info */}
        <View style={styles.infoCard}>
          <Icon name="globe" size={20} color="#2563eb" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Banking Provider</Text>
            <Text style={styles.infoText}>
              Based on your business location ({businessCountry}), 
              we're using {provider === 'plaid' ? 'Plaid' : 'Wise'} for banking.
            </Text>
          </View>
        </View>

        {/* Connected Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connected Accounts</Text>
          {bankAccounts.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="wallet-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No bank accounts connected</Text>
              <Text style={styles.emptySubtext}>
                Add a bank account to receive POS settlements
              </Text>
            </View>
          ) : (
            bankAccounts.map(renderBankAccount)
          )}
        </View>

        {/* Add Bank Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddBank}>
          <Icon name="add-circle-outline" size={24} color="#2563eb" />
          <Text style={styles.addButtonText}>Add Bank Account</Text>
        </TouchableOpacity>

        {/* M-Pesa for Kenya */}
        {businessCountry === 'KE' && (
          <TouchableOpacity 
            style={[styles.addButton, styles.mpesaButton]}
            onPress={() => setShowMPesaSetup(true)}
          >
            <Icon name="phone-portrait-outline" size={24} color="#10b981" />
            <Text style={[styles.addButtonText, { color: '#10b981' }]}>
              Setup M-Pesa for Payments
            </Text>
          </TouchableOpacity>
        )}

        {/* Payout Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout Schedule</Text>
          <View style={styles.scheduleCard}>
            <Icon name="calendar" size={20} color="#6b7280" />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleTitle}>Daily Automatic Payouts</Text>
              <Text style={styles.scheduleText}>
                POS sales are settled daily to your default bank account
              </Text>
              <Text style={styles.nextPayout}>Next payout: Tomorrow at 2:00 AM</Text>
            </View>
          </View>
        </View>

        {/* Recent Settlements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Settlements</Text>
          <View style={styles.settlementList}>
            <View style={styles.settlementItem}>
              <View style={styles.settlementDate}>
                <Text style={styles.settlementDay}>20</Text>
                <Text style={styles.settlementMonth}>Dec</Text>
              </View>
              <View style={styles.settlementInfo}>
                <Text style={styles.settlementAmount}>$1,250.00</Text>
                <Text style={styles.settlementStatus}>✓ Completed</Text>
              </View>
            </View>
            <View style={styles.settlementItem}>
              <View style={styles.settlementDate}>
                <Text style={styles.settlementDay}>19</Text>
                <Text style={styles.settlementMonth}>Dec</Text>
              </View>
              <View style={styles.settlementInfo}>
                <Text style={styles.settlementAmount}>$980.50</Text>
                <Text style={styles.settlementStatus}>✓ Completed</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Bank Modal */}
      {showAddBank && (
        <ManualBankForm
          onClose={() => setShowAddBank(false)}
          onSuccess={() => {
            setShowAddBank(false);
            loadBankingData();
          }}
          country={businessCountry}
        />
      )}

      {/* M-Pesa Setup Modal */}
      {showMPesaSetup && (
        <MPesaSetup
          onClose={() => setShowMPesaSetup(false)}
          onSuccess={() => {
            setShowMPesaSetup(false);
            Alert.alert('Success', 'M-Pesa setup completed');
          }}
        />
      )}
    </SafeAreaView>
  );
}

// Manual Bank Form Component
const ManualBankForm = ({ onClose, onSuccess, country }) => {
  const [formData, setFormData] = useState({
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    routing_number: '',
    iban: '',
    swift_code: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const response = await api.post('/api/banking/wise/connect/', {
        ...formData,
        bank_country: country,
      });
      Alert.alert('Success', 'Bank account added successfully');
      onSuccess();
    } catch (error) {
      Alert.alert('Error', 'Failed to add bank account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.modal}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Bank Account</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          <TextInput
            style={styles.input}
            placeholder="Bank Name"
            value={formData.bank_name}
            onChangeText={(text) => setFormData({...formData, bank_name: text})}
          />
          <TextInput
            style={styles.input}
            placeholder="Account Holder Name"
            value={formData.account_holder_name}
            onChangeText={(text) => setFormData({...formData, account_holder_name: text})}
          />
          <TextInput
            style={styles.input}
            placeholder="Account Number"
            value={formData.account_number}
            onChangeText={(text) => setFormData({...formData, account_number: text})}
            keyboardType="numeric"
          />
          {country === 'US' && (
            <TextInput
              style={styles.input}
              placeholder="Routing Number"
              value={formData.routing_number}
              onChangeText={(text) => setFormData({...formData, routing_number: text})}
              keyboardType="numeric"
            />
          )}
          {['GB', 'EU'].includes(country) && (
            <TextInput
              style={styles.input}
              placeholder="IBAN"
              value={formData.iban}
              onChangeText={(text) => setFormData({...formData, iban: text})}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="SWIFT/BIC Code"
            value={formData.swift_code}
            onChangeText={(text) => setFormData({...formData, swift_code: text})}
          />
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.submitButton]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Add Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// M-Pesa Setup Component
const MPesaSetup = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    business_number: '',
    till_number: '',
    phone_number: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post('/api/payments/mpesa/setup/', formData);
      onSuccess();
    } catch (error) {
      Alert.alert('Error', 'Failed to setup M-Pesa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.modal}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Setup M-Pesa</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          <Text style={styles.mpesaInfo}>
            Connect your M-Pesa business account to receive payments
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Business Number (Paybill)"
            value={formData.business_number}
            onChangeText={(text) => setFormData({...formData, business_number: text})}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Till Number"
            value={formData.till_number}
            onChangeText={(text) => setFormData({...formData, till_number: text})}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Business Phone Number"
            value={formData.phone_number}
            onChangeText={(text) => setFormData({...formData, phone_number: text})}
            keyboardType="phone-pad"
          />
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.submitButton, { backgroundColor: '#10b981' }]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Setup M-Pesa</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#3730a3',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  bankCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bankInfo: {
    marginLeft: 12,
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  accountNumber: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  defaultBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  bankActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#fef2f2',
  },
  removeText: {
    color: '#dc2626',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 8,
  },
  mpesaButton: {
    borderColor: '#10b981',
  },
  scheduleCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  scheduleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  scheduleText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  nextPayout: {
    fontSize: 14,
    color: '#2563eb',
    marginTop: 8,
    fontWeight: '500',
  },
  settlementList: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settlementItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settlementDate: {
    alignItems: 'center',
    marginRight: 16,
  },
  settlementDay: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  settlementMonth: {
    fontSize: 12,
    color: '#6b7280',
  },
  settlementInfo: {
    flex: 1,
  },
  settlementAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  settlementStatus: {
    fontSize: 14,
    color: '#059669',
    marginTop: 4,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#2563eb',
  },
  submitButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mpesaInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
});