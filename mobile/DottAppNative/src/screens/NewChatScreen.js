import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  Alert,
  SectionList,
  Linking,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Contacts from 'react-native-contacts';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function NewChatScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
    loadAppUsers();
  }, []);

  const loadContacts = () => {
    Contacts.getAll()
      .then(contactsList => {
        const sortedContacts = contactsList
          .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
          .sort((a, b) => {
            const nameA = `${a.givenName} ${a.familyName}`.toLowerCase();
            const nameB = `${b.givenName} ${b.familyName}`.toLowerCase();
            return nameA.localeCompare(nameB);
          })
          .map(contact => ({
            ...contact,
            displayName: `${contact.givenName || ''} ${contact.familyName || ''}`.trim() || 'Unknown',
            phoneNumber: contact.phoneNumbers[0]?.number,
            isAppUser: false, // This would be checked against your backend
          }));
        
        setContacts(sortedContacts);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading contacts:', error);
        setLoading(false);
      });
  };

  const loadAppUsers = () => {
    // Mock app users - in production, fetch from API
    const mockAppUsers = [
      {
        id: 'user1',
        displayName: 'Alice Johnson',
        phoneNumber: '+1234567890',
        isAppUser: true,
        status: 'Hey there! I am using Dott',
      },
      {
        id: 'user2',
        displayName: 'Bob Smith',
        phoneNumber: '+1234567891',
        isAppUser: true,
        status: 'Available',
      },
    ];
    setAppUsers(mockAppUsers);
  };

  const startChat = (contact) => {
    if (contact.isAppUser) {
      // Start chat with existing app user
      navigation.navigate('ChatConversation', {
        conversationId: `conv_${contact.id || Date.now()}`,
        recipientName: contact.displayName,
        phoneNumber: contact.phoneNumber,
        isGroup: false,
      });
    } else {
      // Contact is not on app - show invite options
      Alert.alert(
        'Invite to Dott',
        `${contact.displayName} is not on Dott yet. Would you like to invite them?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send SMS Invite',
            onPress: () => sendInvite(contact, 'sms'),
          },
          {
            text: 'Share App Link',
            onPress: () => sendInvite(contact, 'share'),
          },
        ]
      );
    }
  };

  const sendInvite = async (contact, method) => {
    const inviteMessage = `Hey ${contact.displayName}! Join me on Dott - a messaging app with voice and video calls. Download it here: https://dottapps.com/download`;
    
    if (method === 'sms') {
      const url = `sms:${contact.phoneNumber}?body=${encodeURIComponent(inviteMessage)}`;
      Linking.openURL(url).catch(err => {
        Alert.alert('Error', 'Unable to send SMS');
      });
    } else {
      Share.share({
        message: inviteMessage,
        title: 'Join Dott',
      });
    }
  };

  const createGroup = () => {
    navigation.navigate('GroupCreation');
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const filterData = () => {
    const filtered = [...appUsers, ...contacts].filter(item => {
      return item.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             item.phoneNumber?.includes(searchQuery);
    });

    // Group by app users and non-app contacts
    const sections = [];
    
    const appUserFiltered = filtered.filter(item => item.isAppUser);
    if (appUserFiltered.length > 0) {
      sections.push({
        title: 'On Dott',
        data: appUserFiltered,
      });
    }

    const nonAppFiltered = filtered.filter(item => !item.isAppUser);
    if (nonAppFiltered.length > 0) {
      sections.push({
        title: 'Invite to Dott',
        data: nonAppFiltered,
      });
    }

    return sections;
  };

  const renderContact = ({ item }) => (
    <TouchableOpacity style={styles.contactItem} onPress={() => startChat(item)}>
      <View style={[styles.avatar, !item.isAppUser && styles.inviteAvatar]}>
        <Text style={styles.avatarText}>{getInitials(item.displayName)}</Text>
      </View>
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.displayName}</Text>
        <Text style={styles.contactStatus}>
          {item.isAppUser ? (item.status || 'Available') : item.phoneNumber}
        </Text>
      </View>
      
      {!item.isAppUser && (
        <View style={styles.inviteButton}>
          <Text style={styles.inviteText}>INVITE</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Chat</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity style={styles.groupOption} onPress={createGroup}>
        <View style={styles.groupIcon}>
          <Icon name="people" size={24} color="white" />
        </View>
        <Text style={styles.groupText}>New Group</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (
        <SectionList
          sections={filterData()}
          keyExtractor={(item, index) => item.recordID || item.id || index.toString()}
          renderItem={renderContact}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={true}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="people-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Contacts Found</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? `No contacts matching "${searchQuery}"` : 'No contacts available'}
              </Text>
            </View>
          }
        />
      )}
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
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerSpacer: {
    width: 32,
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
  groupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  sectionHeader: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inviteAvatar: {
    backgroundColor: '#e5e7eb',
  },
  avatarText: {
    color: '#4338ca',
    fontWeight: '600',
    fontSize: 16,
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
  contactStatus: {
    fontSize: 14,
    color: '#6b7280',
  },
  inviteButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  inviteText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
});