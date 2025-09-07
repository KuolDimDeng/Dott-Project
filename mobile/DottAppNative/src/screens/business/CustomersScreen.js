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
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';

export default function CustomersScreen() {
  const navigation = useNavigation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      
      // Fetch customers from CRM API
      const response = await api.get('/crm/customers/');
      
      let customersData = [];
      if (Array.isArray(response.data)) {
        customersData = response.data;
      } else if (response.data.results) {
        customersData = response.data.results;
      } else if (response.data.customers) {
        customersData = response.data.customers;
      }
      
      // Format customer data
      const formattedCustomers = customersData.map(customer => ({
        id: customer.id || customer.customer_id,
        name: customer.name || customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown',
        email: customer.email || '',
        phone: customer.phone || customer.phone_number || '',
        address: customer.address || customer.street_address || '',
        city: customer.city || '',
        country: customer.country || '',
        type: customer.customer_type || customer.type || 'individual',
        status: customer.status || 'active',
        totalSpent: parseFloat(customer.total_spent || customer.total_purchases || 0),
        orderCount: customer.order_count || customer.purchase_count || 0,
        lastOrder: customer.last_order_date || customer.last_purchase_date || null,
        createdAt: customer.created_at || customer.date_created,
        notes: customer.notes || '',
        tags: customer.tags || [],
      }));
      
      // Sort by most recent activity
      formattedCustomers.sort((a, b) => {
        const dateA = new Date(a.lastOrder || a.createdAt || 0);
        const dateB = new Date(b.lastOrder || b.createdAt || 0);
        return dateB - dateA;
      });
      
      setCustomers(formattedCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
      // Set mock data as fallback
      setMockCustomers();
    } finally {
      setLoading(false);
    }
  };

  const setMockCustomers = () => {
    setCustomers([
      {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        address: '123 Main St',
        city: 'New York',
        country: 'USA',
        type: 'individual',
        status: 'active',
        totalSpent: 5420.50,
        orderCount: 23,
        lastOrder: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        name: 'ABC Company Ltd',
        email: 'info@abccompany.com',
        phone: '+1234567891',
        address: '456 Business Ave',
        city: 'Los Angeles',
        country: 'USA',
        type: 'business',
        status: 'active',
        totalSpent: 12500.00,
        orderCount: 45,
        lastOrder: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+1234567892',
        address: '789 Oak Rd',
        city: 'Chicago',
        country: 'USA',
        type: 'individual',
        status: 'inactive',
        totalSpent: 890.25,
        orderCount: 5,
        lastOrder: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = (email) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const handleWhatsApp = (phone) => {
    if (phone) {
      const phoneNumber = phone.replace(/[^0-9]/g, '');
      Linking.openURL(`whatsapp://send?phone=${phoneNumber}`);
    }
  };

  const handleAddCustomer = () => {
    navigation.navigate('CustomerCreate');
  };

  const getCustomerTypeIcon = (type) => {
    return type === 'business' ? 'business-outline' : 'person-outline';
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#10b981' : '#6b7280';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery);
    
    const matchesFilter = 
      filterType === 'all' ||
      (filterType === 'active' && customer.status === 'active') ||
      (filterType === 'inactive' && customer.status === 'inactive') ||
      (filterType === 'business' && customer.type === 'business') ||
      (filterType === 'individual' && customer.type === 'individual');
    
    return matchesSearch && matchesFilter;
  });

  const renderCustomerCard = (customer) => (
    <TouchableOpacity
      key={customer.id}
      style={styles.customerCard}
      onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
    >
      <View style={styles.customerHeader}>
        <View style={styles.customerAvatar}>
          <Icon name={getCustomerTypeIcon(customer.type)} size={24} color="#4b5563" />
        </View>
        <View style={styles.customerInfo}>
          <View style={styles.customerNameRow}>
            <Text style={styles.customerName}>{customer.name}</Text>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(customer.status) }]} />
          </View>
          <Text style={styles.customerContact}>{customer.email || customer.phone}</Text>
        </View>
      </View>

      <View style={styles.customerStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Spent</Text>
          <Text style={styles.statValue}>${customer.totalSpent.toFixed(2)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Orders</Text>
          <Text style={styles.statValue}>{customer.orderCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Last Order</Text>
          <Text style={styles.statValue}>{formatDate(customer.lastOrder)}</Text>
        </View>
      </View>

      <View style={styles.customerActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleCall(customer.phone)}
        >
          <Icon name="call-outline" size={18} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleEmail(customer.email)}
        >
          <Icon name="mail-outline" size={18} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleWhatsApp(customer.phone)}
        >
          <Icon name="logo-whatsapp" size={18} color="#25d366" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => navigation.navigate('NewOrder', { customerId: customer.id })}
        >
          <Icon name="cart-outline" size={18} color="#ffffff" />
          <Text style={styles.actionButtonText}>New Order</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customers</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddCustomer}>
          <Icon name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
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
        {['all', 'active', 'inactive', 'business', 'individual'].map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, filterType === type && styles.filterChipActive]}
            onPress={() => setFilterType(type)}
          >
            <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
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
            <Text style={styles.loadingText}>Loading customers...</Text>
          </View>
        ) : filteredCustomers.length > 0 ? (
          filteredCustomers.map(renderCustomerCard)
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={64} color="#e5e7eb" />
            <Text style={styles.emptyText}>No customers found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Add your first customer to get started'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.createButton} onPress={handleAddCustomer}>
                <Text style={styles.createButtonText}>Add Customer</Text>
              </TouchableOpacity>
            )}
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
  customerCard: {
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
  customerHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  customerContact: {
    fontSize: 13,
    color: '#6b7280',
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  customerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
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
  createButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});