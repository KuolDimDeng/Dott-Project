import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Contacts from 'react-native-contacts';
import { useNavigation } from '@react-navigation/native';

export default function CallScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('recent');
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  // Mock recent calls data - in production, this would come from call history
  const [recentCalls] = useState([
    { id: '1', name: 'John Doe', number: '+1 555-0123', time: '10:30 AM', type: 'outgoing', missed: false },
    { id: '2', name: 'Jane Smith', number: '+1 555-0124', time: '9:15 AM', type: 'incoming', missed: true },
    { id: '3', name: 'Bob Johnson', number: '+1 555-0125', time: 'Yesterday', type: 'incoming', missed: false },
  ]);

  useEffect(() => {
    if (activeTab === 'contacts') {
      requestContactsPermission();
    }
  }, [activeTab]);

  useEffect(() => {
    // Filter contacts based on search query
    if (searchQuery) {
      const filtered = contacts.filter(contact => {
        const fullName = `${contact.givenName} ${contact.familyName}`.toLowerCase();
        const phoneNumbers = contact.phoneNumbers.map(p => p.number).join(' ');
        return fullName.includes(searchQuery.toLowerCase()) || 
               phoneNumbers.includes(searchQuery);
      });
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const requestContactsPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        // iOS automatically prompts for permission when accessing contacts
        loadContacts();
      } else {
        // Android requires explicit permission request
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'Dott needs access to your contacts to make calls.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
          loadContacts();
        } else {
          setHasPermission(false);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Permission error:', error);
      setLoading(false);
    }
  };

  const loadContacts = () => {
    Contacts.getAll()
      .then(contactsList => {
        // Sort contacts alphabetically and filter out those without phone numbers
        const sortedContacts = contactsList
          .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
          .sort((a, b) => {
            const nameA = `${a.givenName} ${a.familyName}`.toLowerCase();
            const nameB = `${b.givenName} ${b.familyName}`.toLowerCase();
            return nameA.localeCompare(nameB);
          });
        
        setContacts(sortedContacts);
        setFilteredContacts(sortedContacts);
        setHasPermission(true);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading contacts:', error);
        if (error.code === 'denied') {
          setHasPermission(false);
        }
        setLoading(false);
      });
  };

  const initiateCall = (contact, callType) => {
    const phoneNumber = contact.phoneNumbers ? contact.phoneNumbers[0]?.number : contact.number;
    const contactName = contact.givenName ? 
      `${contact.givenName} ${contact.familyName}`.trim() : 
      contact.name;
    
    Alert.alert(
      `${callType === 'video' ? 'Video' : 'Voice'} Call`,
      `Call ${contactName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: async () => {
            // Use the global initiateCall function from CallManager
            if (global.initiateCall) {
              const callStarted = await global.initiateCall(
                contact.recordID || `call_${Date.now()}`,
                callType,
                {
                  name: contactName,
                  phone: phoneNumber,
                  image: contact.thumbnailPath || null,
                }
              );
              
              if (!callStarted) {
                Alert.alert('Call Failed', 'Unable to start the call. Please try again.');
              }
            } else {
              Alert.alert('Error', 'Call service not available. Please restart the app.');
            }
          },
        },
      ]
    );
  };

  const getContactInitials = (contact) => {
    if (contact.givenName || contact.familyName) {
      const first = contact.givenName?.[0] || '';
      const last = contact.familyName?.[0] || '';
      return (first + last).toUpperCase() || '?';
    }
    return contact.name ? contact.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
  };

  const formatPhoneNumber = (phoneNumber) => {
    // Simple formatting - you can enhance this based on your needs
    const cleaned = phoneNumber.replace(/[^\d]/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    }
    return phoneNumber;
  };

  const renderCallItem = ({ item }) => (
    <TouchableOpacity style={styles.callItem} onPress={() => initiateCall(item, 'voice')}>
      <View style={styles.callIcon}>
        <Icon 
          name={item.type === 'outgoing' ? 'call-outline' : 'call-outline'} 
          size={20} 
          color={item.missed ? '#ef4444' : '#10b981'} 
        />
      </View>
      <View style={styles.callInfo}>
        <Text style={[styles.callName, item.missed && styles.missedCall]}>
          {item.name}
        </Text>
        <Text style={styles.callNumber}>{item.number}</Text>
      </View>
      <View style={styles.callMeta}>
        <Text style={styles.callTime}>{item.time}</Text>
        <View style={styles.callButtons}>
          <TouchableOpacity 
            style={styles.callButton} 
            onPress={() => initiateCall(item, 'video')}
          >
            <Icon name="videocam" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContactItem = ({ item }) => {
    const phoneNumber = item.phoneNumbers[0]?.number || '';
    const displayName = `${item.givenName || ''} ${item.familyName || ''}`.trim() || 'Unknown';
    
    return (
      <View style={styles.contactItem}>
        <View style={styles.contactAvatar}>
          <Text style={styles.avatarText}>{getContactInitials(item)}</Text>
        </View>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{displayName}</Text>
          <Text style={styles.contactNumber}>{formatPhoneNumber(phoneNumber)}</Text>
        </View>
        
        <View style={styles.callButtons}>
          <TouchableOpacity 
            style={styles.callButton} 
            onPress={() => initiateCall(item, 'voice')}
          >
            <Icon name="call" size={20} color="#2563eb" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.callButton} 
            onPress={() => initiateCall(item, 'video')}
          >
            <Icon name="videocam" size={22} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (activeTab === 'contacts' && !hasPermission) {
      return (
        <View style={styles.emptyState}>
          <Icon name="people-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Contacts Access</Text>
          <Text style={styles.emptyText}>
            Please allow Dott to access your contacts to make calls.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestContactsPermission}
          >
            <Text style={styles.permissionButtonText}>Allow Access</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (searchQuery && (activeTab === 'contacts' ? filteredContacts.length === 0 : recentCalls.length === 0)) {
      return (
        <View style={styles.emptyState}>
          <Icon name="search-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Results</Text>
          <Text style={styles.emptyText}>
            No {activeTab === 'contacts' ? 'contacts' : 'calls'} found matching "{searchQuery}"
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyState}>
        <Icon name={activeTab === 'contacts' ? 'people-outline' : 'call-outline'} size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No {activeTab === 'contacts' ? 'Contacts' : 'Recent Calls'}</Text>
        <Text style={styles.emptyText}>
          {activeTab === 'contacts' ? 
            'No contacts with phone numbers found.' : 
            'No recent calls to display.'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calls</Text>
        {activeTab === 'contacts' && filteredContacts.length > 0 && (
          <Text style={styles.contactCount}>
            {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'}
          </Text>
        )}
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab === 'contacts' ? 'contacts' : 'calls'}`}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
          onPress={() => setActiveTab('recent')}
        >
          <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>
            Recent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'contacts' && styles.activeTab]}
          onPress={() => setActiveTab('contacts')}
        >
          <Text style={[styles.tabText, activeTab === 'contacts' && styles.activeTabText]}>
            Contacts
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'recent' ? (
        <FlatList
          data={recentCalls}
          keyExtractor={item => item.id}
          renderItem={renderCallItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
        />
      ) : (
        loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredContacts}
            keyExtractor={item => item.recordID}
            renderItem={renderContactItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
          />
        )
      )}

      <TouchableOpacity style={styles.fab}>
        <Icon name="keypad" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  contactCount: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  callIcon: {
    marginRight: 12,
  },
  callInfo: {
    flex: 1,
  },
  callName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  missedCall: {
    color: '#ef4444',
  },
  callNumber: {
    fontSize: 14,
    color: '#6b7280',
  },
  callMeta: {
    alignItems: 'flex-end',
  },
  callTime: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#4338ca',
    fontWeight: '600',
    fontSize: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  contactNumber: {
    fontSize: 14,
    color: '#6b7280',
  },
  callButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    padding: 8,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});