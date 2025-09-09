import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import walletService from '../../services/walletService';

export default function WalletRequestsScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('received');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await walletService.getTransferRequests(activeTab);
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, [activeTab]);

  const handleAccept = async (request) => {
    Alert.alert(
      'Accept Request',
      `Send ${walletService.formatAmount(request.amount, request.currency)} to ${request.requester_email || request.requester_phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await walletService.acceptRequest(request.id);
              Alert.alert('Success', 'Transfer completed successfully');
              loadRequests();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to accept request');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (request) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await walletService.rejectRequest(request.id, 'Rejected by user');
              loadRequests();
            } catch (error) {
              Alert.alert('Error', 'Failed to reject request');
            }
          },
        },
      ]
    );
  };

  const handleCancel = async (request) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await walletService.cancelRequest(request.id);
              loadRequests();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel request');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'accepted':
        return '#047857';
      case 'rejected':
        return '#ef4444';
      case 'expired':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const renderRequest = ({ item }) => {
    const isReceived = activeTab === 'received';
    const isPending = item.status === 'pending';
    const statusColor = getStatusColor(item.status);

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.requestIcon}>
            <Icon 
              name={isReceived ? 'arrow-down-circle' : 'arrow-up-circle'} 
              size={32} 
              color={isReceived ? '#047857' : '#ef4444'} 
            />
          </View>
          <View style={styles.requestInfo}>
            <Text style={styles.requestTitle}>
              {isReceived ? 'Request from' : 'Request to'}
            </Text>
            <Text style={styles.requestContact}>
              {isReceived 
                ? (item.requester_email || item.requester_phone)
                : (item.recipient_email || item.recipient_phone)}
            </Text>
            {item.description && (
              <Text style={styles.requestDescription}>{item.description}</Text>
            )}
          </View>
          <View style={styles.requestAmountContainer}>
            <Text style={styles.requestAmount}>
              {walletService.formatAmount(item.amount, item.currency)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.requestFooter}>
          <Text style={styles.requestTime}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
          {item.expires_at && item.status === 'pending' && (
            <Text style={styles.expiryTime}>
              Expires: {new Date(item.expires_at).toLocaleString()}
            </Text>
          )}
        </View>

        {isPending && (
          <View style={styles.actionButtons}>
            {isReceived ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleReject(item)}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleAccept(item)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleCancel(item)}
              >
                <Text style={styles.cancelButtonText}>Cancel Request</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="time-outline" size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No Requests</Text>
      <Text style={styles.emptyText}>
        {activeTab === 'received' 
          ? "You haven't received any transfer requests"
          : "You haven't sent any transfer requests"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfer Requests</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Received
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#047857" />
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.listContainer}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#047857',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#047857',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  requestIcon: {
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  requestContact: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  requestAmountContainer: {
    alignItems: 'flex-end',
  },
  requestAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  requestFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  requestTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  expiryTime: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#fee2e2',
  },
  rejectButtonText: {
    color: '#ef4444',
    fontWeight: '500',
  },
  acceptButton: {
    backgroundColor: '#047857',
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#fef3c7',
  },
  cancelButtonText: {
    color: '#f59e0b',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});