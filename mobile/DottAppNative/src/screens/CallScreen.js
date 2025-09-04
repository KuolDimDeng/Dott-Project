import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function CallScreen() {
  const [activeTab, setActiveTab] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const recentCalls = [
    { id: '1', name: 'John Doe', number: '+1 555-0123', time: '10:30 AM', type: 'outgoing', missed: false },
    { id: '2', name: 'Jane Smith', number: '+1 555-0124', time: '9:15 AM', type: 'incoming', missed: true },
    { id: '3', name: 'Bob Johnson', number: '+1 555-0125', time: 'Yesterday', type: 'incoming', missed: false },
  ];

  const contacts = [
    { id: '1', name: 'Alice Brown', number: '+1 555-0126' },
    { id: '2', name: 'Charlie Wilson', number: '+1 555-0127' },
    { id: '3', name: 'David Lee', number: '+1 555-0128' },
  ];

  const renderCallItem = ({ item }) => (
    <TouchableOpacity style={styles.callItem}>
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
        <TouchableOpacity style={styles.infoButton}>
          <Icon name="information-circle-outline" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderContactItem = ({ item }) => (
    <TouchableOpacity style={styles.contactItem}>
      <View style={styles.contactAvatar}>
        <Text style={styles.avatarText}>
          {item.name.split(' ').map(n => n[0]).join('')}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactNumber}>{item.number}</Text>
      </View>
      <TouchableOpacity style={styles.callButton}>
        <Icon name="call" size={20} color="#2563eb" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calls</Text>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search calls or contacts"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
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
        />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={item => item.id}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContent}
        />
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
  infoButton: {
    padding: 4,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#4338ca',
    fontWeight: '600',
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
  callButton: {
    padding: 8,
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