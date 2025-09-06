import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Image,
} from 'react-native';
import {
  RTCView,
} from 'react-native-webrtc';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import webRTCService from '../services/webrtcService';
import callApi from '../services/callApi';

export default function ActiveCallScreen({ 
  visible, 
  callData,
  onEndCall,
  onClose 
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callData?.callType === 'video');
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isEnding, setIsEnding] = useState(false);
  
  const durationInterval = useRef(null);

  useEffect(() => {
    if (visible) {
      // Start call duration timer
      durationInterval.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Set up WebRTC streams
      setupStreams();
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [visible]);

  const setupStreams = () => {
    // Get local stream from WebRTC service
    if (webRTCService.localStream) {
      setLocalStream(webRTCService.localStream.toURL());
    }

    // Set up remote stream callback
    webRTCService.onRemoteStream = (stream) => {
      setRemoteStream(stream.toURL());
    };

    // Set up call ended callback
    webRTCService.onCallEnded = () => {
      handleEndCall();
    };
  };

  const handleEndCall = async () => {
    try {
      setIsEnding(true);
      
      // Clear timer
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }

      // End call via API
      if (callData?.conversationId && callData?.sessionId) {
        await callApi.endCall(callData.conversationId, callData.sessionId);
      }

      // End WebRTC session
      webRTCService.endCall();

      if (onEndCall) {
        onEndCall();
      }
    } catch (error) {
      console.error('Error ending call:', error);
      setIsEnding(false);
    }
  };

  const toggleMute = () => {
    const muted = webRTCService.toggleMute();
    setIsMuted(muted);
  };

  const toggleSpeaker = () => {
    const speakerOn = webRTCService.toggleSpeaker();
    setIsSpeakerOn(speakerOn);
  };

  const toggleVideo = async () => {
    const videoOn = await webRTCService.toggleVideo();
    setIsVideoOn(videoOn);
  };

  const switchCamera = async () => {
    await webRTCService.switchCamera();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!visible || !callData) {
    return null;
  }

  const isVideoCall = callData.callType === 'video';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Video Views */}
        {isVideoCall && (
          <>
            {/* Remote Video (Full Screen) */}
            {remoteStream ? (
              <RTCView
                streamURL={remoteStream}
                style={styles.remoteVideo}
                objectFit="cover"
              />
            ) : (
              <View style={styles.remoteVideoPlaceholder}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {callData.callerName ? callData.callerName[0].toUpperCase() : '?'}
                  </Text>
                </View>
                <Text style={styles.connectingText}>Connecting...</Text>
              </View>
            )}

            {/* Local Video (Picture-in-Picture) */}
            {localStream && isVideoOn && (
              <TouchableOpacity 
                style={styles.localVideo}
                onPress={switchCamera}
                activeOpacity={0.8}
              >
                <RTCView
                  streamURL={localStream}
                  style={styles.localVideoView}
                  objectFit="cover"
                  zOrder={1}
                  mirror={true}
                />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Voice Call UI */}
        {!isVideoCall && (
          <LinearGradient
            colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
            style={styles.voiceCallContainer}
          >
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.voiceCallContent}>
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
                  </View>
                  
                  <Text style={styles.callerName}>
                    {callData.callerName || 'Unknown'}
                  </Text>
                  
                  <Text style={styles.callStatus}>
                    {callDuration > 0 ? formatDuration(callDuration) : 'Connecting...'}
                  </Text>
                </View>
              </View>
            </SafeAreaView>
          </LinearGradient>
        )}

        {/* Call Controls Overlay */}
        <SafeAreaView style={styles.controlsOverlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.callInfo}>
              <Text style={styles.callInfoName}>{callData.callerName || 'Unknown'}</Text>
              <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
            </View>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {/* Primary Controls */}
            <View style={styles.primaryControls}>
              {/* Mute Button */}
              <TouchableOpacity
                style={[styles.controlButton, isMuted && styles.activeButton]}
                onPress={toggleMute}
              >
                <Icon 
                  name={isMuted ? 'mic-off' : 'mic'} 
                  size={24} 
                  color={isMuted ? '#ef4444' : 'white'} 
                />
              </TouchableOpacity>

              {/* Video Toggle (for video calls) */}
              {isVideoCall && (
                <TouchableOpacity
                  style={[styles.controlButton, !isVideoOn && styles.activeButton]}
                  onPress={toggleVideo}
                >
                  <Icon 
                    name={isVideoOn ? 'videocam' : 'videocam-off'} 
                    size={24} 
                    color={isVideoOn ? 'white' : '#ef4444'} 
                  />
                </TouchableOpacity>
              )}

              {/* Speaker Button */}
              <TouchableOpacity
                style={[styles.controlButton, isSpeakerOn && styles.activeButton]}
                onPress={toggleSpeaker}
              >
                <Icon 
                  name={isSpeakerOn ? 'volume-high' : 'volume-medium'} 
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>

              {/* Add Person Button */}
              <TouchableOpacity style={styles.controlButton}>
                <Icon name="person-add-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* End Call Button */}
            <TouchableOpacity
              style={styles.endCallButton}
              onPress={handleEndCall}
              disabled={isEnding}
            >
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.endCallGradient}
              >
                <Icon name="call" size={30} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
  },
  remoteVideoPlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideo: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 120,
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  localVideoView: {
    flex: 1,
  },
  voiceCallContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  voiceCallContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callerInfo: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  avatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 60,
    color: 'white',
    fontWeight: 'bold',
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 18,
    color: '#9ca3af',
  },
  connectingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 10,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  callInfo: {
    alignItems: 'center',
  },
  callInfoName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  callDuration: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 4,
  },
  bottomControls: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingBottom: 30,
    paddingTop: 20,
    alignItems: 'center',
  },
  primaryControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  activeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  endCallButton: {
    marginTop: 10,
  },
  endCallGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
});