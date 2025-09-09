import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import courierApi from '../../services/courierApi';

const DeliveryTrackingScreen = ({ navigation, route }) => {
  const { orderId } = route.params;
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deliveryPin, setDeliveryPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
    const interval = setInterval(fetchOrderDetails, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await courierApi.getDeliveryOrder(orderId);
      setOrder(response.data);
      
      // Show PIN input when order is ready for delivery
      if (response.data.status === 'in_transit' && user?.is_courier) {
        setShowPinInput(true);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await courierApi.updateDeliveryStatus(orderId, { status: newStatus });
      await fetchOrderDetails();
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const completeDelivery = async () => {
    if (deliveryPin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter the 4-digit PIN from the customer');
      return;
    }

    setUpdating(true);
    try {
      await courierApi.completeDelivery(orderId, { pin: deliveryPin });
      Alert.alert('Success', 'Delivery completed successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error completing delivery:', error);
      Alert.alert('Error', error.response?.data?.error || 'Invalid PIN or failed to complete delivery');
    } finally {
      setUpdating(false);
    }
  };

  const callCustomer = () => {
    const phoneNumber = order?.delivery_phone || order?.customer_phone;
    if (phoneNumber) {
      const phoneUrl = Platform.OS === 'ios' 
        ? `telprompt:${phoneNumber}`
        : `tel:${phoneNumber}`;
      Linking.openURL(phoneUrl);
    }
  };

  const openMaps = (address) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${encodeURIComponent(address)}`,
      android: `google.navigation:q=${encodeURIComponent(address)}`,
    });
    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'courier_assigned': return '#3b82f6';
      case 'picked': return '#8b5cf6';
      case 'in_transit': return '#06b6d4';
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'courier_assigned': return 'person-outline';
      case 'picked': return 'cube-outline';
      case 'in_transit': return 'bicycle-outline';
      case 'delivered': return 'checkmark-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'ellipse-outline';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Not Found</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Order not found</Text>
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
        <Text style={styles.headerTitle}>Order #{order.id}</Text>
        <TouchableOpacity onPress={fetchOrderDetails}>
          <Icon name="refresh" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Icon name={getStatusIcon(order.status)} size={24} color="white" />
          <Text style={styles.statusText}>{order.status.replace('_', ' ').toUpperCase()}</Text>
        </View>

        {/* Order Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID:</Text>
            <Text style={styles.infoValue}>#{order.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Priority:</Text>
            <Text style={[styles.infoValue, { color: order.priority === 'urgent' ? '#ef4444' : '#1f2937' }]}>
              {order.priority.toUpperCase()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estimated Delivery:</Text>
            <Text style={styles.infoValue}>
              {new Date(order.estimated_delivery_time).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Package Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Package Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Description:</Text>
            <Text style={styles.infoValue}>{order.package_description}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Size:</Text>
            <Text style={styles.infoValue}>{order.package_size.toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Weight:</Text>
            <Text style={styles.infoValue}>{order.package_weight} kg</Text>
          </View>
          {order.special_instructions && (
            <View style={styles.instructionsBox}>
              <Icon name="information-circle-outline" size={20} color="#f59e0b" />
              <Text style={styles.instructionsText}>{order.special_instructions}</Text>
            </View>
          )}
        </View>

        {/* Pickup Location */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Pickup Location</Text>
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={() => openMaps(order.pickup_address)}
            >
              <Icon name="map-outline" size={20} color="#2563eb" />
              <Text style={styles.mapButtonText}>Navigate</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.addressText}>{order.pickup_address}</Text>
          <View style={styles.contactRow}>
            <Icon name="person-outline" size={16} color="#6b7280" />
            <Text style={styles.contactText}>{order.pickup_name}</Text>
          </View>
          {order.pickup_phone && (
            <TouchableOpacity style={styles.contactRow} onPress={callCustomer}>
              <Icon name="call-outline" size={16} color="#2563eb" />
              <Text style={[styles.contactText, { color: '#2563eb' }]}>{order.pickup_phone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Delivery Location */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Delivery Location</Text>
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={() => openMaps(order.delivery_address)}
            >
              <Icon name="map-outline" size={20} color="#2563eb" />
              <Text style={styles.mapButtonText}>Navigate</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.addressText}>{order.delivery_address}</Text>
          <View style={styles.contactRow}>
            <Icon name="person-outline" size={16} color="#6b7280" />
            <Text style={styles.contactText}>{order.delivery_name}</Text>
          </View>
          {order.delivery_phone && (
            <TouchableOpacity style={styles.contactRow} onPress={callCustomer}>
              <Icon name="call-outline" size={16} color="#2563eb" />
              <Text style={[styles.contactText, { color: '#2563eb' }]}>{order.delivery_phone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery Fee:</Text>
            <Text style={styles.priceText}>${order.delivery_fee}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Your Earnings:</Text>
            <Text style={[styles.priceText, { color: '#10b981' }]}>${order.courier_earnings}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Status:</Text>
            <Text style={[styles.infoValue, { 
              color: order.payment_status === 'paid' ? '#10b981' : '#f59e0b' 
            }]}>
              {order.payment_status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* PIN Verification for Delivery */}
        {showPinInput && order.status === 'in_transit' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Complete Delivery</Text>
            <Text style={styles.pinInstructions}>
              Ask the customer for their 4-digit delivery PIN to complete the delivery
            </Text>
            <View style={styles.pinContainer}>
              <TextInput
                style={styles.pinInput}
                value={deliveryPin}
                onChangeText={setDeliveryPin}
                placeholder="0000"
                keyboardType="numeric"
                maxLength={4}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[styles.completeButton, { opacity: deliveryPin.length !== 4 ? 0.5 : 1 }]}
              onPress={completeDelivery}
              disabled={deliveryPin.length !== 4 || updating}
            >
              {updating ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Icon name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.completeButtonText}>Complete Delivery</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons for Courier */}
        {user?.is_courier && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <View style={styles.actionButtons}>
            {order.status === 'courier_assigned' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]}
                onPress={() => updateOrderStatus('picked')}
                disabled={updating}
              >
                <Icon name="cube" size={20} color="white" />
                <Text style={styles.actionButtonText}>Mark as Picked</Text>
              </TouchableOpacity>
            )}
            {order.status === 'picked' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#06b6d4' }]}
                onPress={() => updateOrderStatus('in_transit')}
                disabled={updating}
              >
                <Icon name="bicycle" size={20} color="white" />
                <Text style={styles.actionButtonText}>Start Delivery</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
              onPress={() => {
                Alert.alert(
                  'Cancel Delivery',
                  'Are you sure you want to cancel this delivery?',
                  [
                    { text: 'No', style: 'cancel' },
                    { text: 'Yes', onPress: () => updateOrderStatus('cancelled') }
                  ]
                );
              }}
              disabled={updating}
            >
              <Icon name="close-circle" size={20} color="white" />
              <Text style={styles.actionButtonText}>Cancel Delivery</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
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
  content: {
    flex: 1,
    padding: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  addressText: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  contactText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  mapButtonText: {
    fontSize: 14,
    color: '#2563eb',
    marginLeft: 4,
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    marginLeft: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  pinContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  pinInstructions: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  pinInput: {
    width: 150,
    height: 60,
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    letterSpacing: 10,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButtons: {
    marginTop: 10,
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 10,
  },
});

export default DeliveryTrackingScreen;