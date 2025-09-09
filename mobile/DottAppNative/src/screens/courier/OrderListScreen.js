import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import courierApi from '../../services/courierApi';

const OrderListScreen = ({ navigation, route }) => {
  const { type = 'available' } = route.params || {};
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [type]);

  const fetchOrders = async () => {
    try {
      let response;
      if (type === 'available') {
        response = await courierApi.getAvailableOrders();
      } else if (type === 'active') {
        response = await courierApi.getActiveOrders();
      } else if (type === 'completed') {
        response = await courierApi.getCompletedOrders();
      }
      setOrders(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const acceptOrder = async (orderId) => {
    setAccepting(orderId);
    try {
      await courierApi.acceptDelivery(orderId);
      Alert.alert('Success', 'Order accepted! You can now start the delivery.');
      // Remove from available orders and navigate to tracking
      setOrders(orders.filter(order => order.id !== orderId));
      navigation.navigate('DeliveryTracking', { orderId });
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to accept order');
    } finally {
      setAccepting(null);
    }
  };

  const getDistanceText = (distance) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'normal': return '#10b981';
      default: return '#6b7280';
    }
  };

  const renderOrderItem = ({ item }) => {
    const earnings = parseFloat(item.courier_earnings || item.delivery_fee * 0.75).toFixed(2);
    const distance = item.distance || Math.random() * 10; // Mock distance if not provided

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => {
          if (type === 'available') {
            Alert.alert(
              'Accept Order',
              `Do you want to accept this delivery order?\n\nEarnings: $${earnings}\nDistance: ${getDistanceText(distance)}`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Accept', 
                  onPress: () => acceptOrder(item.id)
                }
              ]
            );
          } else {
            navigation.navigate('DeliveryTracking', { orderId: item.id });
          }
        }}
        disabled={accepting === item.id}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderId}>#{item.id}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
              <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.earnings}>${earnings}</Text>
        </View>

        <View style={styles.locationRow}>
          <Icon name="location" size={16} color="#10b981" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.pickup_address}
          </Text>
        </View>

        <View style={styles.locationRow}>
          <Icon name="location" size={16} color="#ef4444" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.delivery_address}
          </Text>
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.infoItem}>
            <Icon name="cube-outline" size={16} color="#6b7280" />
            <Text style={styles.infoText}>{item.package_size}</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="bicycle-outline" size={16} color="#6b7280" />
            <Text style={styles.infoText}>{getDistanceText(distance)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="time-outline" size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {type === 'available' && (
          <TouchableOpacity
            style={[styles.acceptButton, accepting === item.id && styles.acceptingButton]}
            onPress={() => acceptOrder(item.id)}
            disabled={accepting === item.id}
          >
            {accepting === item.id ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Icon name="checkmark-circle" size={20} color="white" />
                <Text style={styles.acceptButtonText}>Accept Order</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {type === 'active' && (
          <View style={[styles.statusBadge, { backgroundColor: '#3b82f6' }]}>
            <Icon name="bicycle" size={16} color="white" />
            <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        )}

        {type === 'completed' && (
          <View style={styles.completedInfo}>
            <View style={[styles.statusBadge, { backgroundColor: '#10b981' }]}>
              <Icon name="checkmark-circle" size={16} color="white" />
              <Text style={styles.statusText}>DELIVERED</Text>
            </View>
            <Text style={styles.completedTime}>
              {new Date(item.delivered_at).toLocaleDateString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon 
        name={type === 'available' ? 'cube-outline' : type === 'active' ? 'bicycle-outline' : 'checkmark-circle-outline'} 
        size={64} 
        color="#d1d5db" 
      />
      <Text style={styles.emptyTitle}>
        {type === 'available' ? 'No Available Orders' : type === 'active' ? 'No Active Deliveries' : 'No Completed Deliveries'}
      </Text>
      <Text style={styles.emptyText}>
        {type === 'available' 
          ? 'New orders will appear here when businesses request deliveries in your area.'
          : type === 'active'
          ? 'Your active deliveries will appear here.'
          : 'Your completed deliveries will appear here.'}
      </Text>
      {type === 'available' && (
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Icon name="refresh" size={20} color="#2563eb" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {type === 'available' ? 'Available Orders' : type === 'active' ? 'Active Deliveries' : 'Order History'}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === 'available' ? 'Available Orders' : type === 'active' ? 'Active Deliveries' : 'Order History'}
        </Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Icon name="refresh" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563eb']}
          />
        }
        ListEmptyComponent={renderEmptyList}
      />
    </View>
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
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  listContent: {
    padding: 20,
    flexGrow: 1,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  earnings: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  acceptingButton: {
    opacity: 0.7,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
  completedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  completedTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginLeft: 6,
  },
});

export default OrderListScreen;