import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function ChatScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);

  useEffect(() => {
    // Load chats - in production this would come from API
    loadChats();
  }, []);

  useEffect(() => {
    // Filter chats based on search
    if (searchQuery) {
      const filtered = chats.filter(chat => {
        const name = chat.isGroup ? chat.groupName : chat.name;
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredChats(filtered);
    } else {
      setFilteredChats(chats);
    }
  }, [searchQuery, chats]);

  const loadChats = () => {
    // Mock data - in production, fetch from API
    const mockChats = [
      {
        id: '1',
        conversationId: 'conv_1',
        name: 'John Doe',
        businessName: 'Doe Electronics',
        lastMessage: 'Hey, how are you?',
        time: '10:30 AM',
        unread: 2,
        avatar: null,
        isGroup: false,
        isOnline: true,
        phoneNumber: '+1234567890',
      },
      {
        id: '2',
        conversationId: 'group_1',
        groupName: 'Family Group',
        members: ['Mom', 'Dad', 'Sister'],
        lastMessage: 'Mom: Dinner at 7pm',
        lastSender: 'Mom',
        time: '9:15 AM',
        unread: 5,
        avatar: null,
        isGroup: true,
        memberCount: 4,
      },
      {
        id: '3',
        conversationId: 'conv_2',
        name: 'Customer Support',
        businessName: 'Dott Support',
        lastMessage: 'Your issue has been resolved',
        time: 'Yesterday',
        unread: 0,
        avatar: null,
        isGroup: false,
        isOnline: false,
        phoneNumber: '+1234567891',
      },
      {
        id: '4',
        conversationId: 'group_2',
        groupName: 'Work Team',
        members: ['Alice', 'Bob', 'Charlie'],
        lastMessage: 'Alice: Meeting postponed to 3pm',
        lastSender: 'Alice',
        time: '2 days ago',
        unread: 0,
        avatar: null,
        isGroup: true,
        memberCount: 8,
      },
    ];
    setChats(mockChats);
    setFilteredChats(mockChats);
  };

  const handleChatPress = (item) => {
    navigation.navigate('Conversation', {
      conversationId: item.conversationId,
      contact: {
        id: item.id,
        name: item.isGroup ? item.groupName : item.name,
        businessName: item.businessName,
        phoneNumber: item.phoneNumber,
        isGroup: item.isGroup,
        members: item.members,
        memberCount: item.memberCount,
        isOnline: item.isOnline,
      },
    });
  };

  const handleNewChat = () => {
    navigation.navigate('NewChat');
  };

  const handleDeleteChat = (item) => {
    Alert.alert(
      'Delete Chat',
      `Delete chat with ${item.isGroup ? item.groupName : item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setChats(chats.filter(chat => chat.id !== item.id));
          },
        },
      ]
    );
  };

  const getInitials = (item) => {
    if (item.isGroup) {
      return item.groupName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return item.name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem} 
      onPress={() => handleChatPress(item)}
      onLongPress={() => handleDeleteChat(item)}
    >
      <View style={styles.avatarContainer}>
        {item.isGroup ? (
          <View style={[styles.avatar, styles.groupAvatar]}>
            <Icon name="people" size={24} color="white" />
          </View>
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item)}</Text>
            {item.isOnline && <View style={styles.onlineIndicator} />}
          </View>
        )}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.isGroup ? item.groupName : item.name}
          </Text>
          <Text style={[styles.chatTime, item.unread > 0 && styles.unreadTime]}>
            {item.time}
          </Text>
        </View>
        
        <View style={styles.chatFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.isGroup && item.lastSender ? `${item.lastSender}: ` : ''}
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unread}</Text>
            </View>
          )}
        </View>
        
        {item.isGroup && (
          <Text style={styles.groupMembers} numberOfLines={1}>
            {item.memberCount} members
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="camera-outline" size={24} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleNewChat}>
            <Icon name="create-outline" size={24} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={item => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="chatbubbles-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Chats</Text>
            <Text style={styles.emptyText}>
              Start a new conversation or create a group
            </Text>
            <TouchableOpacity style={styles.startChatButton} onPress={handleNewChat}>
              <Text style={styles.startChatButtonText}>Start Chat</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleNewChat}>
        <Icon name="chatbubble-ellipses" size={24} color="white" />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 4,
    marginLeft: 12,
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
  listContent: {
    paddingTop: 12,
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatar: {
    backgroundColor: '#10b981',
  },
  avatarText: {
    color: '#4338ca',
    fontWeight: '600',
    fontSize: 18,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: 'white',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  unreadTime: {
    color: '#10b981',
    fontWeight: '600',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  groupMembers: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
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
  startChatButton: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startChatButtonText: {
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
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});