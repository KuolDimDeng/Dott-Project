import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Share,
  Alert,
  Clipboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';
import walletService from '../../services/walletService';

export default function ReceiveMoneyScreen({ navigation, route }) {
  const { user } = useAuth();
  const provider = route.params?.provider || 'MTN_MOMO';
  
  const [wallet, setWallet] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const phoneNumber = user?.profile?.phone_number || user?.phone_number || '';

  useEffect(() => {
    loadWallet();
    loadRequests();
  }, []);

  const loadWallet = async () => {
    try {
      const walletData = await walletService.getWallet(provider);
      setWallet(walletData);
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const requestsData = await walletService.getTransferRequests('received');
      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPhone = () => {
    if (phoneNumber) {
      Clipboard.setString(phoneNumber);
      Alert.alert('Copied', 'Phone number copied to clipboard');
    }
  };

  const handleShare = async () => {
    try {
      const message = `Send me money via Dott Wallet!\n\nMy ${provider === 'MTN_MOMO' ? 'MTN Mobile Money' : 'M-Pesa'} number: ${phoneNumber}\n\nDownload Dott: https://dottapps.com`;
      
      await Share.share({
        message,
        title: 'Receive Money via Dott Wallet',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      setLoading(true);
      const result = await walletService.acceptRequest(requestId);
      Alert.alert(
        'Success',
        `Transfer completed! Reference: ${result.reference}`,
        [{ text: 'OK', onPress: loadRequests }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to accept request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
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
              await walletService.rejectRequest(requestId, 'Rejected by user');
              loadRequests();
            } catch (error) {
              Alert.alert('Error', 'Failed to reject request');
            }
          },
        },
      ]
    );
  };

  const qrData = JSON.stringify({
    type: 'wallet_receive',
    provider: provider,
    phone: phoneNumber,
    name: user?.full_name || user?.name,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive Money</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>Your Payment QR Code</Text>
          <Text style={styles.qrSubtitle}>Let others scan to send you money</Text>
          
          <View style={styles.qrContainer}>
            <QRCode
              value={qrData}
              size={200}
              backgroundColor="white"
              color="#047857"
            />
          </View>
          
          <View style={styles.providerBadge}>
            <Text style={styles.providerText}>
              {provider === 'MTN_MOMO' ? 'MTN Mobile Money' : 'M-Pesa'}
            </Text>
          </View>
        </View>

        {/* Phone Number Section */}
        <View style={styles.phoneSection}>
          <Text style={styles.phoneLabel}>Your Mobile Money Number</Text>
          <View style={styles.phoneContainer}>
            <Text style={styles.phoneNumber}>{phoneNumber || 'Not set'}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyPhone}>
              <Icon name="copy-outline" size={20} color="#047857" />
              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Icon name="share-outline" size={20} color="white" />
          <Text style={styles.shareButtonText}>Share Payment Details</Text>
        </TouchableOpacity>

        {/* Pending Requests */}
        {requests.length > 0 && (
          <View style={styles.requestsSection}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            {requests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestFrom}>
                    From: {request.requester_email || request.requester_phone}
                  </Text>
                  <Text style={styles.requestAmount}>
                    {walletService.formatAmount(request.amount, request.currency)}
                  </Text>
                </View>
                
                {request.description && (
                  <Text style={styles.requestDescription}>{request.description}</Text>
                )}
                
                <Text style={styles.requestTime}>
                  Expires: {new Date(request.expires_at).toLocaleString()}
                </Text>
                
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.rejectButton]}
                    onPress={() => handleRejectRequest(request.id)}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.requestButton, styles.acceptButton]}
                    onPress={() => handleAcceptRequest(request.id)}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>How to receive money:</Text>
          <View style={styles.instructionItem}>
            <Icon name="checkmark-circle" size={20} color="#047857" />
            <Text style={styles.instructionText}>
              Share your QR code or phone number
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Icon name="checkmark-circle" size={20} color="#047857" />
            <Text style={styles.instructionText}>
              Money will be added to your wallet instantly
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Icon name="checkmark-circle" size={20} color="#047857" />
            <Text style={styles.instructionText}>
              No fees for receiving money
            </Text>
          </View>
        </View>
      </ScrollView>
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
  qrSection: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  providerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#047857',
  },
  phoneSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 12,
  },
  phoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
  },
  copyText: {
    fontSize: 14,
    color: '#047857',
    marginLeft: 4,
    fontWeight: '500',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  requestsSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  requestCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  requestFrom: {
    fontSize: 14,
    color: '#4b5563',
  },
  requestAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#047857',
  },
  requestDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  requestTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  requestButton: {
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
  instructions: {
    backgroundColor: 'white',
    padding: 20,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
    flex: 1,
  },
});
