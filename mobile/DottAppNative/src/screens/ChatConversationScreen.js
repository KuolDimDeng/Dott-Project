import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function ChatConversationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);
  
  // Get conversation data from route params
  const { conversationId, recipientName, businessName, isGroup, members, memberCount, phoneNumber, sharedProduct } = route.params || {};

  useEffect(() => {
    // Handle shared product if present
    if (sharedProduct) {
      const productMessage = {
        id: `product_${Date.now()}`,
        type: 'product',
        product: sharedProduct,
        sender: 'me',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, productMessage]);
    } else {
      // Load mock messages for demo
      setMessages([
      {
        id: '1',
        text: 'Hello! How can I help you today?',
        sender: 'other',
        timestamp: new Date(Date.now() - 3600000),
      },
      {
        id: '2',
        text: 'Hi! I wanted to ask about your services',
        sender: 'me',
        timestamp: new Date(Date.now() - 3000000),
      },
      {
        id: '3',
        text: 'Sure! What would you like to know?',
        sender: 'other',
        timestamp: new Date(Date.now() - 2400000),
      },
    ]);
    }
  }, [sharedProduct]);

  const initiateVoiceCall = () => {
    if (isGroup) {
      Alert.alert('Group Call', 'Group calling is coming soon!');
      return;
    }
    
    Alert.alert(
      'Start Voice Call',
      `Call ${recipientName || 'User'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: async () => {
            // Use the global initiateCall function from CallManager
            if (global.initiateCall) {
              const callStarted = await global.initiateCall(
                conversationId || 'demo-conversation-id',
                'voice',
                {
                  name: recipientName || 'Unknown User',
                  businessName: businessName,
                  phoneNumber: phoneNumber,
                  image: null,
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

  const initiateVideoCall = () => {
    if (isGroup) {
      Alert.alert('Group Video Call', 'Group video calling is coming soon!');
      return;
    }
    
    Alert.alert(
      'Start Video Call',
      `Video call ${recipientName || 'User'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: async () => {
            // Use the global initiateCall function from CallManager
            if (global.initiateCall) {
              const callStarted = await global.initiateCall(
                conversationId || 'demo-conversation-id',
                'video',
                {
                  name: recipientName || 'Unknown User',
                  businessName: businessName,
                  phoneNumber: phoneNumber,
                  image: null,
                }
              );
              
              if (!callStarted) {
                Alert.alert('Call Failed', 'Unable to start the video call. Please try again.');
              }
            } else {
              Alert.alert('Error', 'Call service not available. Please restart the app.');
            }
          },
        },
      ]
    );
  };

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        text: message.trim(),
        sender: 'me',
        timestamp: new Date(),
      };
      
      setMessages([...messages, newMessage]);
      setMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // Simulate typing indicator
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        // Simulate response
        const response = {
          id: (Date.now() + 1).toString(),
          text: 'Thanks for your message! I\'ll get back to you soon.',
          sender: 'other',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, response]);
      }, 2000);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender === 'me';
    
    // Handle product messages
    if (item.type === 'product' && item.product) {
      return (
        <View style={[styles.messageContainer, isMe && styles.myMessageContainer]}>
          <TouchableOpacity 
            style={[styles.productMessage, isMe ? styles.myProductMessage : styles.otherProductMessage]}
            onPress={() => navigation.navigate('ProductDetail', {
              product: item.product,
              businessId: item.product.businessId,
              businessName: item.product.businessName,
            })}
          >
            <View style={styles.productCard}>
              <View style={styles.productImageContainer}>
                <Icon name="cube-outline" size={40} color="#6b7280" />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.product.name}</Text>
                <Text style={styles.productPrice}>${item.product.price}</Text>
                <Text style={styles.productBusiness} numberOfLines={1}>{item.product.businessName}</Text>
              </View>
            </View>
            <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
              {item.timestamp.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Regular text message
    return (
      <View style={[styles.messageContainer, isMe && styles.myMessageContainer]}>
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
          <Text style={[styles.messageText, isMe && styles.myMessageText]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
            {item.timestamp.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{recipientName || 'Chat'}</Text>
          {isGroup ? (
            <Text style={styles.headerStatus}>{memberCount || members?.length || 0} members</Text>
          ) : businessName ? (
            <Text style={styles.headerStatus}>{businessName}</Text>
          ) : null}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={initiateVoiceCall} style={styles.headerButton}>
            <Icon name="call" size={22} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity onPress={initiateVideoCall} style={styles.headerButton}>
            <Icon name="videocam" size={24} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="ellipsis-vertical" size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
        
        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>{recipientName || 'User'} is typing...</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton}>
          <Icon name="attach" size={24} color="#6b7280" />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          multiline
          maxHeight={100}
        />
        
        <TouchableOpacity 
          style={[styles.sendButton, message.trim() && styles.sendButtonActive]}
          onPress={sendMessage}
          disabled={!message.trim()}
        >
          <Icon 
            name="send" 
            size={20} 
            color={message.trim() ? '#2563eb' : '#9ca3af'} 
          />
        </TouchableOpacity>
      </View>
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
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerStatus: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 4,
    alignItems: 'flex-start',
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  myMessage: {
    backgroundColor: '#2563eb',
  },
  otherMessage: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  messageTime: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  productMessage: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  myProductMessage: {
    backgroundColor: '#2563eb',
  },
  otherProductMessage: {
    backgroundColor: 'white',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productImageContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 2,
  },
  productBusiness: {
    fontSize: 12,
    color: '#6b7280',
  },
  typingIndicator: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
  },
  sendButtonActive: {
    transform: [{ scale: 1.1 }],
  },
});