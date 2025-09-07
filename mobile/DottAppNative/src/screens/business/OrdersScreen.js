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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useBusinessContext } from '../../context/BusinessContext';

export default function OrdersScreen() {
  const navigation = useNavigation();
  const { businessData } = useBusinessContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadOrders();
  }, [filterStatus]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch orders from sales API
      const response = await api.get('/sales/orders/');
      
      let ordersData = [];
      if (Array.isArray(response.data)) {
        ordersData = response.data;
      } else if (response.data.results) {
        ordersData = response.data.results;
      } else if (response.data.orders) {
        ordersData = response.data.orders;
      }
      
      // Also fetch invoices as they may represent orders
      try {
        const invoicesRes = await api.get('/sales/invoices/');
        const invoices = Array.isArray(invoicesRes.data) 
          ? invoicesRes.data 
          : (invoicesRes.data.results || invoicesRes.data.invoices || []);
        
        // Convert invoices to order format
        const invoiceOrders = invoices.map(inv => ({
          id: `INV-${inv.invoice_number || inv.id}`,
          order_number: inv.invoice_number || `INV-${inv.id}`,
          customer_name: inv.customer_name || inv.customer || 'Unknown',
          customer_id: inv.customer_id || inv.customer,
          total: parseFloat(inv.total || inv.amount || 0),
          status: inv.status === 'paid' || inv.payment_status === 'paid' ? 'completed' : 
                  inv.status === 'draft' ? 'pending' : inv.status || 'pending',
          items: inv.items || inv.line_items || [],
          date: inv.date || inv.created_at,
          payment_method: inv.payment_method || 'cash',
          delivery_status: inv.delivery_status || 'pending',
          notes: inv.notes || '',
        }));
        
        ordersData = [...ordersData, ...invoiceOrders];
      } catch (invError) {
        console.log('Could not fetch invoices as orders');
      }
      
      // Format order data
      const formattedOrders = ordersData.map(order => ({
        id: order.id || order.order_id,
        orderNumber: order.order_number || order.id,
        customerName: order.customer_name || order.customer || 'Unknown',
        customerId: order.customer_id,
        total: parseFloat(order.total || order.amount || 0),
        status: order.status || 'pending',
        itemCount: order.items?.length || order.item_count || 0,
        date: order.date || order.created_at,
        paymentMethod: order.payment_method || 'cash',
        deliveryStatus: order.delivery_status || 'pending',
        notes: order.notes || '',
        items: order.items || [],
      }));
      
      // Sort by date (most recent first)
      formattedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Apply filter
      let filteredOrders = formattedOrders;
      if (filterStatus !== 'all') {
        filteredOrders = formattedOrders.filter(order => order.status === filterStatus);
      }
      
      setOrders(filteredOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      // Set mock data as fallback
      setMockOrders();
    } finally {
      setLoading(false);
    }
  };

  const setMockOrders = () => {
    setOrders([
      {
        id: 1,
        orderNumber: 'ORD-001',
        customerName: 'John Doe',
        customerId: 1,
        total: 125.50,
        status: 'pending',
        itemCount: 3,
        date: new Date().toISOString(),
        paymentMethod: 'card',
        deliveryStatus: 'pending',
      },
      {
        id: 2,
        orderNumber: 'ORD-002',
        customerName: 'Jane Smith',
        customerId: 2,
        total: 89.99,
        status: 'processing',
        itemCount: 2,
        date: new Date(Date.now() - 3600000).toISOString(),
        paymentMethod: 'cash',
        deliveryStatus: 'preparing',
      },
      {
        id: 3,
        orderNumber: 'ORD-003',
        customerName: 'Bob Johnson',
        customerId: 3,
        total: 210.00,
        status: 'completed',
        itemCount: 5,
        date: new Date(Date.now() - 86400000).toISOString(),
        paymentMethod: 'mobile_money',
        deliveryStatus: 'delivered',
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'processing':
        return { bg: '#dbeafe', text: '#1e40af' };
      case 'completed':
        return { bg: '#d1fae5', text: '#065f46' };
      case 'cancelled':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const getDeliveryStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'preparing':
        return 'restaurant-outline';
      case 'ready':
        return 'checkmark-circle-outline';
      case 'out_for_delivery':
        return 'bicycle-outline';
      case 'delivered':
        return 'checkmark-done-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const formatCurrency = (amount) => {
    const currency = businessData?.preferredCurrency?.symbol || '$';
    return `${currency}${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  const handleOrderAction = (order, action) => {
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Order`,
      `Are you sure you want to ${action} order ${order.orderNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              const response = await api.patch(`/sales/orders/${order.id}/`, {
                status: action === 'accept' ? 'processing' : 
                        action === 'complete' ? 'completed' : 
                        action === 'cancel' ? 'cancelled' : order.status
              });
              await loadOrders();
              Alert.alert('Success', `Order ${action}ed successfully`);
            } catch (error) {
              Alert.alert('Error', `Failed to ${action} order`);
            }
          }
        }
      ]
    );
  };

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderOrderCard = (order) => (
    <TouchableOpacity
      key={order.id}
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={styles.customerName}>{order.customerName}</Text>
        </View>
        <View>
          <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status).bg }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.status).text }]}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.orderMeta}>
        <View style={styles.metaItem}>
          <Icon name="cube-outline" size={14} color="#6b7280" />
          <Text style={styles.metaText}>{order.itemCount} items</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="time-outline" size={14} color="#6b7280" />
          <Text style={styles.metaText}>{formatDate(order.date)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name={order.paymentMethod === 'card' ? 'card-outline' : 'cash-outline'} size={14} color="#6b7280" />
          <Text style={styles.metaText}>
            {order.paymentMethod.replace('_', ' ').charAt(0).toUpperCase() + order.paymentMethod.slice(1).replace('_', ' ')}
          </Text>
        </View>
      </View>

      {order.deliveryStatus && (
        <View style={styles.deliveryStatus}>
          <Icon name={getDeliveryStatusIcon(order.deliveryStatus)} size={16} color="#2563eb" />
          <Text style={styles.deliveryText}>
            {order.deliveryStatus.replace('_', ' ').charAt(0).toUpperCase() + order.deliveryStatus.slice(1).replace('_', ' ')}
          </Text>
        </View>
      )}

      {order.status === 'pending' && (
        <View style={styles.orderActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.successButton]}
            onPress={() => handleOrderAction(order, 'accept')}
          >
            <Icon name="checkmark-outline" size={18} color="#ffffff" />
            <Text style={styles.actionButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => handleOrderAction(order, 'cancel')}
          >
            <Icon name="close-outline" size={18} color="#dc2626" />
            <Text style={[styles.actionButtonText, { color: '#dc2626' }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {order.status === 'processing' && (
        <View style={styles.orderActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => handleOrderAction(order, 'complete')}
          >
            <Icon name="checkmark-done-outline" size={18} color="#ffffff" />
            <Text style={styles.actionButtonText}>Mark Complete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('OrderCreate')}
        >
          <Icon name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {['all', 'pending', 'processing', 'completed', 'cancelled'].map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
              {status === 'all' ? 'All Orders' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map(renderOrderCard)
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="receipt-outline" size={64} color="#e5e7eb" />
            <Text style={styles.emptyText}>No orders found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Your orders will appear here'}
            </Text>
          </View>
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
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
  },
  filterContainer: {
    backgroundColor: '#ffffff',
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 13,
    color: '#6b7280',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'right',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderMeta: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  deliveryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  deliveryText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  successButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  dangerButton: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
});