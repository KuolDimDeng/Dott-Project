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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';

export default function PurchasesScreen() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, pending, delivered, picked_up

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
    },
  ];

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setPurchases(samplePurchases);
      setLoading(false);
    }, 1000);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setPurchases(samplePurchases);
      setRefreshing(false);
    }, 1500);
  };

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
    <TouchableOpacity style={styles.purchaseCard}>
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
});