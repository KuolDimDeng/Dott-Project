import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Vibration,
  Modal,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import webRTCService from '../services/webrtcService';
import callApi from '../services/callApi';

export default function IncomingCallScreen({ 
  visible, 
  callData, 
  onAccept, 
  onDecline,
  onClose 
}) {
  const [isAnswering, setIsAnswering] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  useEffect(() => {
    if (visible) {
      // Start vibration pattern for incoming call
      const pattern = [0, 1000, 1000, 1000];
      Vibration.vibrate(pattern, true);
    } else {
      // Stop vibration when modal is closed
      Vibration.cancel();
    }

    return () => {
      Vibration.cancel();
    };
  }, [visible]);

  const handleAccept = async () => {
    try {
      setIsAnswering(true);
      Vibration.cancel();
      
      // Accept call via API
      await callApi.acceptCall(callData.conversationId, callData.sessionId);
      
      // Setup WebRTC
      const { answer } = await webRTCService.acceptCall(
        callData.sessionId,
        callData.offerSdp,
        callData.callType
      );
      
      // Send answer back to caller
      await callApi.updateWebRTCData(
        callData.conversationId,
        callData.sessionId,
        'answer',
        answer
      );
      
      if (onAccept) {
        onAccept();
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      setIsAnswering(false);
    }
  };

  const handleDecline = async () => {
    try {
      setIsDeclining(true);
      Vibration.cancel();
      
      // Decline call via API
      await callApi.declineCall(callData.conversationId, callData.sessionId);
      
      if (onDecline) {
        onDecline();
      }
    } catch (error) {
      console.error('Error declining call:', error);
      setIsDeclining(false);
    }
  };

  if (!visible || !callData) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            {/* Call Type Indicator */}
            <View style={styles.callTypeContainer}>
              <Icon 
                name={callData.callType === 'video' ? 'videocam' : 'call'} 
                size={20} 
                color="white" 
              />
              <Text style={styles.callTypeText}>
                Incoming {callData.callType === 'video' ? 'Video' : 'Voice'} Call
              </Text>
            </View>

            {/* Caller Info */}
            <View style={styles.callerInfo}>
              <View style={styles.avatarContainer}>
                {callData.callerImage ? (
                  <Image source={{ uri: callData.callerImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {callData.callerName ? callData.callerName[0].toUpperCase() : '?'}
                    </Text>
                  </View>
                )}
                
                {/* Animated ring effect */}
                <View style={[styles.ringAnimation, styles.ring1]} />
                <View style={[styles.ringAnimation, styles.ring2]} />
                <View style={[styles.ringAnimation, styles.ring3]} />
              </View>

              <Text style={styles.callerName}>
                {callData.callerName || 'Unknown Caller'}
              </Text>
              
              {callData.businessName && (
                <Text style={styles.businessName}>{callData.businessName}</Text>
              )}
              
              <Text style={styles.callingText}>is calling...</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={handleDecline}
                disabled={isDeclining || isAnswering}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.buttonGradient}
                >
                  <Icon name="close" size={30} color="white" />
                </LinearGradient>
                <Text style={styles.actionText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAccept}
                disabled={isAnswering || isDeclining}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.buttonGradient}
                >
                  <Icon 
                    name={callData.callType === 'video' ? 'videocam' : 'call'} 
                    size={30} 
                    color="white" 
                  />
                </LinearGradient>
                <Text style={styles.actionText}>Accept</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Message Option */}
            <TouchableOpacity style={styles.messageOption}>
              <Icon name="chatbubble-outline" size={20} color="#9ca3af" />
              <Text style={styles.messageText}>Send a quick message</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  callTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  callTypeText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 8,
  },
  callerInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarText: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  ringAnimation: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ring1: {
    animation: 'pulse 2s infinite',
    transform: [{ scale: 1.2 }],
  },
  ring2: {
    animation: 'pulse 2s infinite',
    animationDelay: '0.5s',
    transform: [{ scale: 1.4 }],
  },
  ring3: {
    animation: 'pulse 2s infinite',
    animationDelay: '1s',
    transform: [{ scale: 1.6 }],
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 18,
    color: '#9ca3af',
    marginBottom: 8,
  },
  callingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    marginBottom: 30,
  },
  actionButton: {
    alignItems: 'center',
  },
  buttonGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionText: {
    color: 'white',
    marginTop: 8,
    fontSize: 14,
  },
  messageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  messageText: {
    color: '#9ca3af',
    marginLeft: 8,
    fontSize: 14,
  },
});