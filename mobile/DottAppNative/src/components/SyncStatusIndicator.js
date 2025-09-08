import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useMenuContext } from '../context/MenuContext';

const SyncStatusIndicator = ({ onPress }) => {
  const { syncStatus, lastSyncTime, failedSyncs, retrySyncFailedItems } = useMenuContext();

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return <Icon name="checkmark-circle" size={20} color="#10b981" />;
      case 'syncing':
        return <ActivityIndicator size="small" color="#3b82f6" />;
      case 'error':
        return <Icon name="alert-circle" size={20} color="#ef4444" />;
      case 'offline':
        return <Icon name="cloud-offline" size={20} color="#6b7280" />;
      default:
        return <Icon name="help-circle" size={20} color="#6b7280" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'synced':
        return 'All items synced';
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return `${failedSyncs.length} items failed to sync`;
      case 'offline':
        return 'Offline mode';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'synced':
        return '#10b981';
      case 'syncing':
        return '#3b82f6';
      case 'error':
        return '#ef4444';
      case 'offline':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const formatSyncTime = () => {
    if (!lastSyncTime) return '';
    
    const now = new Date();
    const diff = now - new Date(lastSyncTime);
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handlePress = () => {
    if (syncStatus === 'error' && failedSyncs.length > 0) {
      retrySyncFailedItems();
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { borderColor: getStatusColor() }]}
      onPress={handlePress}
      disabled={syncStatus === 'syncing'}
    >
      <View style={styles.statusRow}>
        {getStatusIcon()}
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
      {lastSyncTime && syncStatus === 'synced' && (
        <Text style={styles.timeText}>
          Last sync: {formatSyncTime()}
        </Text>
      )}
      {syncStatus === 'error' && failedSyncs.length > 0 && (
        <Text style={styles.retryText}>
          Tap to retry
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  retryText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default SyncStatusIndicator;