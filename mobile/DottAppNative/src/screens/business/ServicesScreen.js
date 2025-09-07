import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';

const ServicesScreen = ({ navigation }) => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    loadServicesData();
  }, []);

  const loadServicesData = async () => {
    try {
      setLoading(true);
      const [servicesRes, categoriesRes] = await Promise.all([
        api.get('/inventory/services/').catch(() => 
          api.get('/inventory/ultra/services/').catch(() => ({ data: [] }))
        ),
        api.get('/inventory/categories/').catch(() => ({ data: [] })),
      ]);

      const servicesData = servicesRes.data.results || servicesRes.data || [];
      setServices(servicesData.length > 0 ? servicesData : getMockServices());
      setCategories(categoriesRes.data.results || categoriesRes.data || getMockCategories());
    } catch (error) {
      console.error('Error loading services:', error);
      setServices(getMockServices());
      setCategories(getMockCategories());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockServices = () => [
    {
      id: 1,
      name: 'Web Design',
      description: 'Professional website design and development',
      category: 'Digital Services',
      price: 1500,
      duration: '2-4 weeks',
      status: 'active',
      bookings: 24,
      revenue: 36000,
      rating: 4.8,
      reviews: 18,
    },
    {
      id: 2,
      name: 'Logo Design',
      description: 'Custom logo and brand identity design',
      category: 'Design',
      price: 500,
      duration: '3-5 days',
      status: 'active',
      bookings: 45,
      revenue: 22500,
      rating: 4.9,
      reviews: 42,
    },
    {
      id: 3,
      name: 'SEO Optimization',
      description: 'Search engine optimization for better rankings',
      category: 'Digital Services',
      price: 800,
      duration: 'Monthly',
      status: 'active',
      bookings: 15,
      revenue: 12000,
      rating: 4.7,
      reviews: 12,
    },
    {
      id: 4,
      name: 'Business Consultation',
      description: 'Strategic business planning and advice',
      category: 'Consulting',
      price: 200,
      duration: '1 hour',
      status: 'paused',
      bookings: 32,
      revenue: 6400,
      rating: 4.6,
      reviews: 28,
    },
    {
      id: 5,
      name: 'Content Writing',
      description: 'Professional content creation and copywriting',
      category: 'Writing',
      price: 100,
      duration: 'Per article',
      status: 'active',
      bookings: 58,
      revenue: 5800,
      rating: 4.5,
      reviews: 52,
    },
  ];

  const getMockCategories = () => [
    { id: 1, name: 'Digital Services', count: 12 },
    { id: 2, name: 'Design', count: 8 },
    { id: 3, name: 'Consulting', count: 5 },
    { id: 4, name: 'Writing', count: 6 },
    { id: 5, name: 'Marketing', count: 4 },
  ];

  const handleAddService = () => {
    navigation.navigate('AddService');
  };

  const handleEditService = (service) => {
    navigation.navigate('EditService', { service });
  };

  const handleToggleStatus = async (service) => {
    const newStatus = service.status === 'active' ? 'paused' : 'active';
    try {
      await api.patch(`/inventory/services/${service.id}/`, {
        status: newStatus,
      });
      const updatedServices = services.map(s =>
        s.id === service.id ? { ...s, status: newStatus } : s
      );
      setServices(updatedServices);
      Alert.alert('Success', `Service ${newStatus === 'active' ? 'activated' : 'paused'}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update service status');
    }
  };

  const handleDeleteService = (service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/inventory/services/${service.id}/`);
              setServices(services.filter(s => s.id !== service.id));
              Alert.alert('Success', 'Service deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete service');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  const sortServices = (services) => {
    switch (sortBy) {
      case 'name':
        return [...services].sort((a, b) => a.name.localeCompare(b.name));
      case 'price':
        return [...services].sort((a, b) => b.price - a.price);
      case 'bookings':
        return [...services].sort((a, b) => b.bookings - a.bookings);
      case 'revenue':
        return [...services].sort((a, b) => b.revenue - a.revenue);
      default:
        return services;
    }
  };

  const filteredServices = sortServices(
    services.filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            service.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
  );

  const totalRevenue = services.reduce((sum, service) => sum + service.revenue, 0);
  const totalBookings = services.reduce((sum, service) => sum + service.bookings, 0);
  const activeServices = services.filter(s => s.status === 'active').length;

  const renderService = ({ item }) => (
    <TouchableOpacity 
      style={styles.serviceCard}
      onPress={() => handleEditService(item)}
    >
      <View style={styles.serviceHeader}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <Text style={styles.serviceCategory}>{item.category}</Text>
        </View>
        <Switch
          value={item.status === 'active'}
          onValueChange={() => handleToggleStatus(item)}
          trackColor={{ false: '#ccc', true: '#22c55e' }}
          thumbColor="white"
        />
      </View>

      <Text style={styles.serviceDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.serviceDetails}>
        <View style={styles.detailItem}>
          <Icon name="pricetag-outline" size={14} color="#666" />
          <Text style={styles.detailText}>{formatCurrency(item.price)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="time-outline" size={14} color="#666" />
          <Text style={styles.detailText}>{item.duration}</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="star" size={14} color="#f59e0b" />
          <Text style={styles.detailText}>{item.rating} ({item.reviews})</Text>
        </View>
      </View>

      <View style={styles.serviceStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.bookings}</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatCurrency(item.revenue)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      <View style={styles.serviceActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditService(item)}
        >
          <Icon name="create-outline" size={16} color="#2563eb" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.duplicateButton]}
          onPress={() => console.log('Duplicate service')}
        >
          <Icon name="copy-outline" size={16} color="#666" />
          <Text style={styles.duplicateButtonText}>Duplicate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteService(item)}
        >
          <Icon name="trash-outline" size={16} color="#ef4444" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services</Text>
        <TouchableOpacity onPress={handleAddService}>
          <Icon name="add-circle-outline" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="briefcase" size={20} color="#2563eb" />
          <Text style={styles.statNumber}>{activeServices}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="calendar" size={20} color="#22c55e" />
          <Text style={styles.statNumber}>{totalBookings}</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="cash" size={20} color="#f59e0b" />
          <Text style={styles.statNumber}>{formatCurrency(totalRevenue)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === 'all' && styles.selectedChip]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.chipText, selectedCategory === 'all' && styles.selectedChipText]}>
              All Services
            </Text>
          </TouchableOpacity>
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryChip, selectedCategory === category.name && styles.selectedChip]}
              onPress={() => setSelectedCategory(category.name)}
            >
              <Text style={[styles.chipText, selectedCategory === category.name && styles.selectedChipText]}>
                {category.name} ({category.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              Alert.alert(
                'Sort Services',
                'Choose sorting option:',
                [
                  { text: 'Name', onPress: () => setSortBy('name') },
                  { text: 'Price', onPress: () => setSortBy('price') },
                  { text: 'Bookings', onPress: () => setSortBy('bookings') },
                  { text: 'Revenue', onPress: () => setSortBy('revenue') },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
          >
            <Text style={styles.sortButtonText}>
              {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
            </Text>
            <Icon name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredServices}
        renderItem={renderService}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadServicesData} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="briefcase-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No services found</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddService}>
              <Text style={styles.addButtonText}>Add Your First Service</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
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
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },
  categoryFilter: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 10,
  },
  selectedChip: {
    backgroundColor: '#2563eb',
  },
  chipText: {
    fontSize: 13,
    color: '#666',
  },
  selectedChipText: {
    color: 'white',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sortLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 10,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  sortButtonText: {
    fontSize: 13,
    color: '#333',
    marginRight: 5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  serviceCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 10,
  },
  serviceDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  serviceStats: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  serviceActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  editButton: {
    backgroundColor: '#2563eb20',
  },
  editButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  duplicateButton: {
    backgroundColor: '#f0f0f0',
  },
  duplicateButtonText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  deleteButton: {
    backgroundColor: '#ef444420',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
  addButton: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});

export default ServicesScreen;