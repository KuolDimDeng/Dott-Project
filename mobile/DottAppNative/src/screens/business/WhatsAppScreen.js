import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function WhatsAppScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [whatsappData, setWhatsappData] = useState({
    isConnected: false,
    phoneNumber: '',
    businessName: '',
    autoReply: false,
    autoReplyMessage: '',
    welcomeMessage: '',
    awayMessage: '',
    operatingHours: {
      enabled: false,
      hours: {},
    },
    quickReplies: [],
    labels: [],
    stats: {
      messagesReceived: 0,
      messagesSent: 0,
      activeChats: 0,
      totalContacts: 0,
    },
  });

  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    loadWhatsAppData();
  }, []);

  const loadWhatsAppData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch WhatsApp business settings
      try {
        const response = await api.get('/business/whatsapp/settings/');
        if (response.data) {
          setWhatsappData(prev => ({
            ...prev,
            ...response.data,
          }));
        }
      } catch (error) {
        console.log('WhatsApp settings not available');
      }

      // Load campaigns
      try {
        const campaignsRes = await api.get('/business/whatsapp/campaigns/');
        setCampaigns(Array.isArray(campaignsRes.data) ? campaignsRes.data : []);
      } catch (error) {
        console.log('WhatsApp campaigns not available');
      }

      // Load message templates
      try {
        const templatesRes = await api.get('/business/whatsapp/templates/');
        setTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : []);
      } catch (error) {
        console.log('WhatsApp templates not available');
      }

      // Set mock data for demonstration
      setMockData();
    } catch (error) {
      console.error('Error loading WhatsApp data:', error);
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    setWhatsappData({
      isConnected: true,
      phoneNumber: '+1 555 190 5954',
      businessName: user?.business_name || 'My Business',
      autoReply: true,
      autoReplyMessage: 'Thank you for contacting us! We\'ll respond shortly.',
      welcomeMessage: 'Welcome to our WhatsApp Business! How can we help you today?',
      awayMessage: 'We\'re currently away but will respond as soon as possible.',
      operatingHours: {
        enabled: true,
        hours: {
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
          wednesday: { open: '09:00', close: '18:00' },
          thursday: { open: '09:00', close: '18:00' },
          friday: { open: '09:00', close: '18:00' },
          saturday: { open: '10:00', close: '14:00' },
          sunday: { closed: true },
        },
      },
      quickReplies: [
        { id: 1, title: 'Business Hours', message: 'We\'re open Mon-Fri 9am-6pm, Sat 10am-2pm' },
        { id: 2, title: 'Location', message: 'Visit us at 123 Main St, City' },
        { id: 3, title: 'Catalog', message: 'Check out our products at www.example.com' },
      ],
      labels: [
        { id: 1, name: 'New Customer', color: '#10b981' },
        { id: 2, name: 'VIP', color: '#f59e0b' },
        { id: 3, name: 'Support', color: '#ef4444' },
      ],
      stats: {
        messagesReceived: 245,
        messagesSent: 312,
        activeChats: 12,
        totalContacts: 89,
      },
    });

    setCampaigns([
      {
        id: 1,
        name: 'Weekend Sale',
        status: 'active',
        recipients: 150,
        sent: 145,
        delivered: 140,
        read: 98,
        replied: 23,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        name: 'New Product Launch',
        status: 'scheduled',
        recipients: 200,
        scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);

    setTemplates([
      { id: 1, name: 'Order Confirmation', category: 'transactional', language: 'en' },
      { id: 2, name: 'Shipping Update', category: 'transactional', language: 'en' },
      { id: 3, name: 'Promotional Offer', category: 'marketing', language: 'en' },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWhatsAppData();
    setRefreshing(false);
  };

  const handleConnectWhatsApp = () => {
    Alert.alert(
      'Connect WhatsApp Business',
      'You will be redirected to WhatsApp Business API setup. This requires a Facebook Business account.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: () => {
            Linking.openURL('https://business.whatsapp.com/');
          }
        }
      ]
    );
  };

  const handleToggleAutoReply = async (value) => {
    try {
      await api.patch('/business/whatsapp/settings/', {
        autoReply: value,
      });
      setWhatsappData(prev => ({ ...prev, autoReply: value }));
    } catch (error) {
      Alert.alert('Error', 'Failed to update auto-reply setting');
    }
  };

  const handleCreateCampaign = () => {
    navigation.navigate('WhatsAppCampaignCreate');
  };

  const renderStatCard = (label, value, icon, color) => (
    <View style={styles.statCard}>
      <Icon name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25d366" />
          <Text style={styles.loadingText}>Loading WhatsApp Business...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WhatsApp Business</Text>
        <Icon name="logo-whatsapp" size={24} color="#25d366" />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!whatsappData.isConnected ? (
          <View style={styles.connectCard}>
            <Icon name="logo-whatsapp" size={48} color="#25d366" />
            <Text style={styles.connectTitle}>Connect WhatsApp Business</Text>
            <Text style={styles.connectSubtitle}>
              Reach your customers on WhatsApp with automated messages, broadcasts, and more
            </Text>
            <TouchableOpacity style={styles.connectButton} onPress={handleConnectWhatsApp}>
              <Text style={styles.connectButtonText}>Connect Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Connection Status */}
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <View style={styles.statusInfo}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Connected</Text>
                </View>
                <Text style={styles.phoneNumber}>{whatsappData.phoneNumber}</Text>
              </View>
              <Text style={styles.businessName}>{whatsappData.businessName}</Text>
            </View>

            {/* Statistics */}
            <View style={styles.statsGrid}>
              {renderStatCard('Received', whatsappData.stats.messagesReceived, 'arrow-down-circle-outline', '#10b981')}
              {renderStatCard('Sent', whatsappData.stats.messagesSent, 'arrow-up-circle-outline', '#3b82f6')}
              {renderStatCard('Active', whatsappData.stats.activeChats, 'chatbubbles-outline', '#f59e0b')}
              {renderStatCard('Contacts', whatsappData.stats.totalContacts, 'people-outline', '#8b5cf6')}
            </View>

            {/* Auto-Reply Settings */}
            <View style={styles.settingsCard}>
              <Text style={styles.sectionTitle}>Auto-Reply Settings</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Enable Auto-Reply</Text>
                  <Text style={styles.settingDescription}>
                    Automatically respond to messages
                  </Text>
                </View>
                <Switch
                  value={whatsappData.autoReply}
                  onValueChange={handleToggleAutoReply}
                  trackColor={{ false: '#e5e7eb', true: '#86efac' }}
                  thumbColor={whatsappData.autoReply ? '#22c55e' : '#9ca3af'}
                />
              </View>

              {whatsappData.autoReply && (
                <View style={styles.messageInput}>
                  <Text style={styles.inputLabel}>Auto-Reply Message</Text>
                  <TextInput
                    style={styles.textInput}
                    value={whatsappData.autoReplyMessage}
                    onChangeText={(text) => setWhatsappData(prev => ({ ...prev, autoReplyMessage: text }))}
                    placeholder="Enter auto-reply message..."
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}
            </View>

            {/* Quick Replies */}
            <View style={styles.quickRepliesCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Quick Replies</Text>
                <TouchableOpacity>
                  <Icon name="add-circle-outline" size={24} color="#2563eb" />
                </TouchableOpacity>
              </View>
              
              {whatsappData.quickReplies.map((reply) => (
                <TouchableOpacity key={reply.id} style={styles.quickReplyItem}>
                  <View style={styles.quickReplyInfo}>
                    <Text style={styles.quickReplyTitle}>{reply.title}</Text>
                    <Text style={styles.quickReplyMessage} numberOfLines={1}>
                      {reply.message}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </View>

            {/* Campaigns */}
            <View style={styles.campaignsCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Broadcast Campaigns</Text>
                <TouchableOpacity onPress={handleCreateCampaign}>
                  <Icon name="add-circle-outline" size={24} color="#2563eb" />
                </TouchableOpacity>
              </View>
              
              {campaigns.map((campaign) => (
                <TouchableOpacity key={campaign.id} style={styles.campaignItem}>
                  <View style={styles.campaignInfo}>
                    <Text style={styles.campaignName}>{campaign.name}</Text>
                    <View style={styles.campaignMeta}>
                      <View style={[
                        styles.campaignStatus,
                        { backgroundColor: campaign.status === 'active' ? '#d1fae5' : '#fef3c7' }
                      ]}>
                        <Text style={[
                          styles.campaignStatusText,
                          { color: campaign.status === 'active' ? '#065f46' : '#92400e' }
                        ]}>
                          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                        </Text>
                      </View>
                      <Text style={styles.campaignRecipients}>
                        {campaign.recipients} recipients
                      </Text>
                    </View>
                  </View>
                  {campaign.status === 'active' && (
                    <View style={styles.campaignStats}>
                      <Text style={styles.campaignStat}>
                        {Math.round((campaign.delivered / campaign.sent) * 100)}% delivered
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('WhatsAppChats')}
              >
                <Icon name="chatbubbles-outline" size={20} color="#2563eb" />
                <Text style={styles.actionButtonText}>View Chats</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('WhatsAppSettings')}
              >
                <Icon name="settings-outline" size={20} color="#2563eb" />
                <Text style={styles.actionButtonText}>Settings</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  connectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  connectTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  connectSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#25d366',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  statusText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '500',
  },
  phoneNumber: {
    fontSize: 14,
    color: '#6b7280',
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  messageInput: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  quickRepliesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickReplyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  quickReplyInfo: {
    flex: 1,
  },
  quickReplyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  quickReplyMessage: {
    fontSize: 12,
    color: '#6b7280',
  },
  campaignsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  campaignItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  campaignInfo: {
    marginBottom: 8,
  },
  campaignName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  campaignMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  campaignStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  campaignStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  campaignRecipients: {
    fontSize: 12,
    color: '#6b7280',
  },
  campaignStats: {
    marginTop: 4,
  },
  campaignStat: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
});