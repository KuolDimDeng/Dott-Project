import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import Sound from 'react-native-sound';

export default function RestaurantOrdersScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timers, setTimers] = useState({});
  const wsRef = useRef(null);
  const notificationSound = useRef(null);

  useEffect(() => {
    // Load notification sound safely
    try {
      if (Sound && Sound.MAIN_BUNDLE) {
        notificationSound.current = new Sound('notification.mp3', Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.log('Failed to load sound', error);
            // Continue without sound
          }
        });
      }
    } catch (soundError) {
      console.log('Sound library not available:', soundError);
      // Continue without sound functionality
    }

    // Connect to WebSocket for real-time orders
    connectWebSocket();

    // Load initial orders
    loadOrders();

    // Cleanup
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (notificationSound.current && notificationSound.current.release) {
        notificationSound.current.release();
      }
    };
  }, []);

  // Timer countdown for pending orders
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prevTimers => {
        const newTimers = { ...prevTimers };
        Object.keys(newTimers).forEach(orderId => {
          if (newTimers[orderId] > 0) {
            newTimers[orderId] -= 1;
          } else {
            // Auto-reject order if timer expires
            handleAutoReject(orderId);
            delete newTimers[orderId];
          }
        });
        return newTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const connectWebSocket = () => {
    try {
      wsRef.current = new WebSocket('wss://api.dottapps.com/ws/restaurant-orders/');

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'new_order') {
          // Add to pending orders
          setPendingOrders(prev => [data.order, ...prev]);

          // Set 5-minute timer
          setTimers(prev => ({ ...prev, [data.order.id]: 300 }));

          // Play notification sound safely
          try {
            if (notificationSound.current && notificationSound.current.play) {
              notificationSound.current.play();
            }
          } catch (error) {
            console.log('Could not play notification sound:', error);
          }

          // Show alert
          Alert.alert(
            '🔔 New Order!',
            `Order #${data.order.order_number} - $${data.order.total}`,
            [{ text: 'View', onPress: () => setSelectedOrder(data.order) }]
          );
        } else if (data.type === 'order_update') {
          // Update order status
          updateOrderInList(data.order);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => connectWebSocket(), 5000);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/marketplace/restaurant/orders/');

      const pending = response.data.filter(o => o.status === 'pending');
      const active = response.data.filter(o => ['accepted', 'preparing', 'ready'].includes(o.status));
      const completed = response.data.filter(o => ['delivered', 'picked_up', 'completed'].includes(o.status));

      setPendingOrders(pending);
      setActiveOrders(active);
      setCompletedOrders(completed);

      // Set timers for pending orders
      const newTimers = {};
      pending.forEach(order => {
        const elapsed = Math.floor((Date.now() - new Date(order.created_at)) / 1000);
        const remaining = Math.max(0, 300 - elapsed); // 5 minutes
        if (remaining > 0) {
          newTimers[order.id] = remaining;
        }
      });
      setTimers(newTimers);
    } catch (error) {
      console.error('Failed to load orders:', error);
      
      // Handle 404 - no orders yet for this restaurant
      if (error.response && error.response.status === 404) {
        console.log('No orders found - setting empty arrays');
        setPendingOrders([]);
        setActiveOrders([]);
        setCompletedOrders([]);
        setTimers({});
      } else {
        // Only show alert for non-404 errors
        Alert.alert('Error', 'Failed to load orders. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptOrder = async (order) => {
    try {
      const response = await api.post(`/marketplace/orders/${order.id}/accept/`, {
        prep_time_minutes: 25,
      });

      // Update lists
      setPendingOrders(prev => prev.filter(o => o.id !== order.id));
      setActiveOrders(prev => [response.data, ...prev]);
      delete timers[order.id];

      // If it's a delivery order, request courier
      if (order.delivery_type === 'delivery') {
        await api.post(`/marketplace/orders/${order.id}/request-courier/`);
      }

      Alert.alert(
        '✅ Order Accepted',
        `Order #${order.order_number} accepted. Prep time: 25 minutes`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to accept order:', error);
      Alert.alert('Error', 'Failed to accept order');
    }
  };

  const handleRejectOrder = async (order, reason) => {
    try {
      await api.post(`/marketplace/orders/${order.id}/reject/`, {
        reason: reason
      });

      setPendingOrders(prev => prev.filter(o => o.id !== order.id));
      delete timers[order.id];
      setShowRejectModal(false);
      setSelectedOrder(null);

      Alert.alert(
        'Order Rejected',
        'Customer will be notified and refunded immediately',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to reject order:', error);
      Alert.alert('Error', 'Failed to reject order');
    }
  };

  const handleAutoReject = async (orderId) => {
    try {
      await api.post(`/marketplace/orders/${orderId}/reject/`, {
        reason: 'No response from restaurant - auto rejected'
      });

      setPendingOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error) {
      console.error('Auto-reject failed:', error);
    }
  };

  const markOrderReady = async (order) => {
    try {
      const response = await api.post(`/marketplace/orders/${order.id}/ready/`);
      updateOrderInList(response.data);
      Alert.alert('Success', `Order #${order.order_number} marked as ready`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update order');
    }
  };

  const updateOrderInList = (updatedOrder) => {
    // Remove from all lists first
    setPendingOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
    setActiveOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
    setCompletedOrders(prev => prev.filter(o => o.id !== updatedOrder.id));

    // Add to appropriate list
    if (updatedOrder.status === 'pending') {
      setPendingOrders(prev => [updatedOrder, ...prev]);
    } else if (['accepted', 'preparing', 'ready'].includes(updatedOrder.status)) {
      setActiveOrders(prev => [updatedOrder, ...prev]);
    } else {
      setCompletedOrders(prev => [updatedOrder, ...prev]);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderPendingOrder = ({ item }) => {
    const timeLeft = timers[item.id] || 0;

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>Order #{item.order_number}</Text>
            <Text style={styles.orderTime}>{new Date(item.created_at).toLocaleTimeString()}</Text>
          </View>
          <View style={styles.timerContainer}>
            <Icon name="time-outline" size={20} color={timeLeft < 60 ? '#ef4444' : '#f59e0b'} />
            <Text style={[styles.timer, timeLeft < 60 && styles.urgentTimer]}>
              {formatTime(timeLeft)}
            </Text>
          </View>
        </View>

        <View style={styles.customerInfo}>
          <Icon name="person-outline" size={16} color="#6b7280" />
          <Text style={styles.customerName}>{item.customer_name}</Text>
        </View>

        <View style={styles.orderItems}>
          {item.items.map((product, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemQuantity}>{product.quantity}x</Text>
              <Text style={styles.itemName}>{product.name}</Text>
              <Text style={styles.itemPrice}>${product.price}</Text>
            </View>
          ))}
        </View>

        {item.special_instructions && (
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsLabel}>Special Instructions:</Text>
            <Text style={styles.instructionsText}>{item.special_instructions}</Text>
          </View>
        )}

        <View style={styles.orderFooter}>
          <View style={styles.orderMeta}>
            <View style={styles.deliveryType}>
              <Icon
                name={item.delivery_type === 'delivery' ? 'bicycle' : 'storefront'}
                size={20}
                color="#2563eb"
              />
              <Text style={styles.deliveryText}>
                {item.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}
              </Text>
            </View>
            <Text style={styles.orderTotal}>${item.total.toFixed(2)}</Text>
          </View>

          <View style={styles.paymentInfo}>
            <Icon name="card-outline" size={16} color="#6b7280" />
            <Text style={styles.paymentText}>
              {item.payment_method === 'card' ? 'Card' :
               item.payment_method === 'mpesa' ? 'M-Pesa' : 'MTN MoMo'}
            </Text>
            <Text style={styles.paymentStatus}>
              (Held - Released on pickup)
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => {
                setSelectedOrder(item);
                setShowRejectModal(true);
              }}
            >
              <Icon name="close" size={20} color="#ef4444" />
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAcceptOrder(item)}
            >
              <Icon name="checkmark" size={20} color="#ffffff" />
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderActiveOrder = ({ item }) => {
    const isPaid = item.restaurant_paid_at;

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>Order #{item.order_number}</Text>
            <Text style={styles.orderStatus}>{item.status.toUpperCase()}</Text>
          </View>
          {item.pickup_pin && (
            <View style={styles.pinContainer}>
              <Text style={styles.pinLabel}>Pickup PIN</Text>
              <Text style={styles.pinValue}>{item.pickup_pin}</Text>
            </View>
          )}
        </View>

        <View style={styles.orderItems}>
          {item.items.map((product, index) => (
            <Text key={index} style={styles.itemText}>
              {product.quantity}x {product.name}
            </Text>
          ))}
        </View>

        {/* Payment Status */}
        <View style={styles.paymentStatusCard}>
          {isPaid ? (
            <View style={styles.paidBadge}>
              <Icon name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.paidText}>
                Payment Released: ${item.restaurant_amount}
              </Text>
            </View>
          ) : (
            <View style={styles.pendingBadge}>
              <Icon name="time-outline" size={20} color="#f59e0b" />
              <Text style={styles.pendingText}>
                Payment pending pickup: ${item.restaurant_amount}
              </Text>
            </View>
          )}
        </View>

        {item.status === 'accepted' && (
          <TouchableOpacity
            style={styles.readyButton}
            onPress={() => markOrderReady(item)}
          >
            <Icon name="checkmark-done" size={20} color="#ffffff" />
            <Text style={styles.readyButtonText}>Mark as Ready</Text>
          </TouchableOpacity>
        )}

        {item.courier && (
          <View style={styles.courierInfo}>
            <Icon name="bicycle" size={20} color="#2563eb" />
            <Text style={styles.courierText}>
              Courier: {item.courier_name} (En route)
            </Text>
          </View>
        )}
      </View>
    );
  };

  const RejectionModal = () => {
    const reasons = [
      'Too busy - kitchen at capacity',
      'Item(s) out of stock',
      'Closing soon',
      'Cannot deliver to this area',
      'Technical issues',
      'Other'
    ];

    return (
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Order</Text>
            <Text style={styles.modalSubtitle}>
              Please select a reason for rejection
            </Text>

            {reasons.map((reason, index) => (
              <TouchableOpacity
                key={index}
                style={styles.reasonButton}
                onPress={() => handleRejectOrder(selectedOrder, reason)}
              >
                <Text style={styles.reasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowRejectModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Restaurant Orders</Text>
        <TouchableOpacity onPress={loadOrders}>
          <Icon name="refresh" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTabStyle]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending ({pendingOrders.length})
          </Text>
          {pendingOrders.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTabStyle]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active ({activeOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTabStyle]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'pending' ? pendingOrders :
              activeTab === 'active' ? activeOrders : completedOrders}
        renderItem={activeTab === 'pending' ? renderPendingOrder : renderActiveOrder}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadOrders();
            }}
            colors={['#2563eb']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No {activeTab} orders</Text>
          </View>
        }
      />

      <RejectionModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14532d',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeTabStyle: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 30,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  orderTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  orderStatus: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 2,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timer: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginLeft: 4,
  },
  urgentTimer: {
    color: '#ef4444',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerName: {
    marginLeft: 6,
    color: '#374151',
    fontSize: 14,
  },
  orderItems: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  itemQuantity: {
    width: 30,
    color: '#6b7280',
    fontSize: 14,
  },
  itemName: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
  },
  itemText: {
    color: '#374151',
    fontSize: 14,
    paddingVertical: 2,
  },
  itemPrice: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  instructionsBox: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 13,
    color: '#78350f',
  },
  orderFooter: {
    marginTop: 8,
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deliveryType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    marginLeft: 6,
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentText: {
    marginLeft: 6,
    color: '#6b7280',
    fontSize: 13,
  },
  paymentStatus: {
    marginLeft: 4,
    color: '#f59e0b',
    fontSize: 12,
  },
  paymentStatusCard: {
    marginVertical: 8,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  paidText: {
    marginLeft: 8,
    color: '#065f46',
    fontSize: 14,
    fontWeight: '500',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fed7aa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pendingText: {
    marginLeft: 8,
    color: '#92400e',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectText: {
    marginLeft: 6,
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
  },
  acceptText: {
    marginLeft: 6,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  pinContainer: {
    backgroundColor: '#dbeafe',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 10,
    color: '#1e40af',
    fontWeight: '600',
  },
  pinValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1d4ed8',
    letterSpacing: 2,
    marginTop: 2,
  },
  readyButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  readyButtonText: {
    marginLeft: 6,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  courierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
  },
  courierText: {
    marginLeft: 8,
    color: '#1e40af',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  reasonButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#374151',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
});