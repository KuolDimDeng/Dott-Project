import React, { useState, useEffect } from 'react';
import { AppState, Alert } from 'react-native';
import IncomingCallScreen from '../screens/IncomingCallScreen';
import ActiveCallScreen from '../screens/ActiveCallScreen';
import webRTCService from '../services/webrtcService';
import callApi from '../services/callApi';
import { useAuth } from '../context/AuthContext';

// WebSocket service for real-time call events
class CallWebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.onIncomingCall = null;
    this.onWebRTCData = null;
    this.onCallEnded = null;
  }

  connect(url, sessionId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('🟢 Call WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Authenticate
      this.send({
        type: 'auth',
        session_id: sessionId,
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ Call WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('🔴 Call WebSocket disconnected');
      this.reconnect(url, sessionId);
    };
  }

  handleMessage(data) {
    console.log('📨 Call WebSocket message:', data.type);

    switch (data.type) {
      case 'incoming_call':
        if (this.onIncomingCall) {
          this.onIncomingCall(data);
        }
        break;

      case 'webrtc_offer':
      case 'webrtc_answer':
      case 'webrtc_ice_candidate':
        if (this.onWebRTCData) {
          this.onWebRTCData(data);
        }
        break;

      case 'call_ended':
        if (this.onCallEnded) {
          this.onCallEnded(data);
        }
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, queuing message');
    }
  }

  reconnect(url, sessionId) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

    setTimeout(() => {
      this.connect(url, sessionId);
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const callWebSocketService = new CallWebSocketService();

export default function CallManager({ children }) {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    // Connect to WebSocket when component mounts
    if (user?.sessionId) {
      const wsUrl = `wss://dott-api-staging.onrender.com/ws/calls/?token=${user.sessionId}`;
      callWebSocketService.connect(wsUrl, user.sessionId);

      // Set up WebSocket event handlers
      callWebSocketService.onIncomingCall = handleIncomingCall;
      callWebSocketService.onWebRTCData = handleWebRTCData;
      callWebSocketService.onCallEnded = handleCallEnded;
    }

    // Handle app state changes
    const appStateListener = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      callWebSocketService.disconnect();
      appStateListener.remove();
    };
  }, [user]);

  const handleAppStateChange = (nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App came to foreground');
      // Reconnect WebSocket if needed
    }
    setAppState(nextAppState);
  };

  const handleIncomingCall = (data) => {
    console.log('📞 Incoming call:', data);
    
    // Check if we're already in a call
    if (activeCall) {
      // Auto-decline if in another call
      callApi.declineCall(data.conversationId, data.sessionId);
      return;
    }

    setIncomingCall({
      sessionId: data.session_id,
      conversationId: data.conversation_id,
      callType: data.call_type,
      callerName: data.caller_name,
      callerImage: data.caller_image,
      businessName: data.business_name,
      offerSdp: data.offer_sdp,
    });
  };

  const handleWebRTCData = async (data) => {
    console.log('🎯 WebRTC data received:', data.type);

    if (data.type === 'webrtc_answer' && webRTCService.isInitiator) {
      // Set remote answer for outgoing call
      await webRTCService.setRemoteAnswer(data.answer_sdp);
    } else if (data.type === 'webrtc_ice_candidate') {
      // Add ICE candidate
      await webRTCService.addIceCandidate(data.candidate);
    }
  };

  const handleCallEnded = (data) => {
    console.log('📞 Call ended:', data);
    webRTCService.endCall();
    setActiveCall(null);
    setIncomingCall(null);
  };

  const handleAcceptCall = () => {
    console.log('✅ Call accepted');
    setActiveCall(incomingCall);
    setIncomingCall(null);
  };

  const handleDeclineCall = () => {
    console.log('❌ Call declined');
    setIncomingCall(null);
  };

  const handleEndCall = () => {
    console.log('📞 Ending call');
    setActiveCall(null);
  };

  // Function to initiate an outgoing call
  const initiateCall = async (conversationId, callType = 'voice', recipientInfo) => {
    try {
      // Create WebRTC offer
      const { sessionId, offer } = await webRTCService.initiateCall(conversationId, callType);
      
      // Initiate call via API
      const response = await callApi.initiateCall(conversationId, callType);
      
      // Send offer via API
      await callApi.updateWebRTCData(conversationId, sessionId, 'offer', offer);
      
      // Set up ICE candidate handler
      webRTCService.onIceCandidate = async (candidate) => {
        await callApi.updateWebRTCData(conversationId, sessionId, 'ice_candidate', candidate);
      };
      
      // Set active call
      setActiveCall({
        sessionId: sessionId,
        conversationId: conversationId,
        callType: callType,
        callerName: recipientInfo.name,
        callerImage: recipientInfo.image,
        businessName: recipientInfo.businessName,
        isOutgoing: true,
      });
      
      return true;
    } catch (error) {
      console.error('Error initiating call:', error);
      Alert.alert('Call Failed', 'Unable to start the call. Please try again.');
      return false;
    }
  };

  // Expose initiateCall method globally
  global.initiateCall = initiateCall;

  return (
    <>
      {children}
      
      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallScreen
          visible={true}
          callData={incomingCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onClose={handleDeclineCall}
        />
      )}
      
      {/* Active Call Modal */}
      {activeCall && (
        <ActiveCallScreen
          visible={true}
          callData={activeCall}
          onEndCall={handleEndCall}
          onClose={handleEndCall}
        />
      )}
    </>
  );
}