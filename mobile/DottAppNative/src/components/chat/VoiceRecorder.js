import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');

export default function VoiceRecorder({ onSendVoiceMessage, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(null);
  const sound = useRef(null);
  const durationTimer = useRef(null);

  useEffect(() => {
    setupAudio();
    return () => {
      cleanup();
    };
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Failed to setup audio:', error);
      Alert.alert('Error', 'Could not setup audio recording');
    }
  };

  const cleanup = () => {
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
    }
    if (pulseAnimation.current) {
      pulseAnimation.current.stop();
    }
    if (sound.current) {
      sound.current.unloadAsync();
    }
    if (recording) {
      recording.stopAndUnloadAsync();
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant microphone permission to record voice messages');
        return;
      }

      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(recordingOptions);
      await newRecording.startAsync();

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start pulse animation
      startPulseAnimation();

      // Start duration timer
      durationTimer.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          // Auto-stop at 5 minutes (300 seconds)
          if (newDuration >= 300) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Could not start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      setIsRecording(false);
      
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
        durationTimer.current = null;
      }

      if (pulseAnimation.current) {
        pulseAnimation.current.stop();
        animatedValue.setValue(0);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);

      // Get recording info
      const info = await FileSystem.getInfoAsync(uri);
      console.log('Recording saved:', info);

      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Could not stop recording');
    }
  };

  const startPulseAnimation = () => {
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.current.start();
  };

  const playRecording = async () => {
    try {
      if (!recordingUri) return;

      if (sound.current) {
        await sound.current.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true }
      );

      sound.current = newSound;
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPosition(status.positionMillis || 0);
          setPlaybackDuration(status.durationMillis || 0);
          
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlaybackPosition(0);
          }
        }
      });

    } catch (error) {
      console.error('Failed to play recording:', error);
    }
  };

  const stopPlaying = async () => {
    try {
      if (sound.current) {
        await sound.current.stopAsync();
        setIsPlaying(false);
        setPlaybackPosition(0);
      }
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  };

  const sendVoiceMessage = async () => {
    if (!recordingUri) return;

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('voice_file', {
        uri: recordingUri,
        type: 'audio/m4a',
        name: `voice_${Date.now()}.m4a`,
      });
      formData.append('duration', recordingDuration.toString());

      await onSendVoiceMessage(formData, recordingDuration);
      
      // Reset state
      setRecordingUri(null);
      setRecordingDuration(0);
      setPlaybackPosition(0);
      setPlaybackDuration(0);
      
    } catch (error) {
      console.error('Failed to send voice message:', error);
      Alert.alert('Error', 'Could not send voice message');
    }
  };

  const cancelRecording = () => {
    if (recording) {
      recording.stopAndUnloadAsync();
      setRecording(null);
    }
    
    cleanup();
    setIsRecording(false);
    setRecordingUri(null);
    setRecordingDuration(0);
    onCancel();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMilliseconds = (ms) => {
    const seconds = Math.floor(ms / 1000);
    return formatTime(seconds);
  };

  if (recordingUri) {
    // Playback mode
    return (
      <View style={styles.container}>
        <View style={styles.playbackContainer}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={isPlaying ? stopPlaying : playRecording}
          >
            <Icon 
              name={isPlaying ? 'pause' : 'play'} 
              size={24} 
              color="#2563eb" 
            />
          </TouchableOpacity>
          
          <View style={styles.waveformContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progress, 
                  { 
                    width: playbackDuration > 0 
                      ? `${(playbackPosition / playbackDuration) * 100}%` 
                      : '0%' 
                  }
                ]} 
              />
            </View>
            <Text style={styles.durationText}>
              {formatTime(recordingDuration)}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={cancelRecording}
          >
            <Icon name="trash-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendVoiceMessage}
          >
            <Icon name="send" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Recording mode
  return (
    <View style={styles.container}>
      <View style={styles.recordingContainer}>
        {isRecording && (
          <Animated.View 
            style={[
              styles.pulseRing,
              {
                opacity: animatedValue,
                transform: [{
                  scale: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.3],
                  }),
                }],
              }
            ]} 
          />
        )}
        
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordingActive
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          onLongPress={isRecording ? null : startRecording}
        >
          <Icon 
            name={isRecording ? 'stop' : 'mic'} 
            size={32} 
            color="#ffffff" 
          />
        </TouchableOpacity>
        
        {isRecording && (
          <View style={styles.recordingInfo}>
            <Text style={styles.recordingText}>Recording...</Text>
            <Text style={styles.durationText}>
              {formatTime(recordingDuration)}
            </Text>
          </View>
        )}
      </View>

      {isRecording && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={cancelRecording}
        >
          <Icon name="close" size={24} color="#ef4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playbackContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  recordingActive: {
    backgroundColor: '#ef4444',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ef4444',
    opacity: 0.3,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginRight: 12,
  },
  progress: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  recordingInfo: {
    marginLeft: 16,
    alignItems: 'center',
  },
  recordingText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  durationText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});