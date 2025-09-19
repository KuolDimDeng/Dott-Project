import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Audio } from 'expo-av';

export default function VoiceMessage({ message, isOwnMessage }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(message.voice_duration * 1000 || 0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  const sound = useRef(null);

  useEffect(() => {
    return () => {
      if (sound.current) {
        sound.current.unloadAsync();
      }
    };
  }, []);

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playVoiceMessage = async () => {
    try {
      if (isPlaying) {
        // Stop current playback
        if (sound.current) {
          await sound.current.stopAsync();
          setIsPlaying(false);
          setPlaybackPosition(0);
        }
        return;
      }

      if (!message.voice_url) {
        Alert.alert('Error', 'Voice message not available');
        return;
      }

      setIsLoading(true);

      // Unload any previous sound
      if (sound.current) {
        await sound.current.unloadAsync();
      }

      // Load and play new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: message.voice_url },
        {
          shouldPlay: true,
          progressUpdateIntervalMillis: 100,
        }
      );

      sound.current = newSound;
      setIsPlaying(true);
      setIsLoading(false);

      // Set up playback status listener
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPosition(status.positionMillis || 0);
          setPlaybackDuration(status.durationMillis || playbackDuration);
          
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlaybackPosition(0);
          }
        }
        
        if (status.error) {
          console.error('Playback error:', status.error);
          setIsPlaying(false);
          setIsLoading(false);
          Alert.alert('Error', 'Could not play voice message');
        }
      });

    } catch (error) {
      console.error('Error playing voice message:', error);
      setIsLoading(false);
      setIsPlaying(false);
      Alert.alert('Error', 'Could not play voice message');
    }
  };

  const seekToPosition = async (position) => {
    if (sound.current && playbackDuration > 0) {
      try {
        await sound.current.setPositionAsync(position);
        setPlaybackPosition(position);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  };

  const progressPercentage = playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0;

  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownMessage : styles.otherMessage
    ]}>
      <TouchableOpacity
        style={[
          styles.playButton,
          isOwnMessage ? styles.ownPlayButton : styles.otherPlayButton
        ]}
        onPress={playVoiceMessage}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator 
            size="small" 
            color={isOwnMessage ? "#ffffff" : "#2563eb"} 
          />
        ) : (
          <Icon 
            name={isPlaying ? 'pause' : 'play'} 
            size={20} 
            color={isOwnMessage ? "#ffffff" : "#2563eb"} 
          />
        )}
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        {/* Waveform visualization placeholder */}
        <View style={styles.waveform}>
          {[...Array(20)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.waveformBar,
                {
                  height: Math.random() * 20 + 10,
                  backgroundColor: index * 5 < progressPercentage 
                    ? (isOwnMessage ? "#ffffff" : "#2563eb")
                    : (isOwnMessage ? "rgba(255,255,255,0.4)" : "rgba(37,99,235,0.3)")
                }
              ]}
            />
          ))}
        </View>

        <View style={styles.timeContainer}>
          <Text style={[
            styles.timeText,
            isOwnMessage ? styles.ownTimeText : styles.otherTimeText
          ]}>
            {formatTime(isPlaying ? playbackPosition : playbackDuration)}
          </Text>
          
          {message.created_at && (
            <Text style={[
              styles.timestampText,
              isOwnMessage ? styles.ownTimestampText : styles.otherTimestampText
            ]}>
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          )}
        </View>
      </View>

      {/* Speed control for long messages */}
      {playbackDuration > 30000 && (
        <TouchableOpacity style={styles.speedButton}>
          <Text style={[
            styles.speedText,
            isOwnMessage ? styles.ownSpeedText : styles.otherSpeedText
          ]}>
            1x
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    maxWidth: '80%',
    minWidth: 200,
  },
  ownMessage: {
    backgroundColor: '#2563eb',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#f3f4f6',
    alignSelf: 'flex-start',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ownPlayButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  otherPlayButton: {
    backgroundColor: '#e5e7eb',
  },
  waveformContainer: {
    flex: 1,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    marginBottom: 4,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
    marginHorizontal: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ownTimeText: {
    color: '#ffffff',
  },
  otherTimeText: {
    color: '#2563eb',
  },
  timestampText: {
    fontSize: 10,
  },
  ownTimestampText: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherTimestampText: {
    color: '#9ca3af',
  },
  speedButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  speedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ownSpeedText: {
    color: '#ffffff',
  },
  otherSpeedText: {
    color: '#2563eb',
  },
});