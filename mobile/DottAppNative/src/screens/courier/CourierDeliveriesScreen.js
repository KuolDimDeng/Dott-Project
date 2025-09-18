import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  RefreshControl,
  Switch,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import courierApi from '../../services/courierApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import orderWebSocketService from '../../services/orderWebSocketService';

const TABS = ['Available', 'Active', 'Completed'];

export default function CourierDeliveriesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('Available');
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [courierProfile, setCourierProfile] = useState(null);
  const [acceptTimers, setAcceptTimers] = useState({});
  const timerRefs = useRef({});

  useEffect(() => {
    loadCourierProfile();
    loadDeliveries();

    // Listen for new delivery notifications via WebSocket
    const unsubscribeNewDelivery = orderWebSocketService.on('new_delivery', (data) => {
      console.log('🚚 NEW DELIVERY via WebSocket!', data);

      // Add new delivery to available list
      setDeliveries(prev => {
        const updated = prev.filter(d => d.id !== data.order_id);
        const newDelivery = {
          id: data.order_id,
          order_id: data.order_id,
          pickup_address: data.pickup_location?.address || data.pickup_address,
          delivery_address: data.delivery_location?.address || data.delivery_address,
          business_name: data.pickup_location?.business_name || data.business_name,
          customer_name: data.delivery_location?.customer_name || data.customer_name,
          courier_earnings: data.earnings || data.courier_earnings,
          total_distance: data.distance || data.total_distance,
          status: 'available',
          created_at: new Date().toISOString(),
        };
        return [newDelivery, ...updated];
      });

      // Start 60-second timer for this delivery
      startAcceptTimer(data.order_id);

      // Show notification
      Alert.alert(
        '🚚 New Delivery Assignment!',
        `Pickup from ${data.pickup_location?.business_name || 'Business'}\nEarnings: $${(data.earnings || 0).toFixed(2)}`,
        [
          { text: 'View Details', onPress: () => setSelectedTab('Available') }
        ]
      );
    });

    // Listen for order status updates
    const unsubscribeStatusUpdate = orderWebSocketService.on('status_update', (data) => {
      console.log('📊 Courier order status update:', data);

      // Update delivery status in the list
      setDeliveries(prev => prev.map(delivery =>
        delivery.order_id === data.order_id
          ? { ...delivery, status: data.new_status }
          : delivery
      ));

      // If order is cancelled or completed by someone else, remove from available
      if (data.new_status === 'cancelled' ||
          (data.new_status === 'courier_assigned' && data.courier_id !== user?.id)) {
        setDeliveries(prev => prev.filter(d => d.order_id !== data.order_id));

        // Clear timer if exists
        if (timerRefs.current[data.order_id]) {
          clearInterval(timerRefs.current[data.order_id]);
          delete timerRefs.current[data.order_id];
        }
      }
    });

    return () => {
      unsubscribeNewDelivery();
      unsubscribeStatusUpdate();
      // Clear all timers
      Object.values(timerRefs.current).forEach(timer => clearInterval(timer));
    };
  }, [user]);
  
  useEffect(() => {
    loadDeliveries();
  }, [selectedTab]);

  const loadCourierProfile = async () => {
    try {
      const response = await courierApi.getProfile();
      console.log('Courier profile loaded:', response);
      setCourierProfile(response);
      setIsOpen(response.is_online || false);
    } catch (error) {
      console.error('Error loading courier profile:', error);
      // Handle 404 or unauthorized errors
      if (error.response?.status === 404) {
        Alert.alert(
          'Profile Not Found',
          'Please complete your courier registration first.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else if (error.response?.status === 401) {
        Alert.alert(
          'Session Expired',
          'Please log in again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const startAcceptTimer = (deliveryId, initialTime = 60) => {
    // Clear existing timer if any
    if (timerRefs.current[deliveryId]) {
      clearInterval(timerRefs.current[deliveryId]);
    }
    
    // Set initial timer value
    setAcceptTimers(prev => ({ ...prev, [deliveryId]: initialTime }));

    // Start countdown
    timerRefs.current[deliveryId] = setInterval(() => {
      setAcceptTimers(prev => {
        const newTime = (prev[deliveryId] || initialTime) - 1;
        if (newTime <= 0) {
          clearInterval(timerRefs.current[deliveryId]);
          delete timerRefs.current[deliveryId];
          // Remove delivery from available list
          setDeliveries(prevDeliveries =>
            prevDeliveries.filter(d => d.id !== deliveryId)
          );
          return { ...prev, [deliveryId]: 0 };
        }
        return { ...prev, [deliveryId]: newTime };
      });
    }, 1000);
  };

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      let response;
      
      switch (selectedTab) {
        case 'Available':
          response = await courierApi.getAvailableDeliveries();
          break;
        case 'Active':
          response = await courierApi.getActiveOrders();
          break;
        case 'Completed':
          response = await courierApi.getDeliveryHistory();
          break;
      }

      console.log(`Loaded ${selectedTab} deliveries:`, response);
      const deliveryList = response.results || response.data || [];
      setDeliveries(deliveryList);

      // Start timers for available deliveries
      if (selectedTab === 'Available') {
        deliveryList.forEach(delivery => {
          if (delivery.expires_at) {
            const expiresAt = new Date(delivery.expires_at);
            const now = new Date();
            const timeRemaining = Math.floor((expiresAt - now) / 1000);
            if (timeRemaining > 0) {
              startAcceptTimer(delivery.id, timeRemaining);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error loading deliveries:', error);
      setDeliveries([]);
      
      if (error.response?.status !== 404) {
        Alert.alert(
          'Error',
          error.response?.data?.detail || 'Failed to load deliveries. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDeliveries();
    setRefreshing(false);
  };

  const toggleOnlineStatus = async () => {
    const newStatus = !isOpen;
    const previousStatus = isOpen;
    
    // Optimistic update
    setIsOpen(newStatus);

    try {
      await courierApi.updateOnlineStatus(newStatus);
      
      if (newStatus) {
        Alert.alert(
          'Business is OPEN',
          'You can now receive delivery requests.',
          [{ text: 'OK' }]
        );
        // Refresh available deliveries when going online
        if (selectedTab === 'Available') {
          loadDeliveries();
        }
      } else {
        Alert.alert(
          'Business is CLOSED',
          'You will not receive new delivery requests.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
      // Revert on error
      setIsOpen(previousStatus);
      Alert.alert(
        'Connection Error',
        'Failed to update online status. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAcceptDelivery = async (delivery) => {
    const earnings = delivery.courier_earnings || delivery.estimated_earnings || 0;
    const distance = delivery.total_distance || delivery.estimated_distance || 0;
    
    Alert.alert(
      'Accept Delivery',
      `From: ${delivery.pickup_address || 'Restaurant'}\nTo: ${delivery.delivery_address || 'Customer'}\n\nDistance: ${distance} km\nEstimated earnings: $${earnings.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await courierApi.acceptDelivery(delivery.id);
              
              // Clear timer
              if (timerRefs.current[delivery.id]) {
                clearInterval(timerRefs.current[delivery.id]);
                delete timerRefs.current[delivery.id];
              }
              
              // Show success and switch to active tab
              Alert.alert(
                'Delivery Accepted',
                'Navigate to the pickup location to collect the order.',
                [{ 
                  text: 'OK',
                  onPress: () => {
                    setSelectedTab('Active');
                    loadDeliveries();
                  }
                }]
              );
            } catch (error) {
              console.error('Error accepting delivery:', error);
              
              if (error.response?.status === 409) {
                Alert.alert(
                  'Already Taken',
                  'This delivery has already been accepted by another courier.'
                );
                loadDeliveries(); // Refresh the list
              } else {
                Alert.alert(
                  'Error',
                  error.response?.data?.detail || 'Failed to accept delivery. Please try again.'
                );
              }
            }
          },
        },
      ]
    );
  };

  const handlePickupComplete = (delivery) => {
    navigation.navigate('PickupPinVerification', {
      deliveryId: delivery.id,
      businessName: delivery.business_name,
      pickupAddress: delivery.pickup_address,
    });
  };

  const handleDeliveryComplete = (delivery) => {
    navigation.navigate('DeliveryPinVerification', {
      deliveryId: delivery.id,
      customerName: delivery.customer_name,
      deliveryAddress: delivery.delivery_address,
      courierEarnings: delivery.courier_earnings,
    });
  };

  const openNavigation = (delivery, type = 'delivery') => {
    try {
      let lat, lng, address, fallbackAddress;

      if (type === 'pickup') {
        lat = delivery.pickup_latitude;
        lng = delivery.pickup_longitude;
        address = delivery.pickup_address;
        fallbackAddress = delivery.pickup_address;
      } else {
        lat = delivery.delivery_latitude;
        lng = delivery.delivery_longitude;
        address = delivery.delivery_address;
        fallbackAddress = delivery.delivery_address;
      }

      console.log(`🗺️ Opening navigation to ${type}:`, { lat, lng, address });

      // Create navigation URL with multiple fallback options
      let navigationUrl;

      if (lat && lng) {
        // Use coordinates for precise navigation (best for Africa with dropped pins)
        if (Platform.OS === 'ios') {
          // iOS - try Apple Maps first, then Google Maps
          navigationUrl = `maps://app?daddr=${lat},${lng}`;

          Linking.openURL(navigationUrl).catch(() => {
            // Fallback to Google Maps
            const googleUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
            Linking.openURL(googleUrl).catch(() => {
              // Final fallback to web Google Maps
              const webUrl = `https://maps.google.com/maps?daddr=${lat},${lng}`;
              Linking.openURL(webUrl).catch(() => {
                Alert.alert('Navigation Error', 'Unable to open maps application');
              });
            });
          });
        } else {
          // Android - try Google Maps first
          navigationUrl = `google.navigation:q=${lat},${lng}`;

          Linking.openURL(navigationUrl).catch(() => {
            // Fallback to Google Maps app
            const googleUrl = `geo:${lat},${lng}?q=${lat},${lng}`;
            Linking.openURL(googleUrl).catch(() => {
              // Final fallback to web Google Maps
              const webUrl = `https://maps.google.com/maps?daddr=${lat},${lng}`;
              Linking.openURL(webUrl).catch(() => {
                Alert.alert('Navigation Error', 'Unable to open maps application');
              });
            });
          });
        }
      } else {
        // Fallback to address-based navigation
        console.log('🗺️ No coordinates available, using address:', address);
        const encodedAddress = encodeURIComponent(fallbackAddress || 'Unknown Location');

        if (Platform.OS === 'ios') {
          navigationUrl = `maps://app?daddr=${encodedAddress}`;
        } else {
          navigationUrl = `geo:0,0?q=${encodedAddress}`;
        }

        Linking.openURL(navigationUrl).catch(() => {
          Alert.alert('Navigation Error', 'Unable to open maps. Please check the address manually.');
        });
      }

      // Show helpful info to courier
      const locationInfo = lat && lng
        ? `📍 Navigating to precise location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
        : `📍 Navigating to: ${fallbackAddress}`;

      Alert.alert(
        'Navigation Opened',
        locationInfo,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to open navigation');
    }
  };

  const renderAvailableDelivery = ({ item }) => {
    const timeRemaining = acceptTimers[item.id] || 0;

    return (
      <View style={styles.deliveryCard}>
        <View style={styles.deliveryHeader}>
          <View style={styles.deliveryRoute}>
            <Icon name="location" size={16} color="#10b981" />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.pickup_address}
            </Text>
          </View>
          <Icon name="arrow-forward" size={16} color="#6b7280" style={styles.arrowIcon} />
          <View style={styles.deliveryRoute}>
            <Icon name="location" size={16} color="#ef4444" />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.delivery_address}
            </Text>
          </View>
        </View>

        <View style={styles.deliveryDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Distance:</Text>
            <Text style={styles.detailValue}>{item.total_distance || '0.0'} km</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Earnings:</Text>
            <Text style={styles.earningsValue}>${item.courier_earnings?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Business:</Text>
            <Text style={styles.detailValue}>{item.business_name}</Text>
          </View>
        </View>

        {timeRemaining > 0 && (
          <View style={styles.timerContainer}>
            <Icon name="time-outline" size={16} color="#ef4444" />
            <Text style={[
              styles.timerText,
              timeRemaining <= 10 && styles.timerTextUrgent
            ]}>
              {timeRemaining}s to accept
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptDelivery(item)}
        >
          <Text style={styles.acceptButtonText}>Accept Delivery</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderActiveDelivery = ({ item }) => (
    <View style={styles.deliveryCard}>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>
          {item.status === 'courier_assigned' ? 'Ready for Pickup' :
           item.status === 'picked' ? 'In Transit' : item.status}
        </Text>
      </View>

      <View style={styles.deliveryHeader}>
        <Text style={styles.orderNumber}>Order #{item.order_id}</Text>
        <Text style={styles.timeText}>{new Date(item.created_at).toLocaleTimeString()}</Text>
      </View>

      <View style={styles.addressSection}>
        <View style={styles.addressRow}>
          <View style={[styles.addressIcon, styles.pickupIcon]}>
            <Icon name="storefront" size={16} color="#10b981" />
          </View>
          <View style={styles.addressDetails}>
            <Text style={styles.addressLabel}>Pickup from {item.business_name}</Text>
            <Text style={styles.addressText}>{item.pickup_address}</Text>
          </View>
        </View>

        <View style={styles.addressRow}>
          <View style={[styles.addressIcon, styles.deliveryIcon]}>
            <Icon name="home" size={16} color="#ef4444" />
          </View>
          <View style={styles.addressDetails}>
            <Text style={styles.addressLabel}>Deliver to {item.customer_name}</Text>
            <Text style={styles.addressText}>{item.delivery_address}</Text>
            {item.delivery_notes && (
              <Text style={styles.notesText}>Note: {item.delivery_notes}</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.earningsSection}>
        <Text style={styles.earningsLabel}>Your Earnings:</Text>
        <Text style={styles.earningsAmount}>${item.courier_earnings?.toFixed(2) || '0.00'}</Text>
      </View>

      {item.status === 'courier_assigned' && (
        <>
          <TouchableOpacity
            style={[styles.actionButton, styles.navigationButton]}
            onPress={() => openNavigation(item, 'pickup')}
          >
            <Icon name="navigate" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Navigate to Pickup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePickupComplete(item)}
          >
            <Icon name="qr-code" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Enter Pickup PIN</Text>
          </TouchableOpacity>
        </>
      )}

      {item.status === 'picked' && (
        <>
          <TouchableOpacity
            style={[styles.actionButton, styles.navigationButton]}
            onPress={() => openNavigation(item, 'delivery')}
          >
            <Icon name="navigate" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Navigate to Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleDeliveryComplete(item)}
          >
            <Icon name="checkmark-circle" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Complete Delivery</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderCompletedDelivery = ({ item }) => (
    <View style={[styles.deliveryCard, styles.completedCard]}>
      <View style={styles.completedHeader}>
        <Text style={styles.orderNumber}>Order #{item.order_id}</Text>
        <View style={styles.completedBadge}>
          <Icon name="checkmark-circle" size={16} color="#10b981" />
          <Text style={styles.completedText}>Delivered</Text>
        </View>
      </View>

      <Text style={styles.completedTime}>
        {new Date(item.completed_at).toLocaleDateString()} at {new Date(item.completed_at).toLocaleTimeString()}
      </Text>

      <View style={styles.completedRoute}>
        <Text style={styles.routeCompletedText}>
          {item.pickup_address} → {item.delivery_address}
        </Text>
      </View>

      <View style={styles.completedDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Customer:</Text>
          <Text style={styles.detailValue}>{item.customer_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Business:</Text>
          <Text style={styles.detailValue}>{item.business_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Earnings:</Text>
          <Text style={styles.earningsValueCompleted}>
            ${item.courier_earnings?.toFixed(2) || '0.00'}
            {item.payment_status === 'paid' && (
              <Icon name="checkmark-circle" size={14} color="#10b981" style={{ marginLeft: 4 }} />
            )}
          </Text>
        </View>
      </View>

      {item.customer_rating && (
        <View style={styles.ratingSection}>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(star => (
              <Icon
                key={star}
                name={star <= item.customer_rating ? 'star' : 'star-outline'}
                size={16}
                color="#f59e0b"
              />
            ))}
          </View>
          {item.customer_feedback && (
            <Text style={styles.feedbackText}>"{item.customer_feedback}"</Text>
          )}
        </View>
      )}
    </View>
  );

  const renderDelivery = ({ item }) => {
    switch (selectedTab) {
      case 'Available':
        return renderAvailableDelivery({ item });
      case 'Active':
        return renderActiveDelivery({ item });
      case 'Completed':
        return renderCompletedDelivery({ item });
      default:
        return null;
    }
  };

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon
        name={selectedTab === 'Available' ? 'time-outline' :
              selectedTab === 'Active' ? 'bicycle-outline' : 'checkmark-done-outline'}
        size={64}
        color="#9ca3af"
      />
      <Text style={styles.emptyTitle}>
        {selectedTab === 'Available' ? 'No Available Deliveries' :
         selectedTab === 'Active' ? 'No Active Deliveries' :
         'No Completed Deliveries'}
      </Text>
      <Text style={styles.emptyText}>
        {selectedTab === 'Available' ?
          (isOpen ? 'New deliveries will appear here' : 'Open your business to see deliveries') :
         selectedTab === 'Active' ? 'Your active deliveries will appear here' :
         'Your delivery history will appear here'}
      </Text>
    </View>
  );

  const todayEarnings = deliveries
    .filter(d => d.status === 'delivered' &&
            new Date(d.completed_at).toDateString() === new Date().toDateString())
    .reduce((sum, d) => sum + (d.courier_earnings || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deliveries</Text>
        <View style={styles.onlineToggle}>
          <Text style={[styles.onlineText, !isOpen && styles.offlineText]}>
            {isOpen ? 'Open' : 'Closed'}
          </Text>
          <Switch
            value={isOpen}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: '#6b7280', true: '#10b981' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {isOpen && (
        <View style={styles.earningsBar}>
          <Icon name="cash-outline" size={20} color="#10b981" />
          <Text style={styles.earningsBarText}>Today's Earnings: ${todayEarnings.toFixed(2)}</Text>
        </View>
      )}

      <View style={styles.tabContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => {
              setSelectedTab(tab);
              loadDeliveries();
            }}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={deliveries}
          renderItem={renderDelivery}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={EmptyList}
          showsVerticalScrollIndicator={false}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#14532d',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  offlineText: {
    color: '#ef4444',
  },
  earningsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#10b981',
    gap: 8,
  },
  earningsBarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  deliveryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    backgroundColor: '#f9fafb',
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryRoute: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  arrowIcon: {
    marginHorizontal: 8,
  },
  deliveryDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  earningsValue: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
    gap: 4,
  },
  timerText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  timerTextUrgent: {
    fontWeight: 'bold',
  },
  acceptButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timeText: {
    fontSize: 13,
    color: '#6b7280',
  },
  addressSection: {
    marginBottom: 16,
  },
  addressRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  addressIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pickupIcon: {
    backgroundColor: '#f0fdf4',
  },
  deliveryIcon: {
    backgroundColor: '#fef2f2',
  },
  addressDetails: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  notesText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  earningsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#374151',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  navigationButton: {
    backgroundColor: '#6b7280',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  completedTime: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  completedRoute: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  routeCompletedText: {
    fontSize: 13,
    color: '#374151',
  },
  completedDetails: {
    marginBottom: 12,
  },
  earningsValueCompleted: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});