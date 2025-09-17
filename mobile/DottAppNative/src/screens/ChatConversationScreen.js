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
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import EmojiSelector from 'react-native-emoji-selector';
import chatApi from '../services/chatApi';
import callApi from '../services/callApi';

export default function ChatConversationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [websocket, setWebsocket] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const flatListRef = useRef(null);
  
  // Get conversation data from route params
  const { conversationId, recipientName, businessName, isGroup, members, memberCount, phoneNumber, sharedProduct } = route.params || {};

  useEffect(() => {
    if (conversationId) {
      loadMessages();
      setupWebSocket();
    }

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
    }

    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [conversationId, sharedProduct]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      console.log('📨 Loading messages for conversation:', conversationId);
      
      const response = await chatApi.getMessages(conversationId);
      const loadedMessages = response.results || [];
      
      // Transform backend messages to app format
      const transformedMessages = loadedMessages.map(msg => ({
        id: msg.id,
        text: msg.text_content || msg.content,
        sender: msg.sender_id === msg.conversation?.consumer_id ? 'me' : 'other',
        timestamp: new Date(msg.created_at),
        type: msg.message_type || 'text',
        image_url: msg.image_url,
        voice_url: msg.voice_url,
        video_url: msg.video_url,
      }));

      setMessages(transformedMessages.reverse()); // Reverse to show latest at bottom
      console.log('✅ Messages loaded:', transformedMessages.length);
      
      // Mark messages as read
      await chatApi.markAsRead(conversationId);
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    if (!conversationId) return;

    console.log('🔌 Setting up WebSocket for conversation:', conversationId);
    
    const ws = chatApi.createWebSocketConnection(
      conversationId,
      (data) => {
        console.log('📨 WebSocket message received:', data);
        
        if (data.type === 'message') {
          const newMessage = {
            id: data.message.id,
            text: data.message.text_content || data.message.content,
            sender: data.message.sender_id === data.message.conversation?.consumer_id ? 'me' : 'other',
            timestamp: new Date(data.message.created_at),
            type: data.message.message_type || 'text',
            image_url: data.message.image_url,
            voice_url: data.message.voice_url,
            video_url: data.message.video_url,
          };
          
          setMessages(prev => [...prev, newMessage]);
        } else if (data.type === 'typing') {
          setIsTyping(data.is_typing && data.user_id !== 'current_user_id'); // TODO: Get actual user ID
        }
      },
      () => console.log('✅ WebSocket connected'),
      () => console.log('🔌 WebSocket disconnected'),
      (error) => console.error('❌ WebSocket error:', error)
    );

    setWebsocket(ws);
  };

  const sendMessage = async () => {
    if (!message.trim() || !conversationId) return;

    const messageText = message.trim();
    setMessage('');

    try {
      console.log('📤 Sending message:', messageText);
      
      // Add message to local state immediately for better UX
      const tempMessage = {
        id: `temp_${Date.now()}`,
        text: messageText,
        sender: 'me',
        timestamp: new Date(),
        type: 'text',
        sending: true,
      };
      
      setMessages(prev => [...prev, tempMessage]);

      // Send to backend
      const result = await chatApi.sendMessage(conversationId, messageText);
      
      // Replace temp message with real message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? {
                ...msg,
                id: result.id,
                sending: false,
                timestamp: new Date(result.created_at),
              }
            : msg
        )
      );

      console.log('✅ Message sent successfully');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Remove failed message and show error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const initiateVoiceCall = async () => {
    if (isGroup) {
      Alert.alert('Group Call', 'Group calling is coming soon!');
      return;
    }

    if (!conversationId) {
      Alert.alert('Error', 'No active conversation for calling');
      return;
    }
    
    Alert.alert(
      'Start Voice Call',
      `Call ${recipientName || businessName || 'User'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: async () => {
            try {
              console.log('📞 Initiating voice call for conversation:', conversationId);
              
              // Use the real call API
              const result = await callApi.initiateCall(conversationId, 'voice');
              
              console.log('✅ Call initiated:', result);
              
              // Navigate to call screen or show in-app call interface
              if (result.session_id) {
                // TODO: Navigate to call screen with session details
                Alert.alert(
                  'Call Initiated',
                  'The call has been started. You should be connected shortly.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('❌ Error initiating call:', error);
              
              // Fallback to regular phone call
              Alert.alert(
                'Call Failed',
                'Unable to start in-app call. Would you like to call their phone number instead?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Call Phone', 
                    onPress: () => {
                      if (phoneNumber) {
                        const { Linking } = require('react-native');
                        Linking.openURL(`tel:${phoneNumber}`);
                      } else {
                        Alert.alert('Error', 'No phone number available');
                      }
                    }
                  },
                ]
              );
            }
          },
        },
      ]
    );
  };

  const initiateVideoCall = async () => {
    if (isGroup) {
      Alert.alert('Group Video Call', 'Group video calling is coming soon!');
      return;
    }

    if (!conversationId) {
      Alert.alert('Error', 'No active conversation for calling');
      return;
    }
    
    Alert.alert(
      'Start Video Call',
      `Video call ${recipientName || businessName || 'User'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: async () => {
            try {
              console.log('📹 Initiating video call for conversation:', conversationId);
              
              // Use the real call API
              const result = await callApi.initiateCall(conversationId, 'video');
              
              console.log('✅ Video call initiated:', result);
              
              // Navigate to call screen or show in-app video call interface
              if (result.session_id) {
                // TODO: Navigate to video call screen with session details
                Alert.alert(
                  'Video Call Initiated',
                  'The video call has been started. You should be connected shortly.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('❌ Error initiating video call:', error);
              
              // Fallback to voice call or phone call
              Alert.alert(
                'Video Call Failed',
                'Unable to start video call. Would you like to try a voice call instead?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Voice Call', 
                    onPress: () => initiateVoiceCall()
                  },
                ]
              );
            }
          },
        },
      ]
    );
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
        
        <TouchableOpacity 
          style={styles.emojiButton}
          onPress={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <Icon 
            name={showEmojiPicker ? "close-circle" : "happy-outline"} 
            size={24} 
            color="#6b7280" 
          />
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
      
      {/* Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <View style={styles.emojiModalContainer}>
          <TouchableOpacity 
            style={styles.emojiModalOverlay}
            activeOpacity={1}
            onPress={() => setShowEmojiPicker(false)}
          />
          <View style={styles.emojiPickerContainer}>
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerTitle}>Select Emoji</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <EmojiSelector 
              onEmojiSelected={(emoji) => {
                setMessage((prev) => prev + emoji);
                setShowEmojiPicker(false);
              }}
              showSearchBar={false}
              showTabs={true}
              showHistory={true}
              showSectionTitles={true}
              category={EmojiSelector.Categories.all}
              columns={8}
              placeholder="Search emoji..."
              theme="#2563eb"
            />
          </View>
        </View>
      </Modal>
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
  emojiButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  emojiModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  emojiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  emojiPickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  emojiPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});