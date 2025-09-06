import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/environment';

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.sessionId = null;
    this.conversationId = null;
    this.isInitiator = false;
    this.callType = 'voice'; // 'voice' or 'video'
    this.onRemoteStream = null;
    this.onCallEnded = null;
    this.onIceCandidate = null;
    
    // ICE servers configuration (you can add TURN servers here)
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN servers if needed:
        // {
        //   urls: 'turn:your-turn-server.com:3478',
        //   username: 'username',
        //   credential: 'password'
        // }
      ],
    };
  }

  // Initialize WebRTC for an outgoing call
  async initiateCall(conversationId, callType = 'voice') {
    try {
      console.log('🎯 Initiating', callType, 'call for conversation:', conversationId);
      
      this.conversationId = conversationId;
      this.callType = callType;
      this.isInitiator = true;
      
      // Start InCallManager
      InCallManager.start({ media: callType });
      InCallManager.setKeepScreenOn(true);
      
      // Get local media stream
      await this.setupLocalStream();
      
      // Create peer connection
      await this.createPeerConnection();
      
      // Create offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      
      await this.peerConnection.setLocalDescription(offer);
      
      // Generate session ID
      this.sessionId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        sessionId: this.sessionId,
        offer: offer.sdp,
        callType: this.callType,
      };
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      this.cleanup();
      throw error;
    }
  }

  // Accept an incoming call
  async acceptCall(sessionId, offerSdp, callType = 'voice') {
    try {
      console.log('🎯 Accepting', callType, 'call with session:', sessionId);
      
      this.sessionId = sessionId;
      this.callType = callType;
      this.isInitiator = false;
      
      // Start InCallManager
      InCallManager.start({ media: callType });
      InCallManager.setKeepScreenOn(true);
      
      // Get local media stream
      await this.setupLocalStream();
      
      // Create peer connection
      await this.createPeerConnection();
      
      // Set remote offer
      const offer = new RTCSessionDescription({
        type: 'offer',
        sdp: offerSdp,
      });
      await this.peerConnection.setRemoteDescription(offer);
      
      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      return {
        answer: answer.sdp,
      };
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      this.cleanup();
      throw error;
    }
  }

  // Set remote answer (for call initiator)
  async setRemoteAnswer(answerSdp) {
    try {
      console.log('🎯 Setting remote answer');
      
      const answer = new RTCSessionDescription({
        type: 'answer',
        sdp: answerSdp,
      });
      
      await this.peerConnection.setRemoteDescription(answer);
      console.log('✅ Remote answer set successfully');
    } catch (error) {
      console.error('❌ Error setting remote answer:', error);
      throw error;
    }
  }

  // Add ICE candidate
  async addIceCandidate(candidate) {
    try {
      if (this.peerConnection && candidate) {
        console.log('🎯 Adding ICE candidate');
        const iceCandidate = new RTCIceCandidate(candidate);
        await this.peerConnection.addIceCandidate(iceCandidate);
      }
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  }

  // Setup local media stream
  async setupLocalStream() {
    try {
      const constraints = {
        audio: true,
        video: this.callType === 'video' ? {
          mandatory: {
            minWidth: 640,
            minHeight: 480,
            minFrameRate: 30,
          },
          facingMode: 'user',
        } : false,
      };

      const stream = await mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      console.log('✅ Local stream obtained');
      return stream;
    } catch (error) {
      console.error('❌ Error getting local stream:', error);
      throw error;
    }
  }

  // Create peer connection
  async createPeerConnection() {
    try {
      this.peerConnection = new RTCPeerConnection(this.configuration);
      
      // Add local stream tracks to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }
      
      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('🎯 Remote track received');
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          if (this.onRemoteStream) {
            this.onRemoteStream(event.streams[0]);
          }
        }
      };
      
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.onIceCandidate) {
          console.log('🎯 ICE candidate generated');
          this.onIceCandidate(event.candidate);
        }
      };
      
      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('🎯 Connection state:', this.peerConnection.connectionState);
        
        if (this.peerConnection.connectionState === 'failed' || 
            this.peerConnection.connectionState === 'disconnected') {
          this.handleCallEnd();
        }
      };
      
      console.log('✅ Peer connection created');
    } catch (error) {
      console.error('❌ Error creating peer connection:', error);
      throw error;
    }
  }

  // Toggle audio mute
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // Return mute state
      }
    }
    return false;
  }

  // Toggle speaker
  toggleSpeaker() {
    InCallManager.setSpeakerphoneOn(!InCallManager.speakerphoneOn);
    return InCallManager.speakerphoneOn;
  }

  // Toggle video
  async toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // Switch camera (front/back)
  async switchCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack._switchCamera();
      }
    }
  }

  // End call
  endCall() {
    console.log('🎯 Ending call');
    this.handleCallEnd();
  }

  // Handle call end
  handleCallEnd() {
    this.cleanup();
    if (this.onCallEnded) {
      this.onCallEnded();
    }
  }

  // Cleanup resources
  cleanup() {
    console.log('🎯 Cleaning up WebRTC resources');
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Stop remote stream
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Stop InCallManager
    InCallManager.stop();
    InCallManager.setKeepScreenOn(false);
    
    // Reset state
    this.sessionId = null;
    this.conversationId = null;
    this.isInitiator = false;
  }

  // Get call duration
  async getCallStats() {
    if (this.peerConnection) {
      const stats = await this.peerConnection.getStats();
      return stats;
    }
    return null;
  }
}

// Create singleton instance
const webRTCService = new WebRTCService();
export default webRTCService;