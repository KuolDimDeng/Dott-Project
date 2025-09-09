import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Switch,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Contacts from 'react-native-contacts';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AddUserScreen({ navigation }) {
  const { user } = useAuth();
  const [inviteMethod, setInviteMethod] = useState('manual'); // 'manual' or 'contacts'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contactsList, setContactsList] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAvailablePermissions();
  }, []);

  const loadAvailablePermissions = async () => {
    try {
      const response = await api.get('/auth/mobile/users/available_permissions/');
      if (response.data.success) {
        setAvailablePermissions(response.data.data);
        // Select common permissions by default
        const defaultPerms = ['pos_terminal', 'inventory', 'customers', 'orders'];
        setSelectedPermissions(defaultPerms);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const requestContactsPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'This app needs access to your contacts to invite team members.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  };

  const loadContacts = async () => {
    const hasPermission = await requestContactsPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Cannot access contacts without permission');
      return;
    }

    try {
      Contacts.getAll()
        .then(contacts => {
          // Filter contacts with phone numbers
          const contactsWithPhone = contacts.filter(
            contact => contact.phoneNumbers && contact.phoneNumbers.length > 0
          );
          setContactsList(contactsWithPhone);
        })
        .catch(error => {
          console.error('Error loading contacts:', error);
          Alert.alert('Error', 'Failed to load contacts');
        });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleInviteMethodChange = (method) => {
    setInviteMethod(method);
    if (method === 'contacts' && contactsList.length === 0) {
      loadContacts();
    }
  };

  const selectContact = (contact) => {
    setSelectedContact(contact);
    setFullName(`${contact.givenName} ${contact.familyName}`.trim());
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      setPhone(contact.phoneNumbers[0].number);
    }
    if (contact.emailAddresses && contact.emailAddresses.length > 0) {
      setEmail(contact.emailAddresses[0].email);
    }
  };

  const togglePermission = (permission) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  const handleSendInvitation = async () => {
    if (!phone && !email) {
      Alert.alert('Error', 'Please provide a phone number or email address');
      return;
    }

    if (!fullName) {
      Alert.alert('Error', 'Please provide the team member\'s name');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/mobile/users/invite_user/', {
        phone: phone || null,
        email: email || null,
        full_name: fullName,
        permissions: selectedPermissions,
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Invitation sent successfully! The user will receive instructions to join your team.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contactsList.filter(contact => {
    const name = `${contact.givenName} ${contact.familyName}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const renderPermissionItem = (permission) => {
    const isSelected = selectedPermissions.includes(permission.name);
    
    return (
      <TouchableOpacity
        key={permission.name}
        style={[styles.permissionItem, isSelected && styles.permissionItemSelected]}
        onPress={() => togglePermission(permission.name)}
      >
        <View style={styles.permissionInfo}>
          <Text style={[styles.permissionLabel, isSelected && styles.permissionLabelSelected]}>
            {permission.label}
          </Text>
          <Text style={styles.permissionCategory}>{permission.category}</Text>
        </View>
        <Icon
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={isSelected ? '#2563eb' : '#9ca3af'}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Team Member</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Invite Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How would you like to add a team member?</Text>
          <View style={styles.methodButtons}>
            <TouchableOpacity
              style={[styles.methodButton, inviteMethod === 'manual' && styles.methodButtonActive]}
              onPress={() => handleInviteMethodChange('manual')}
            >
              <Icon name="create-outline" size={24} color={inviteMethod === 'manual' ? '#2563eb' : '#6b7280'} />
              <Text style={[styles.methodButtonText, inviteMethod === 'manual' && styles.methodButtonTextActive]}>
                Enter Manually
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodButton, inviteMethod === 'contacts' && styles.methodButtonActive]}
              onPress={() => handleInviteMethodChange('contacts')}
            >
              <Icon name="people-outline" size={24} color={inviteMethod === 'contacts' ? '#2563eb' : '#6b7280'} />
              <Text style={[styles.methodButtonText, inviteMethod === 'contacts' && styles.methodButtonTextActive]}>
                From Contacts
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Selection */}
        {inviteMethod === 'contacts' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Contact</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <ScrollView style={styles.contactsList} nestedScrollEnabled>
              {filteredContacts.map((contact, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.contactItem, selectedContact?.recordID === contact.recordID && styles.contactItemSelected]}
                  onPress={() => selectContact(contact)}
                >
                  <Text style={styles.contactName}>
                    {`${contact.givenName} ${contact.familyName}`.trim()}
                  </Text>
                  {contact.phoneNumbers && contact.phoneNumbers.length > 0 && (
                    <Text style={styles.contactPhone}>{contact.phoneNumbers[0].number}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* User Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Member Details</Text>
          
          <View style={styles.inputContainer}>
            <Icon name="person-outline" size={20} color="#6b7280" />
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="call-outline" size={20} color="#6b7280" />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="mail-outline" size={20} color="#6b7280" />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Access Permissions</Text>
          <Text style={styles.sectionSubtitle}>
            Select which features this team member can access
          </Text>
          
          <View style={styles.permissionsGrid}>
            {availablePermissions.map(renderPermissionItem)}
          </View>
          
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={() => {
              if (selectedPermissions.length === availablePermissions.length) {
                setSelectedPermissions([]);
              } else {
                setSelectedPermissions(availablePermissions.map(p => p.name));
              }
            }}
          >
            <Text style={styles.selectAllText}>
              {selectedPermissions.length === availablePermissions.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSendInvitation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Icon name="send" size={20} color="white" />
              <Text style={styles.sendButtonText}>Send Invitation</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Note: The invited user will receive a USER role and can only access the features you select.
          They will need to download the Dott app and sign up with the provided contact information.
        </Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  methodButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  methodButtonText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  methodButtonTextActive: {
    color: '#2563eb',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  contactsList: {
    maxHeight: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contactItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  contactItemSelected: {
    backgroundColor: '#eff6ff',
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
  permissionsGrid: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  permissionItemSelected: {
    backgroundColor: '#eff6ff',
  },
  permissionInfo: {
    flex: 1,
  },
  permissionLabel: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  permissionLabelSelected: {
    color: '#2563eb',
  },
  permissionCategory: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  selectAllButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  selectAllText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  note: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});