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
  ActionSheetIOS,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import VoiceRecorder from '../components/chat/VoiceRecorder';
import LocationPicker from '../components/chat/LocationPicker';
import VoiceMessage from '../components/chat/VoiceMessage';
import LocationMessage from '../components/chat/LocationMessage';

export default function ConversationScreen({ route, navigation }) {
  const { conversationId, contact } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    // Load conversation messages
    loadMessages();
    
    // Set up navigation header
    navigation.setOptions({
      headerTitle: contact?.name || contact?.businessName || 'Chat',
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => Alert.alert('Voice Call', 'Voice calling coming soon!')}
          >
            <Icon name="call-outline" size={24} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => Alert.alert('Video Call', 'Video calling coming soon!')}
          >
            <Icon name="videocam-outline" size={24} color="#2563eb" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [conversationId, contact, navigation]);

  const loadMessages = () => {
    // Mock messages with different types for demonstration
    const mockMessages = [
      {
        id: '1',
        message_type: 'text',
        text_content: 'Hey! How are you doing?',
        sender: { id: 'other', name: contact?.name },
        sender_type: 'business',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        is_read: true,
      },
      {
        id: '2',
        message_type: 'text',
        text_content: 'I\'m good, thanks! Looking for some products.',
        sender: { id: user.id, name: user.name },
        sender_type: 'consumer',
        created_at: new Date(Date.now() - 3500000).toISOString(),
        is_read: true,
      },
      {
        id: '3',
        message_type: 'voice',
        voice_url: 'https://example.com/voice.m4a',
        voice_duration: 15,
        sender: { id: 'other', name: contact?.name },
        sender_type: 'business',
        created_at: new Date(Date.now() - 3000000).toISOString(),
        is_read: true,
      },
      {
        id: '4',
        message_type: 'location',
        location_latitude: 4.8594,
        location_longitude: 31.5713,
        location_address: 'Juba, Central Equatoria, South Sudan',
        location_type: 'current',
        sender: { id: user.id, name: user.name },
        sender_type: 'consumer',
        created_at: new Date(Date.now() - 2000000).toISOString(),
        is_read: true,
      },
    ];
    
    setMessages(mockMessages);
  };

  const sendTextMessage = async () => {
    if (!messageText.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      message_type: 'text',
      text_content: messageText.trim(),
      sender: { id: user.id, name: user.name },
      sender_type: 'consumer',
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageText('');
    scrollToBottom();

    // TODO: Send to backend API
    try {
      // await chatApi.sendMessage(conversationId, newMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const sendVoiceMessage = async (voiceData, duration) => {
    try {
      const newMessage = {
        id: Date.now().toString(),
        message_type: 'voice',
        voice_url: 'placeholder', // Would be replaced by backend response
        voice_duration: duration,
        sender: { id: user.id, name: user.name },
        sender_type: 'consumer',
        created_at: new Date().toISOString(),
        is_read: false,
      };

      setMessages(prev => [...prev, newMessage]);
      setShowVoiceRecorder(false);
      scrollToBottom();

      // TODO: Upload voice file to backend
      // const response = await chatApi.sendVoiceMessage(conversationId, voiceData);
      // Update message with actual voice URL
      
    } catch (error) {
      console.error('Failed to send voice message:', error);
      Alert.alert('Error', 'Failed to send voice message');
    }
  };

  const sendLocationMessage = async (locationData) => {
    try {
      const newMessage = {
        id: Date.now().toString(),
        message_type: 'location',
        location_latitude: locationData.location.latitude,
        location_longitude: locationData.location.longitude,
        location_address: locationData.location.address,
        location_name: locationData.location.name,
        location_type: locationData.location.type,
        location_expires_at: locationData.location.expiresAt,
        sender: { id: user.id, name: user.name },
        sender_type: 'consumer',
        created_at: new Date().toISOString(),
        is_read: false,
      };

      setMessages(prev => [...prev, newMessage]);
      setShowLocationPicker(false);
      scrollToBottom();

      // TODO: Send to backend API
      // await chatApi.sendLocationMessage(conversationId, locationData);
      
    } catch (error) {
      console.error('Failed to send location:', error);
      Alert.alert('Error', 'Failed to send location');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const showAttachmentOptions = () => {
    const options = [
      'Voice Message',
      'Share Location',
      'Camera',
      'Photo Library',
      'Cancel'
    ];
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 0:
              setShowVoiceRecorder(true);
              break;
            case 1:
              setShowLocationPicker(true);
              break;
            case 2:
              Alert.alert('Camera', 'Camera feature coming soon!');
              break;
            case 3:
              Alert.alert('Photo Library', 'Photo library feature coming soon!');
              break;
          }
        }
      );
    } else {
      // Android alternative - could use react-native-action-sheet
      Alert.alert(
        'Attach',
        'Choose an option',
        [
          { text: 'Voice Message', onPress: () => setShowVoiceRecorder(true) },
          { text: 'Share Location', onPress: () => setShowLocationPicker(true) },
          { text: 'Camera', onPress: () => Alert.alert('Camera', 'Camera feature coming soon!') },
          { text: 'Photo Library', onPress: () => Alert.alert('Photo Library', 'Photo library feature coming soon!') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const renderMessage = ({ item, index }) => {
    const isOwnMessage = item.sender.id === user.id;
    const showAvatar = !isOwnMessage && (index === 0 || messages[index - 1]?.sender.id !== item.sender.id);

    switch (item.message_type) {
      case 'voice':
        return (
          <View style={[styles.messageContainer, isOwnMessage && styles.ownMessageContainer]}>
            <VoiceMessage message={item} isOwnMessage={isOwnMessage} />
          </View>
        );
        
      case 'location':
        return (
          <View style={[styles.messageContainer, isOwnMessage && styles.ownMessageContainer]}>
            <LocationMessage message={item} isOwnMessage={isOwnMessage} />
          </View>
        );
        
      default:
        return (
          <View style={[styles.messageContainer, isOwnMessage && styles.ownMessageContainer]}>
            {showAvatar && !isOwnMessage && (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.sender.name?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={[
              styles.messageBubble,
              isOwnMessage ? styles.ownMessage : styles.otherMessage,
              !showAvatar && !isOwnMessage && styles.messageWithoutAvatar,
            ]}>
              <Text style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText
              ]}>
                {item.text_content}
              </Text>
              <Text style={[
                styles.messageTime,
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
              ]}>
                {new Date(item.created_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
          </View>
        );
    }
  };

  if (showVoiceRecorder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.voiceRecorderContainer}>
          <VoiceRecorder
            onSendVoiceMessage={sendVoiceMessage}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={showAttachmentOptions}
          >
            <Icon name="add" size={24} color="#6b7280" />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              messageText.trim() ? styles.sendButtonActive : styles.sendButtonInactive
            ]}
            onPress={sendTextMessage}
            disabled={!messageText.trim()}
          >
            <Icon 
              name="send" 
              size={20} 
              color={messageText.trim() ? "#ffffff" : "#9ca3af"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <LocationPicker
        visible={showLocationPicker}
        onSendLocation={sendLocationMessage}
        onCancel={() => setShowLocationPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  voiceRecorderContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 2,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 1,
  },
  messageWithoutAvatar: {
    marginLeft: 40,
  },
  ownMessage: {
    backgroundColor: '#2563eb',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#f3f4f6',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#9ca3af',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButtonActive: {
    backgroundColor: '#2563eb',
  },
  sendButtonInactive: {
    backgroundColor: '#f3f4f6',
  },
});