import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';

const MessagesScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/chat/conversations/');
      if (response.data) {
        setConversations(response.data.results || response.data);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Fallback to mock data
      setConversations([
        {
          id: 1,
          name: 'John Smith',
          lastMessage: 'Thanks for the invoice!',
          timestamp: '2 min ago',
          unread: 2,
          avatar: null,
          type: 'customer',
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          lastMessage: 'When can we schedule the meeting?',
          timestamp: '1 hour ago',
          unread: 0,
          avatar: null,
          type: 'team',
        },
        {
          id: 3,
          name: 'Mike Williams',
          lastMessage: 'Order #1234 has been delivered',
          timestamp: '3 hours ago',
          unread: 1,
          avatar: null,
          type: 'vendor',
        },
        {
          id: 4,
          name: 'Emily Davis',
          lastMessage: 'Project update sent',
          timestamp: 'Yesterday',
          unread: 0,
          avatar: null,
          type: 'team',
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages/`);
      if (response.data) {
        setMessages(response.data.results || response.data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      // Fallback to mock messages
      setMessages([
        {
          id: 1,
          text: 'Hi, I received the invoice',
          sender: 'other',
          timestamp: '10:30 AM',
          read: true,
        },
        {
          id: 2,
          text: 'Great! Let me know if you have any questions',
          sender: 'me',
          timestamp: '10:32 AM',
          read: true,
        },
        {
          id: 3,
          text: 'Everything looks good',
          sender: 'other',
          timestamp: '10:35 AM',
          read: true,
        },
        {
          id: 4,
          text: 'Thanks for the invoice!',
          sender: 'other',
          timestamp: '10:36 AM',
          read: true,
        },
      ]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const tempMessage = {
      id: Date.now(),
      text: newMessage,
      sender: 'me',
      timestamp: 'Now',
      read: false,
    };

    setMessages([...messages, tempMessage]);
    setNewMessage('');
    setSending(true);

    try {
      await api.post(`/chat/conversations/${selectedConversation.id}/messages/`, {
        text: newMessage,
      });
      
      // Update conversation list
      const updatedConversations = conversations.map(conv => {
        if (conv.id === selectedConversation.id) {
          return {
            ...conv,
            lastMessage: newMessage,
            timestamp: 'Now',
          };
        }
        return conv;
      });
      setConversations(updatedConversations);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = () => {
    Alert.alert(
      'New Conversation',
      'Start a new conversation with:',
      [
        { text: 'Customer', onPress: () => console.log('New customer chat') },
        { text: 'Team Member', onPress: () => console.log('New team chat') },
        { text: 'Vendor', onPress: () => console.log('New vendor chat') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getConversationIcon = (type) => {
    switch (type) {
      case 'customer':
        return 'person';
      case 'team':
        return 'people';
      case 'vendor':
        return 'business';
      default:
        return 'chatbubble';
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        selectedConversation?.id === item.id && styles.selectedConversation,
      ]}
      onPress={() => setSelectedConversation(item)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: '#2563eb' }]}>
            <Icon name={getConversationIcon(item.type)} size={24} color="white" />
          </View>
        )}
        {item.unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        )}
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>{item.name}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'me' ? styles.myMessage : styles.otherMessage,
    ]}>
      <View style={[
        styles.messageBubble,
        item.sender === 'me' ? styles.myBubble : styles.otherBubble,
      ]}>
        <Text style={[
          styles.messageText,
          item.sender === 'me' ? styles.myMessageText : styles.otherMessageText,
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.messageTime,
          item.sender === 'me' ? styles.myMessageTime : styles.otherMessageTime,
        ]}>
          {item.timestamp}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={handleNewConversation}>
          <Icon name="create-outline" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {/* Conversations List */}
        <View style={styles.conversationsList}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <FlatList
            data={filteredConversations}
            renderItem={renderConversation}
            keyExtractor={item => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={loadConversations} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="chatbubbles-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No conversations yet</Text>
              </View>
            }
          />
        </View>

        {/* Chat View */}
        {selectedConversation ? (
          <KeyboardAvoidingView
            style={styles.chatContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderInfo}>
                <Text style={styles.chatName}>{selectedConversation.name}</Text>
                <Text style={styles.chatStatus}>Active now</Text>
              </View>
              <TouchableOpacity>
                <Icon name="information-circle-outline" size={24} color="#2563eb" />
              </TouchableOpacity>
            </View>

            <FlatList
              ref={scrollViewRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id.toString()}
              style={styles.messagesList}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
            />

            <View style={styles.inputContainer}>
              <TouchableOpacity style={styles.attachButton}>
                <Icon name="attach" size={24} color="#666" />
              </TouchableOpacity>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxHeight={100}
              />
              <TouchableOpacity
                style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!newMessage.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Icon name="send" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.noChatSelected}>
            <Icon name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.noChatText}>Select a conversation to start messaging</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

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
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  conversationsList: {
    width: '35%',
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#e1e8ed',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedConversation: {
    backgroundColor: '#f0f7ff',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
  },
  unreadText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chatStatus: {
    fontSize: 12,
    color: '#22c55e',
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
    padding: 15,
  },
  messageContainer: {
    marginBottom: 15,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  attachButton: {
    padding: 10,
  },
  messageInput: {
    flex: 1,
    marginHorizontal: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  noChatSelected: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  noChatText: {
    marginTop: 15,
    fontSize: 16,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});

export default MessagesScreen;