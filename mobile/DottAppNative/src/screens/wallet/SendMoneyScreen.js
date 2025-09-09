import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Contacts from 'react-native-contacts';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import walletService from '../../services/walletService';

export default function SendMoneyScreen({ navigation, route }) {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const provider = route.params?.provider || 'MTN_MOMO';
  
  const [amount, setAmount] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [showContacts, setShowContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadWallet();
    requestContactsPermission();
  }, []);

  const loadWallet = async () => {
    try {
      const walletData = await walletService.getWallet(provider);
      setWallet(walletData);
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const requestContactsPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'Dott needs access to your contacts to help you send money to friends.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          loadContacts();
        }
      } else {
        // iOS permissions are handled differently
        loadContacts();
      }
    } catch (err) {
      console.warn('Contact permission error:', err);
    }
  };

  const loadContacts = () => {
    Contacts.getAll()
      .then((contactsList) => {
        // Filter contacts with phone numbers
        const contactsWithPhones = contactsList.filter(
          (contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0
        );
        setContacts(contactsWithPhones);
      })
      .catch((error) => {
        console.error('Error loading contacts:', error);
      });
  };

  const selectContact = (contact) => {
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      const phone = contact.phoneNumbers[0].number.replace(/[^0-9+]/g, '');
      setRecipientPhone(phone);
      setRecipientName(
        contact.displayName || 
        `${contact.givenName || ''} ${contact.familyName || ''}`.trim()
      );
      setShowContacts(false);
      setSearchQuery('');
    }
  };

  const validateInput = () => {
    if (!recipientPhone) {
      Alert.alert('Error', 'Please enter recipient phone number');
      return false;
    }

    const phoneValidation = walletService.validatePhoneNumber(recipientPhone);
    if (!phoneValidation.valid) {
      Alert.alert('Error', phoneValidation.error);
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }

    if (wallet && parseFloat(amount) > parseFloat(wallet.available_balance)) {
      Alert.alert('Error', 'Insufficient balance');
      return false;
    }

    return true;
  };

  const handleSend = async () => {
    if (!validateInput()) return;

    Alert.alert(
      'Confirm Transfer',
      `Send ${walletService.formatAmount(amount, currency?.code || 'USD')} to ${recipientName || recipientPhone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: confirmSend },
      ]
    );
  };

  const confirmSend = async () => {
    try {
      setLoading(true);
      const result = await walletService.sendMoney(
        recipientPhone,
        parseFloat(amount),
        description || `Transfer to ${recipientName || recipientPhone}`,
        provider
      );

      if (result.queued) {
        Alert.alert(
          'Queued',
          result.message,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Success',
          `Money sent successfully!\nReference: ${result.reference || result.transfer_id}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send money');
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const name = contact.displayName || 
                 `${contact.givenName || ''} ${contact.familyName || ''}`.trim();
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Money</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Balance Display */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>
              {walletService.formatAmount(wallet?.available_balance || 0, currency?.code || 'USD')}
            </Text>
          </View>

          {/* Recipient Section */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Send To</Text>
            
            <View style={styles.inputContainer}>
              <Icon name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Recipient phone number"
                value={recipientPhone}
                onChangeText={setRecipientPhone}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => setShowContacts(!showContacts)}
              >
                <Icon name="people-outline" size={20} color="#047857" />
              </TouchableOpacity>
            </View>

            {recipientName ? (
              <Text style={styles.recipientName}>{recipientName}</Text>
            ) : null}

            {/* Contact Picker */}
            {showContacts && (
              <View style={styles.contactsContainer}>
                <TextInput
                  style={styles.contactSearch}
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <ScrollView style={styles.contactsList} nestedScrollEnabled>
                  {filteredContacts.slice(0, 5).map((contact, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.contactItem}
                      onPress={() => selectContact(contact)}
                    >
                      <View style={styles.contactAvatar}>
                        <Text style={styles.contactInitial}>
                          {(contact.givenName?.[0] || contact.displayName?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>
                          {contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim()}
                        </Text>
                        {contact.phoneNumbers?.[0] && (
                          <Text style={styles.contactPhone}>
                            {contact.phoneNumbers[0].number}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Amount Section */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Amount</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>
                {currency?.symbol || '$'}
              </Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Description (Optional)</Text>
            <View style={styles.inputContainer}>
              <Icon name="document-text-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="What's this for?"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>
          </View>

          {/* Fee Notice */}
          <View style={styles.feeNotice}>
            <Icon name="information-circle-outline" size={16} color="#6b7280" />
            <Text style={styles.feeText}>
              Transaction fees may apply based on your provider
            </Text>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Icon name="send" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.sendButtonText}>Send Money</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  balanceSection: {
    backgroundColor: '#047857',
    padding: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  inputSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    paddingVertical: 12,
  },
  contactButton: {
    padding: 8,
  },
  recipientName: {
    fontSize: 14,
    color: '#047857',
    marginTop: 8,
    fontWeight: '500',
  },
  contactsContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  contactSearch: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    fontSize: 14,
  },
  contactsList: {
    maxHeight: 200,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4338ca',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  contactPhone: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  currencySymbol: {
    fontSize: 20,
    color: '#6b7280',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '600',
  },
  feeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  feeText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
