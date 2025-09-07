import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';

const AdvertiseScreen = ({ navigation }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    loadAdvertisingData();
  }, []);

  const loadAdvertisingData = async () => {
    try {
      setLoading(true);
      const [campaignsRes, analyticsRes] = await Promise.all([
        api.get('/advertising/campaigns/').catch(() => ({ data: [] })),
        api.get('/advertising/analytics/').catch(() => ({ data: null })),
      ]);

      setCampaigns(campaignsRes.data.results || campaignsRes.data || getMockCampaigns());
      setAnalytics(analyticsRes.data || getMockAnalytics());
    } catch (error) {
      console.error('Error loading advertising data:', error);
      setCampaigns(getMockCampaigns());
      setAnalytics(getMockAnalytics());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockCampaigns = () => [
    {
      id: 1,
      name: 'Summer Sale Campaign',
      type: 'Social Media',
      status: 'active',
      budget: 500,
      spent: 342,
      impressions: 45320,
      clicks: 1240,
      conversions: 52,
      startDate: '2024-01-15',
      endDate: '2024-02-15',
      platforms: ['Facebook', 'Instagram'],
      image: null,
    },
    {
      id: 2,
      name: 'New Product Launch',
      type: 'Google Ads',
      status: 'active',
      budget: 1000,
      spent: 623,
      impressions: 78500,
      clicks: 2340,
      conversions: 89,
      startDate: '2024-01-20',
      endDate: '2024-02-20',
      platforms: ['Google Search', 'Display Network'],
      image: null,
    },
    {
      id: 3,
      name: 'Holiday Special',
      type: 'Email Marketing',
      status: 'paused',
      budget: 200,
      spent: 150,
      impressions: 12000,
      clicks: 450,
      conversions: 28,
      startDate: '2023-12-01',
      endDate: '2023-12-31',
      platforms: ['Email'],
      image: null,
    },
    {
      id: 4,
      name: 'Brand Awareness',
      type: 'Display Ads',
      status: 'completed',
      budget: 750,
      spent: 750,
      impressions: 120000,
      clicks: 3200,
      conversions: 145,
      startDate: '2023-11-01',
      endDate: '2023-12-31',
      platforms: ['Google Display', 'YouTube'],
      image: null,
    },
  ];

  const getMockAnalytics = () => ({
    totalSpend: 1865,
    totalBudget: 2450,
    totalImpressions: 255820,
    totalClicks: 7230,
    totalConversions: 314,
    averageCTR: 2.83,
    averageCPC: 0.26,
    roi: 168,
  });

  const handleCreateCampaign = () => {
    navigation.navigate('CreateCampaign');
  };

  const handleCampaignAction = (campaign, action) => {
    const actionText = action === 'pause' ? 'Pause' : action === 'resume' ? 'Resume' : 'Stop';
    Alert.alert(
      `${actionText} Campaign`,
      `Are you sure you want to ${action} "${campaign.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.patch(`/advertising/campaigns/${campaign.id}/`, {
                status: action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'completed',
              });
              Alert.alert('Success', `Campaign ${action}d successfully`);
              loadAdvertisingData();
            } catch (error) {
              Alert.alert('Error', `Failed to ${action} campaign`);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#22c55e';
      case 'paused':
        return '#f59e0b';
      case 'completed':
        return '#6b7280';
      case 'draft':
        return '#3b82f6';
      default:
        return '#999';
    }
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (activeTab === 'active') return campaign.status === 'active';
    if (activeTab === 'paused') return campaign.status === 'paused';
    if (activeTab === 'completed') return campaign.status === 'completed';
    return true;
  });

  const renderCampaign = ({ item }) => (
    <TouchableOpacity style={styles.campaignCard}>
      <View style={styles.campaignHeader}>
        <View style={styles.campaignInfo}>
          <Text style={styles.campaignName}>{item.name}</Text>
          <Text style={styles.campaignType}>{item.type}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.platformsContainer}>
        {item.platforms.map((platform, index) => (
          <View key={index} style={styles.platformBadge}>
            <Text style={styles.platformText}>{platform}</Text>
          </View>
        ))}
      </View>

      <View style={styles.metricsContainer}>
        <View style={styles.metricItem}>
          <Icon name="eye-outline" size={16} color="#666" />
          <Text style={styles.metricValue}>{formatNumber(item.impressions)}</Text>
          <Text style={styles.metricLabel}>Impressions</Text>
        </View>
        <View style={styles.metricItem}>
          <Icon name="hand-left-outline" size={16} color="#666" />
          <Text style={styles.metricValue}>{formatNumber(item.clicks)}</Text>
          <Text style={styles.metricLabel}>Clicks</Text>
        </View>
        <View style={styles.metricItem}>
          <Icon name="trending-up-outline" size={16} color="#666" />
          <Text style={styles.metricValue}>{item.conversions}</Text>
          <Text style={styles.metricLabel}>Conversions</Text>
        </View>
      </View>

      <View style={styles.budgetContainer}>
        <View style={styles.budgetInfo}>
          <Text style={styles.budgetLabel}>Budget</Text>
          <Text style={styles.budgetAmount}>
            {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
          </Text>
        </View>
        <View style={styles.budgetProgress}>
          <View 
            style={[
              styles.budgetProgressBar,
              { width: `${(item.spent / item.budget) * 100}%` }
            ]}
          />
        </View>
      </View>

      <View style={styles.campaignDates}>
        <Icon name="calendar-outline" size={14} color="#999" />
        <Text style={styles.dateText}>
          {item.startDate} - {item.endDate}
        </Text>
      </View>

      {item.status === 'active' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.pauseButton]}
            onPress={() => handleCampaignAction(item, 'pause')}
          >
            <Icon name="pause" size={16} color="#f59e0b" />
            <Text style={styles.pauseButtonText}>Pause</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => navigation.navigate('EditCampaign', { campaign: item })}
          >
            <Icon name="create-outline" size={16} color="#2563eb" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'paused' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.resumeButton]}
          onPress={() => handleCampaignAction(item, 'resume')}
        >
          <Icon name="play" size={16} color="#22c55e" />
          <Text style={styles.resumeButtonText}>Resume Campaign</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading advertising data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Advertising</Text>
        <TouchableOpacity onPress={handleCreateCampaign}>
          <Icon name="add-circle-outline" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {analytics && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.analyticsContainer}>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Total Spend</Text>
            <Text style={styles.analyticsValue}>{formatCurrency(analytics.totalSpend)}</Text>
            <Text style={styles.analyticsSubtext}>of {formatCurrency(analytics.totalBudget)}</Text>
          </View>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Impressions</Text>
            <Text style={styles.analyticsValue}>{formatNumber(analytics.totalImpressions)}</Text>
            <Text style={styles.analyticsSubtext}>Total views</Text>
          </View>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Clicks</Text>
            <Text style={styles.analyticsValue}>{formatNumber(analytics.totalClicks)}</Text>
            <Text style={styles.analyticsSubtext}>{analytics.averageCTR}% CTR</Text>
          </View>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Conversions</Text>
            <Text style={styles.analyticsValue}>{analytics.totalConversions}</Text>
            <Text style={styles.analyticsSubtext}>{analytics.roi}% ROI</Text>
          </View>
        </ScrollView>
      )}

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'paused' && styles.activeTab]}
          onPress={() => setActiveTab('paused')}
        >
          <Text style={[styles.tabText, activeTab === 'paused' && styles.activeTabText]}>
            Paused
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCampaigns}
        renderItem={renderCampaign}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadAdvertisingData} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="megaphone-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No {activeTab} campaigns</Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateCampaign}>
              <Text style={styles.createButtonText}>Create Your First Campaign</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  analyticsContainer: {
    paddingVertical: 15,
    backgroundColor: 'white',
  },
  analyticsCard: {
    marginHorizontal: 10,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  analyticsSubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2563eb',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  campaignCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  campaignType: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  platformsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  platformBadge: {
    backgroundColor: '#e1e8ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 5,
    marginBottom: 5,
  },
  platformText: {
    fontSize: 11,
    color: '#666',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  budgetContainer: {
    marginTop: 12,
  },
  budgetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  budgetLabel: {
    fontSize: 13,
    color: '#666',
  },
  budgetAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  budgetProgress: {
    height: 6,
    backgroundColor: '#e1e8ed',
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetProgressBar: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  campaignDates: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  pauseButton: {
    backgroundColor: '#f59e0b20',
  },
  pauseButtonText: {
    color: '#f59e0b',
    fontWeight: '600',
    marginLeft: 5,
  },
  editButton: {
    backgroundColor: '#2563eb20',
  },
  editButtonText: {
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 5,
  },
  resumeButton: {
    backgroundColor: '#22c55e20',
    marginTop: 12,
  },
  resumeButtonText: {
    color: '#22c55e',
    fontWeight: '600',
    marginLeft: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
  createButton: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});

export default AdvertiseScreen;