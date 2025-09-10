import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import orderVerificationApi from '../services/orderVerificationApi';
import api from '../services/api';

export default function PurchasesScreen() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, pending, delivered, picked_up
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Sample purchase data - will be replaced with API calls
  const samplePurchases = [
    {
      id: '1',
      store: 'Konyo Konyo Market',
      items: [
        { name: 'Fresh Vegetables', quantity: 2, price: 15.00 },
        { name: 'Rice 5kg', quantity: 1, price: 25.00 }
      ],
      total: 40.00,
      status: 'delivered',
      orderDate: '2024-01-05T10:30:00',
      deliveryDate: '2024-01-05T14:30:00',
      deliveryAddress: 'Hai Malakal, Juba',
      driver: 'John Doe',
      driverPhone: '+211 920 111 222',
      pickupCode: 'K234',
      deliveryCode: 'E456',
      pickupVerified: false,
      deliveryVerified: false,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      store: 'Juba Town Pharmacy',
      items: [
        { name: 'Paracetamol', quantity: 2, price: 5.00 },
        { name: 'Vitamin C', quantity: 1, price: 10.00 }
      ],
      total: 15.00,
      status: 'picked_up',
      orderDate: '2024-01-04T09:00:00',
      pickupDate: '2024-01-04T09:30:00',
      pickupCode: 'P789',
      pickupVerified: true,
    },
    {
      id: '3',
      store: 'Custom Market Traders',
      items: [
        { name: 'Cooking Oil 5L', quantity: 1, price: 30.00 },
        { name: 'Sugar 2kg', quantity: 2, price: 20.00 }
      ],
      total: 50.00,
      status: 'pending',
      orderDate: '2024-01-05T15:00:00',
      estimatedDelivery: '2024-01-05T18:00:00',
      pickupCode: 'A123',
      deliveryCode: 'B456',
      pickupVerified: false,
      deliveryVerified: false,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      store: 'Juba Restaurant',
      items: [
        { name: 'Grilled Chicken', quantity: 1, price: 25.00 },
        { name: 'Soft Drink', quantity: 2, price: 6.00 }
      ],
      total: 31.00,
      status: 'delivered',
      orderDate: '2024-01-03T19:00:00',
      deliveryDate: '2024-01-03T19:45:00',
      deliveryAddress: 'Airport Road, Juba',
      driver: 'Sarah Smith',
      driverPhone: '+211 920 333 444',
      pickupCode: 'X987',
      deliveryCode: 'Y654',
      pickupVerified: true,
      deliveryVerified: true,
    },
  ];

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      // Fetch real orders from API
      const response = await api.get('/consumer-orders/');
      const orders = response.data.results || response.data || [];
      
      // Get stored passcodes for each order
      const ordersWithPasscodes = await Promise.all(
        orders.map(async (order) => {
          const storedPasscodes = await orderVerificationApi.getLocalPasscodes(order.id);
          return {
            ...order,
            pickupCode: storedPasscodes?.pickupCode || order.pickupCode,
            deliveryCode: storedPasscodes?.deliveryCode || order.deliveryCode,
            expiresAt: storedPasscodes?.expiresAt || order.expiresAt,
          };
        })
      );
      
      setPurchases(ordersWithPasscodes.length > 0 ? ordersWithPasscodes : samplePurchases);
    } catch (error) {
      console.error('Error loading purchases:', error);
      // Fallback to sample data
      setPurchases(samplePurchases);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPurchases();
    setRefreshing(false);
  };

  const showPasscodes = (order) => {
    setSelectedOrder(order);
    setShowPasscodeModal(true);
  };

  const renderPasscodeModal = () => (
    <Modal
      visible={showPasscodeModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPasscodeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.passcodeModal}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setShowPasscodeModal(false)}
          >
            <Icon name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>Order Passcodes</Text>
          <Text style={styles.modalSubtitle}>
            Share these codes for pickup and delivery
          </Text>
          
          {selectedOrder?.pickupCode && (
            <View style={styles.passcodeBox}>
              <View style={styles.passcodeHeader}>
                <Icon name="business-outline" size={20} color="#2563eb" />
                <Text style={styles.passcodeLabel}>PICKUP CODE</Text>
                {selectedOrder.pickupVerified && (
                  <Icon name="checkmark-circle" size={20} color="#10b981" />
                )}
              </View>
              <Text style={styles.passcodeValue}>{selectedOrder.pickupCode}</Text>
              <Text style={styles.passcodeHint}>
                Give this to the business when picking up
              </Text>
            </View>
          )}
          
          {selectedOrder?.deliveryCode && (
            <View style={[styles.passcodeBox, styles.deliveryBox]}>
              <View style={styles.passcodeHeader}>
                <Icon name="bicycle-outline" size={20} color="#10b981" />
                <Text style={styles.passcodeLabel}>DELIVERY CODE</Text>
                {selectedOrder.deliveryVerified && (
                  <Icon name="checkmark-circle" size={20} color="#10b981" />
                )}
              </View>
              <Text style={styles.passcodeValue}>{selectedOrder.deliveryCode}</Text>
              <Text style={styles.passcodeHint}>
                Give this to the courier when receiving
              </Text>
            </View>
          )}
          
          {selectedOrder?.expiresAt && !selectedOrder?.deliveryVerified && (
            <View style={styles.expiryInfo}>
              <Icon name="time-outline" size={16} color="#ef4444" />
              <Text style={styles.expiryText}>
                Codes expire at {new Date(selectedOrder.expiresAt).toLocaleTimeString()}
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => {
              Alert.alert('Share', 'Sharing passcodes...');
            }}
          >
            <Icon name="share-outline" size={20} color="#2563eb" />
            <Text style={styles.shareButtonText}>Share Codes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const getFilteredPurchases = () => {
    if (selectedFilter === 'all') return purchases;
    return purchases.filter(p => p.status === selectedFilter);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#f59e0b';
      case 'delivered': return '#10b981';
      case 'picked_up': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return 'time-outline';
      case 'delivered': return 'checkmark-circle-outline';
      case 'picked_up': return 'bag-check-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderPurchase = ({ item }) => (
    <TouchableOpacity style={styles.purchaseCard} onPress={() => showPasscodes(item)}>
      <View style={styles.purchaseHeader}>
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{item.store}</Text>
          <Text style={styles.orderDate}>{formatDate(item.orderDate)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Icon name={getStatusIcon(item.status)} size={16} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.itemsContainer}>
        {item.items.map((product, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName}>{product.name} x{product.quantity}</Text>
            <Text style={styles.itemPrice}>${product.price.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.purchaseFooter}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>${item.total.toFixed(2)}</Text>
        </View>
      </View>

      {item.status === 'delivered' && item.driver && (
        <View style={styles.driverInfo}>
          <Icon name="car-outline" size={16} color="#6b7280" />
          <Text style={styles.driverText}>Delivered by {item.driver}</Text>
          <TouchableOpacity>
            <Icon name="call-outline" size={16} color="#2563eb" />
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'pending' && (
        <View style={styles.pendingInfo}>
          <Icon name="time-outline" size={16} color="#f59e0b" />
          <Text style={styles.pendingText}>
            Estimated delivery: {formatDate(item.estimatedDelivery)}
          </Text>
        </View>
      )}

      {item.deliveryAddress && (
        <View style={styles.addressInfo}>
          <Icon name="location-outline" size={14} color="#6b7280" />
          <Text style={styles.addressText}>{item.deliveryAddress}</Text>
        </View>
      )}

      {(item.pickupCode || item.deliveryCode) && (
        <View style={styles.passcodeSection}>
          <TouchableOpacity 
            style={styles.passcodeButton}
            onPress={() => showPasscodes(item)}
          >
            <Icon name="qr-code-outline" size={16} color="#2563eb" />
            <Text style={styles.passcodeButtonText}>View Passcodes</Text>
            {(!item.pickupVerified || !item.deliveryVerified) && (
              <View style={styles.activeBadge} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Purchases</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="filter-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Filter Pills */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {['all', 'pending', 'delivered', 'picked_up'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterPill,
              selectedFilter === filter && styles.filterPillActive
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[
              styles.filterPillText,
              selectedFilter === filter && styles.filterPillTextActive
            ]}>
              {filter.replace('_', ' ').charAt(0).toUpperCase() + filter.replace('_', ' ').slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading your purchases...</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredPurchases()}
          renderItem={renderPurchase}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="receipt-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No purchases yet</Text>
              <Text style={styles.emptyText}>
                Your purchase history will appear here
              </Text>
            </View>
          }
        />
      )}
      
      {renderPasscodeModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#14532d',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  filterButton: {
    padding: 8,
  },
  filterContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#2563eb',
  },
  filterPillText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 20,
  },
  purchaseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemsContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  purchaseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  driverText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  pendingText: {
    fontSize: 13,
    color: '#f59e0b',
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  addressText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  passcodeSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  passcodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  passcodeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
    marginLeft: 6,
  },
  activeBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passcodeModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalClose: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  passcodeBox: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginBottom: 16,
  },
  deliveryBox: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  passcodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  passcodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  passcodeValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 4,
    textAlign: 'center',
    marginVertical: 8,
  },
  passcodeHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 20,
  },
  expiryText: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 6,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});