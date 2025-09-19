import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function LocationMessage({ message, isOwnMessage }) {
  const location = message.location_data || {
    latitude: message.location_latitude,
    longitude: message.location_longitude,
    address: message.location_address,
    name: message.location_name,
    type: message.location_type,
    expiresAt: message.location_expires_at,
  };

  if (!location.latitude || !location.longitude) {
    return (
      <View style={[
        styles.container,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <Text style={styles.errorText}>Location not available</Text>
      </View>
    );
  }

  const openInMaps = () => {
    const { latitude, longitude } = location;
    
    Alert.alert(
      'Open Location',
      'Choose how to open this location:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Apple Maps',
          onPress: () => {
            const url = `maps://app?saddr=&daddr=${latitude},${longitude}`;
            Linking.canOpenURL(url).then(supported => {
              if (supported) {
                Linking.openURL(url);
              } else {
                openInGoogleMaps();
              }
            });
          },
        },
        {
          text: 'Google Maps',
          onPress: openInGoogleMaps,
        },
      ]
    );
  };

  const openInGoogleMaps = () => {
    const { latitude, longitude } = location;
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    Linking.openURL(googleMapsUrl);
  };

  const getLocationTypeIcon = () => {
    switch (location.type) {
      case 'live':
        return 'radio';
      case 'pin':
        return 'pin';
      default:
        return 'location';
    }
  };

  const getLocationTypeColor = () => {
    switch (location.type) {
      case 'live':
        return '#10b981';
      case 'pin':
        return '#f59e0b';
      default:
        return '#2563eb';
    }
  };

  const isLiveLocationExpired = () => {
    if (location.type !== 'live' || !location.expiresAt) return false;
    return new Date(location.expiresAt) < new Date();
  };

  const formatAddress = () => {
    if (location.name && location.address) {
      return `${location.name}\n${location.address}`;
    }
    return location.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  };

  const getLiveLocationStatus = () => {
    if (location.type !== 'live') return null;
    
    if (isLiveLocationExpired()) {
      return {
        text: 'Location sharing ended',
        color: '#9ca3af',
        icon: 'radio-outline',
      };
    }
    
    const expiresAt = new Date(location.expiresAt);
    const now = new Date();
    const hoursLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60));
    
    return {
      text: `Live for ${hoursLeft}h more`,
      color: '#10b981',
      icon: 'radio',
    };
  };

  const liveStatus = getLiveLocationStatus();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}
      onPress={openInMaps}
      activeOpacity={0.8}
    >
      {/* Map Preview Placeholder */}
      <View style={styles.mapPreview}>
        <Icon 
          name={getLocationTypeIcon()} 
          size={32} 
          color={getLocationTypeColor()} 
        />
        <View style={styles.coordinatesOverlay}>
          <Text style={styles.coordinatesText}>
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        </View>
      </View>

      {/* Location Info */}
      <View style={styles.locationInfo}>
        <View style={styles.locationHeader}>
          <Icon 
            name={getLocationTypeIcon()} 
            size={16} 
            color={getLocationTypeColor()} 
          />
          <Text style={[
            styles.locationTypeText,
            { color: getLocationTypeColor() }
          ]}>
            {location.type === 'live' ? 'Live Location' : 
             location.type === 'pin' ? 'Custom Location' : 'Current Location'}
          </Text>
        </View>

        <Text style={[
          styles.addressText,
          isOwnMessage ? styles.ownText : styles.otherText
        ]}>
          {formatAddress()}
        </Text>

        {/* Live location status */}
        {liveStatus && (
          <View style={styles.liveStatusContainer}>
            <Icon name={liveStatus.icon} size={12} color={liveStatus.color} />
            <Text style={[styles.liveStatusText, { color: liveStatus.color }]}>
              {liveStatus.text}
            </Text>
          </View>
        )}

        {/* Tap to open hint */}
        <View style={styles.actionHint}>
          <Icon 
            name="open-outline" 
            size={12} 
            color={isOwnMessage ? 'rgba(255,255,255,0.7)' : '#9ca3af'} 
          />
          <Text style={[
            styles.actionHintText,
            isOwnMessage ? styles.ownActionHint : styles.otherActionHint
          ]}>
            Tap to open in Maps
          </Text>
        </View>

        {/* Timestamp */}
        {message.created_at && (
          <Text style={[
            styles.timestampText,
            isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp
          ]}>
            {new Date(message.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    borderRadius: 18,
    overflow: 'hidden',
    marginVertical: 2,
  },
  ownMessage: {
    backgroundColor: '#2563eb',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#f3f4f6',
    alignSelf: 'flex-start',
  },
  mapPreview: {
    height: 120,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  coordinatesOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  coordinatesText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  locationInfo: {
    padding: 12,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationTypeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  addressText: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  ownText: {
    color: '#ffffff',
  },
  otherText: {
    color: '#1a1a1a',
  },
  liveStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveStatusText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionHintText: {
    fontSize: 11,
    marginLeft: 4,
  },
  ownActionHint: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherActionHint: {
    color: '#9ca3af',
  },
  timestampText: {
    fontSize: 10,
    textAlign: 'right',
  },
  ownTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherTimestamp: {
    color: '#9ca3af',
  },
  errorText: {
    padding: 12,
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
});