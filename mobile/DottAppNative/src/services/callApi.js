import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import ENV from '../config/environment';

const API_BASE_URL = ENV.apiUrl;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const sessionId = await AsyncStorage.getItem('sessionId');
    if (sessionId) {
      config.headers.Authorization = `Session ${sessionId}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const callApi = {
  // Initiate a call
  initiateCall: async (conversationId, callType = 'voice') => {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/initiate_call/`, {
        call_type: callType,
      });
      return response.data;
    } catch (error) {
      console.error('Error initiating call:', error.response?.data || error.message);
      throw error;
    }
  },

  // Accept a call
  acceptCall: async (conversationId, sessionId) => {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/accept_call/`, {
        session_id: sessionId,
      });
      return response.data;
    } catch (error) {
      console.error('Error accepting call:', error.response?.data || error.message);
      throw error;
    }
  },

  // Decline a call
  declineCall: async (conversationId, sessionId) => {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/decline_call/`, {
        session_id: sessionId,
      });
      return response.data;
    } catch (error) {
      console.error('Error declining call:', error.response?.data || error.message);
      throw error;
    }
  },

  // End a call
  endCall: async (conversationId, sessionId) => {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/end_call/`, {
        session_id: sessionId,
      });
      return response.data;
    } catch (error) {
      console.error('Error ending call:', error.response?.data || error.message);
      throw error;
    }
  },

  // Update WebRTC data (offer/answer/ICE candidates)
  updateWebRTCData: async (conversationId, sessionId, dataType, data) => {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/update_webrtc_data/`, {
        session_id: sessionId,
        data_type: dataType, // 'offer', 'answer', or 'ice_candidate'
        data: data,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating WebRTC data:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get call history
  getCallHistory: async () => {
    try {
      const response = await api.get('/chat/conversations/call_history/');
      return response.data;
    } catch (error) {
      console.error('Error fetching call history:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get active call session
  getActiveCallSession: async (conversationId) => {
    try {
      const response = await api.get(`/api/chat/conversations/${conversationId}/active_call/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching active call session:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default callApi;