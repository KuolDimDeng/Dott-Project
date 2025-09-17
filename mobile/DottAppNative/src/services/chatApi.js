/**
 * Chat API Service for real-time messaging
 * Integrates with Django backend chat system
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/environment';

class ChatApiService {
  constructor() {
    this.baseURL = `${ENV.apiUrl}/api/chat`;
    this.wsBaseURL = `${ENV.wsUrl}/ws/chat`;
  }

  /**
   * Get auth headers for API requests
   */
  async getAuthHeaders() {
    try {
      const sessionToken = await AsyncStorage.getItem('@auth:session_token');
      return {
        'Content-Type': 'application/json',
        'Authorization': sessionToken ? `Bearer ${sessionToken}` : '',
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {
        'Content-Type': 'application/json',
      };
    }
  }

  /**
   * Start a new conversation with a business
   */
  async startConversation(businessId, initialMessage = '') {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseURL}/conversations/start_conversation/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          business_id: businessId,
          message: initialMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Conversation started:', data);
      return data;
    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for the current user
   */
  async getConversations(mode = 'consumer') {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseURL}/conversations/?mode=${mode}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Conversations loaded:', data.results?.length);
      return data.results || [];
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
      return [];
    }
  }

  /**
   * Get conversation details by ID
   */
  async getConversation(conversationId) {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseURL}/conversations/${conversationId}/`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Conversation details loaded:', conversationId);
      return data;
    } catch (error) {
      console.error('❌ Error loading conversation:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId, page = 1, pageSize = 50) {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(
        `${this.baseURL}/messages/?conversation=${conversationId}&page=${page}&page_size=${pageSize}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Messages loaded:', data.results?.length);
      return data;
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      return { results: [], count: 0 };
    }
  }

  /**
   * Send a text message
   */
  async sendMessage(conversationId, text, messageType = 'text') {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseURL}/messages/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversation: conversationId,
          text_content: text,
          message_type: messageType,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Message sent:', data);
      return data;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId) {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseURL}/conversations/${conversationId}/mark_read/`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Messages marked as read:', conversationId);
      return data;
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Upload an image to a conversation
   */
  async uploadImage(conversationId, imageFile, caption = '') {
    try {
      const headers = await this.getAuthHeaders();
      delete headers['Content-Type']; // Let FormData set the content type
      
      const formData = new FormData();
      formData.append('image', {
        uri: imageFile.uri,
        type: imageFile.type || 'image/jpeg',
        name: imageFile.name || `image_${Date.now()}.jpg`,
      });
      
      if (caption) {
        formData.append('caption', caption);
      }

      const response = await fetch(`${this.baseURL}/conversations/${conversationId}/upload-image/`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Image uploaded:', data);
      return data;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Upload a voice note to a conversation
   */
  async uploadVoiceNote(conversationId, audioFile) {
    try {
      const headers = await this.getAuthHeaders();
      delete headers['Content-Type']; // Let FormData set the content type
      
      const formData = new FormData();
      formData.append('audio', {
        uri: audioFile.uri,
        type: audioFile.type || 'audio/m4a',
        name: audioFile.name || `voice_${Date.now()}.m4a`,
      });

      const response = await fetch(`${this.baseURL}/conversations/${conversationId}/upload-voice/`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Voice note uploaded:', data);
      return data;
    } catch (error) {
      console.error('❌ Error uploading voice note:', error);
      throw error;
    }
  }

  /**
   * Create WebSocket connection for real-time messaging
   */
  createWebSocketConnection(conversationId, onMessage, onOpen, onClose, onError) {
    try {
      const wsUrl = `${this.wsBaseURL}/${conversationId}/`;
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = (event) => {
        console.log('✅ WebSocket connected:', conversationId);
        if (onOpen) onOpen(event);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data);
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', conversationId, event.code);
        if (onClose) onClose(event);
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        if (onError) onError(error);
      };
      
      return ws;
    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      if (onError) onError(error);
      return null;
    }
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(websocket, isTyping = true) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping,
      }));
    }
  }

  /**
   * Get conversation by business ID (helper function)
   */
  async getConversationByBusinessId(businessId) {
    try {
      const conversations = await this.getConversations('consumer');
      return conversations.find(conv => conv.business?.id === businessId || conv.business_id === businessId);
    } catch (error) {
      console.error('❌ Error finding conversation by business ID:', error);
      return null;
    }
  }
}

export default new ChatApiService();