import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useBusinessContext } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const BusinessDashboard = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const {
    businessData,
    businessConfig,
    isOnline,
    toggleOnlineStatus,
    hasFeature,
    getMenuItems,
  } = useBusinessContext();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    todayJobs: 0,
    weekEarnings: 0,
    weekJobs: 0,
    rating: 4.8,
    totalReviews: 127,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // TODO: Load actual data from API
    setStats({
      todayEarnings: businessData.todayStats.earnings,
      todayJobs: businessData.todayStats.jobs,
      weekEarnings: businessData.weekStats.earnings,
      weekJobs: businessData.weekStats.jobs,
      rating: 4.8,
      totalReviews: 127,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleToggleOnline = () => {
    const newStatus = toggleOnlineStatus();
    Alert.alert(
      'Status Updated',
      `You are now ${newStatus ? 'online and accepting orders' : 'offline'}`,
    );
  };

  const handleMenuItemPress = (item) => {
    if (item.screen) {
      navigation.navigate(item.screen, item.params || {});
    } else if (item.action) {
      item.action();
    }
  };

  const renderStatCard = (title, value, subtitle, icon, color = '#2563eb') => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderMenuItem = (item) => {
    const isEnabled = !item.requiresFeature || hasFeature(item.requiresFeature);
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, !isEnabled && styles.menuItemDisabled]}
        onPress={() => isEnabled && handleMenuItemPress(item)}
        disabled={!isEnabled}
      >
        <View style={styles.menuItemLeft}>
          <Icon 
            name={item.icon} 
            size={24} 
            color={isEnabled ? '#2563eb' : '#9ca3af'} 
          />
          <View style={styles.menuItemText}>
            <Text style={[styles.menuItemTitle, !isEnabled && styles.textDisabled]}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
            )}
          </View>
        </View>
        {item.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        <Icon 
          name="chevron-forward" 
          size={20} 
          color={isEnabled ? '#6b7280' : '#d1d5db'} 
        />
      </TouchableOpacity>
    );
  };

  const menuItems = getMenuItems();
  const activeOrdersCount = businessData.activeOrders.length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.businessName}>
            {businessData.businessName || `${user?.firstName}'s Business`}
          </Text>
          <View style={styles.onlineToggle}>
            <Text style={[styles.statusText, { color: isOnline ? '#10b981' : '#6b7280' }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#d1d5db', true: '#86efac' }}
              thumbColor={isOnline ? '#10b981' : '#9ca3af'}
            />
          </View>
        </View>
        <Text style={styles.businessType}>
          {businessConfig?.label || businessData.businessType}
        </Text>
      </View>

      {/* Active Orders Alert */}
      {activeOrdersCount > 0 && isOnline && (
        <TouchableOpacity 
          style={styles.activeOrdersAlert}
          onPress={() => navigation.navigate('ActiveOrders')}
        >
          <Icon name="alert-circle" size={20} color="#fff" />
          <Text style={styles.activeOrdersText}>
            {activeOrdersCount} active {activeOrdersCount === 1 ? 'order' : 'orders'}
          </Text>
          <Icon name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {renderStatCard(
          'Today',
          `$${stats.todayEarnings.toFixed(2)}`,
          `${stats.todayJobs} jobs`,
          'today-outline',
          '#2563eb'
        )}
        {renderStatCard(
          'This Week',
          `$${stats.weekEarnings.toFixed(2)}`,
          `${stats.weekJobs} jobs`,
          'calendar-outline',
          '#10b981'
        )}
        {renderStatCard(
          'Rating',
          stats.rating.toFixed(1),
          `${stats.totalReviews} reviews`,
          'star',
          '#f59e0b'
        )}
        {hasFeature('inventory') && renderStatCard(
          'Inventory',
          'Low Stock',
          '3 items',
          'cube-outline',
          '#ef4444'
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {hasFeature('calendar') && (
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Calendar')}
            >
              <Icon name="calendar" size={28} color="#2563eb" />
              <Text style={styles.quickActionText}>Schedule</Text>
            </TouchableOpacity>
          )}
          {hasFeature('navigation') && (
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Navigation')}
            >
              <Icon name="navigate" size={28} color="#2563eb" />
              <Text style={styles.quickActionText}>Navigate</Text>
            </TouchableOpacity>
          )}
          {hasFeature('chat') && (
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Messages')}
            >
              <Icon name="chatbubbles" size={28} color="#2563eb" />
              <Text style={styles.quickActionText}>Messages</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Earnings')}
          >
            <Icon name="cash" size={28} color="#2563eb" />
            <Text style={styles.quickActionText}>Earnings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu</Text>
        {menuItems.map(renderMenuItem)}
      </View>

      {/* Additional Features */}
      {hasFeature('promotions') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promotions</Text>
          <TouchableOpacity style={styles.promotionCard}>
            <Icon name="megaphone" size={24} color="#8b5cf6" />
            <View style={styles.promotionContent}>
              <Text style={styles.promotionTitle}>Boost Your Visibility</Text>
              <Text style={styles.promotionText}>
                Get 50% off your first promotion campaign
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  businessType: {
    fontSize: 14,
    color: '#6b7280',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeOrdersAlert: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 8,
    gap: 8,
  },
  activeOrdersText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    flex: 1,
    minWidth: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 15,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
  },
  quickActionButton: {
    alignItems: 'center',
    gap: 5,
  },
  quickActionText: {
    fontSize: 12,
    color: '#4b5563',
  },
  menuItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  textDisabled: {
    color: '#9ca3af',
  },
  badge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  promotionCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 12,
  },
  promotionContent: {
    flex: 1,
  },
  promotionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  promotionText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default BusinessDashboard;