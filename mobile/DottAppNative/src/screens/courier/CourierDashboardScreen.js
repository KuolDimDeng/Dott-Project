import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../../context/AuthContext';
import { courierApi } from '../../services/courierApi';

const CourierDashboardScreen = ({ navigation }) => {
  const { session } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      // Load courier profile
      const profileData = await courierApi.getProfile();
      setProfile(profileData);
      setIsOnline(profileData.is_online);
      
      // Load statistics
      const statsData = await courierApi.getStats();
      setStats(statsData);
      
      // Load active orders
      const ordersData = await courierApi.getActiveOrders();
      setActiveOrders(ordersData);
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      await courierApi.updateOnlineStatus(newStatus);
      setIsOnline(newStatus);
      Alert.alert(
        'Status Updated',
        newStatus ? 'You are now online and can receive orders' : 'You are now offline'
      );
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update online status');
    }
  };

  const renderStatCard = (title, value, icon, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Icon name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const renderActiveOrder = (order) => (
    <TouchableOpacity
      key={order.id}
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>#{order.order_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{order.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.orderInfo}>
        <Icon name="location-outline" size={16} color="#666" />
        <Text style={styles.orderAddress} numberOfLines={1}>
          {order.pickup_address} → {order.delivery_address}
        </Text>
      </View>
      
      <View style={styles.orderFooter}>
        <Text style={styles.orderAmount}>${order.courier_earnings}</Text>
        <Text style={styles.orderDistance}>{order.estimated_distance} km</Text>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'courier_assigned': return '#4CAF50';
      case 'picked': return '#2196F3';
      case 'in_transit': return '#9C27B0';
      case 'delivered': return '#4CAF50';
      default: return '#999';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hello, {profile?.first_name || session?.user?.name || 'Courier'}!
            </Text>
            <Text style={styles.subGreeting}>
              {isOnline ? 'Ready to deliver' : 'Currently offline'}
            </Text>
          </View>
          
          <View style={styles.onlineToggle}>
            <Text style={styles.onlineLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnlineStatus}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor={isOnline ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Today's Stats</Text>
          <View style={styles.statsGrid}>
            {renderStatCard('Deliveries', stats?.today_deliveries || 0, 'bicycle', '#4CAF50')}
            {renderStatCard('Earnings', `$${stats?.today_earnings || 0}`, 'cash-outline', '#2196F3')}
            {renderStatCard('Distance', `${stats?.today_distance || 0} km`, 'speedometer-outline', '#FF9800')}
            {renderStatCard('Rating', stats?.rating || '5.0', 'star', '#FFC107')}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('OrderList', { type: 'available' })}
          >
            <Icon name="list-outline" size={24} color="#fff" />
            <Text style={styles.actionText}>Available Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => navigation.navigate('OrderList', { type: 'active' })}
          >
            <Icon name="bicycle-outline" size={24} color="#fff" />
            <Text style={styles.actionText}>Active</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
            onPress={() => navigation.navigate('OrderList', { type: 'completed' })}
          >
            <Icon name="time-outline" size={24} color="#fff" />
            <Text style={styles.actionText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <View style={styles.ordersSection}>
            <Text style={styles.sectionTitle}>Active Orders</Text>
            {activeOrders.map(renderActiveOrder)}
          </View>
        )}

        {/* Trust Level */}
        {profile && (
          <View style={styles.trustSection}>
            <Text style={styles.sectionTitle}>Trust Level</Text>
            <View style={styles.trustCard}>
              <View style={styles.trustHeader}>
                <Text style={styles.trustLevel}>Level {profile.trust_level}</Text>
                <Text style={styles.trustLabel}>{getTrustLabel(profile.trust_level)}</Text>
              </View>
              <View style={styles.trustProgress}>
                <View style={[styles.trustBar, { width: `${(profile.trust_level / 5) * 100}%` }]} />
              </View>
              <Text style={styles.trustInfo}>
                Complete more deliveries to increase your trust level
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getTrustLabel = (level) => {
  switch (level) {
    case 1: return 'New Courier';
    case 2: return 'Verified';
    case 3: return 'Experienced';
    case 4: return 'Expert';
    case 5: return 'Elite';
    default: return 'New';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subGreeting: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  onlineToggle: {
    alignItems: 'center',
  },
  onlineLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600',
  },
  ordersSection: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderAddress: {
    flex: 1,
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  orderDistance: {
    fontSize: 14,
    color: '#666',
  },
  trustSection: {
    padding: 20,
  },
  trustCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  trustHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  trustLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  trustLabel: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  trustProgress: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  trustBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  trustInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default CourierDashboardScreen;