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
  Image,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Contacts from 'react-native-contacts';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function GroupCreationScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
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
            isAppUser: Math.random() > 0.5, // Mock - in production check with backend
          }));
        
        setContacts(sortedContacts);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading contacts:', error);
        setLoading(false);
      });
  };

  const toggleContactSelection = (contact) => {
    const isSelected = selectedContacts.find(c => c.recordID === contact.recordID);
    if (isSelected) {
      setSelectedContacts(selectedContacts.filter(c => c.recordID !== contact.recordID));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const createGroup = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedContacts.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    // Check if any selected contacts are not app users
    const nonAppUsers = selectedContacts.filter(c => !c.isAppUser);
    if (nonAppUsers.length > 0) {
      Alert.alert(
        'Invite Members',
        `${nonAppUsers.length} selected contact(s) are not on Dott yet. They will receive an invitation to join.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create & Invite',
            onPress: () => finalizeGroupCreation(nonAppUsers),
          },
        ]
      );
    } else {
      finalizeGroupCreation([]);
    }
  };

  const finalizeGroupCreation = (contactsToInvite) => {
    // In production, this would call your API to create the group
    const groupData = {
      name: groupName,
      description: groupDescription,
      members: selectedContacts.map(c => ({
        id: c.recordID,
        name: c.displayName,
        phoneNumber: c.phoneNumber,
        isAppUser: c.isAppUser,
      })),
      createdBy: user?.id,
    };

    console.log('Creating group:', groupData);

    // Send invitations to non-app users
    contactsToInvite.forEach(contact => {
      // This would trigger SMS/notification invites
      console.log(`Inviting ${contact.displayName} to join Dott`);
    });

    // Navigate to the new group chat
    navigation.navigate('ChatConversation', {
      conversationId: `group_${Date.now()}`,
      recipientName: groupName,
      isGroup: true,
      members: selectedContacts.map(c => c.displayName),
      memberCount: selectedContacts.length + 1, // +1 for current user
    });
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const filteredContacts = contacts.filter(contact => {
    return contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           contact.phoneNumber?.includes(searchQuery);
  });

  const renderContact = ({ item }) => {
    const isSelected = selectedContacts.find(c => c.recordID === item.recordID);
    
    return (
      <TouchableOpacity 
        style={[styles.contactItem, isSelected && styles.selectedContact]}
        onPress={() => toggleContactSelection(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.displayName)}</Text>
          {!item.isAppUser && (
            <View style={styles.inviteIndicator}>
              <Icon name="mail" size={10} color="white" />
            </View>
          )}
        </View>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.displayName}</Text>
          <Text style={styles.contactStatus}>
            {item.isAppUser ? 'On Dott' : 'Will be invited'}
          </Text>
        </View>
        
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Icon name="checkmark" size={18} color="white" />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSelectedContact = (contact) => (
    <TouchableOpacity
      key={contact.recordID}
      style={styles.selectedChip}
      onPress={() => toggleContactSelection(contact)}
    >
      <Text style={styles.selectedChipText}>
        {contact.displayName.split(' ')[0]}
      </Text>
      <Icon name="close" size={16} color="white" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Group</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={createGroup}
          disabled={!groupName.trim() || selectedContacts.length === 0}
        >
          <Text style={[
            styles.createButtonText,
            (!groupName.trim() || selectedContacts.length === 0) && styles.createButtonTextDisabled
          ]}>
            Create
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.groupInfoSection}>
          <View style={styles.groupImageContainer}>
            <TouchableOpacity style={styles.groupImage}>
              <Icon name="camera" size={30} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.groupInputs}>
            <TextInput
              style={styles.groupNameInput}
              placeholder="Group name"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={25}
            />
            <TextInput
              style={styles.groupDescInput}
              placeholder="Group description (optional)"
              value={groupDescription}
              onChangeText={setGroupDescription}
              maxLength={100}
            />
          </View>
        </View>

        {selectedContacts.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.selectedTitle}>
              Selected ({selectedContacts.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.selectedChips}>
                {selectedContacts.map(renderSelectedContact)}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts to add"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Add Members</Text>
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.recordID}
          renderItem={renderContact}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No contacts found</Text>
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
  createButton: {
    padding: 4,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  createButtonTextDisabled: {
    color: '#9ca3af',
  },
  scrollView: {
    flex: 1,
  },
  groupInfoSection: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
  },
  groupImageContainer: {
    marginRight: 16,
  },
  groupImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInputs: {
    flex: 1,
  },
  groupNameInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    paddingVertical: 4,
  },
  groupDescInput: {
    fontSize: 14,
    color: '#6b7280',
    paddingVertical: 4,
  },
  selectedSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChipText: {
    color: 'white',
    fontSize: 14,
    marginRight: 4,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 12,
  },
  listContent: {
    paddingBottom: 20,
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
  selectedContact: {
    backgroundColor: '#f0f9ff',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: {
    color: '#4338ca',
    fontWeight: '600',
    fontSize: 15,
  },
  inviteIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fbbf24',
    justifyContent: 'center',
    alignItems: 'center',
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
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
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});