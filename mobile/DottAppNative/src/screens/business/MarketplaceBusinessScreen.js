import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';
import marketplaceApi from '../../services/marketplaceApi';

const MarketplaceBusinessScreen = ({ navigation }) => {
  const [businessListing, setBusinessListing] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    loadMarketplaceData();
  }, []);

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      const [listingRes, analyticsRes, productsRes] = await Promise.all([
        marketplaceApi.getBusinessListing().catch(() => ({ data: null })),
        marketplaceApi.getBusinessAnalytics().catch(() => ({ data: null })),
        marketplaceApi.getBusinessProducts().catch(() => ({ data: [] })),
      ]);

      setBusinessListing(listingRes.data || getMockBusinessListing());
      setAnalytics(analyticsRes.data || getMockAnalytics());
      setProducts(productsRes.data || getMockProducts());
      setIsPublished(listingRes.data?.is_published || false);
    } catch (error) {
      console.error('Error loading marketplace data:', error);
      setBusinessListing(getMockBusinessListing());
      setAnalytics(getMockAnalytics());
      setProducts(getMockProducts());
      setIsPublished(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMockBusinessListing = () => ({
    id: 1,
    name: 'My Business Store',
    description: 'Welcome to our online store! We offer quality products and excellent service.',
    category: 'Retail',
    subcategory: 'General Store',
    logo: null,
    banner: null,
    rating: 4.7,
    reviews: 124,
    location: 'Juba, South Sudan',
    phone: '+211 123 456 789',
    email: 'store@mybusiness.com',
    website: 'www.mybusiness.com',
    hours: {
      monday: '9:00 AM - 6:00 PM',
      tuesday: '9:00 AM - 6:00 PM',
      wednesday: '9:00 AM - 6:00 PM',
      thursday: '9:00 AM - 6:00 PM',
      friday: '9:00 AM - 6:00 PM',
      saturday: '10:00 AM - 4:00 PM',
      sunday: 'Closed',
    },
    delivery: true,
    pickup: true,
    payment_methods: ['Cash', 'Mobile Money', 'Card'],
    is_published: true,
  });

  const getMockAnalytics = () => ({
    views: 3456,
    visitors: 1234,
    orders: 89,
    revenue: 12450,
    conversion_rate: 7.2,
    avg_order_value: 140,
    top_products: [
      { name: 'Product A', sales: 45 },
      { name: 'Product B', sales: 32 },
      { name: 'Product C', sales: 28 },
    ],
    customer_locations: [
      { city: 'Juba', percentage: 65 },
      { city: 'Bor', percentage: 20 },
      { city: 'Wau', percentage: 15 },
    ],
  });

  const getMockProducts = () => [
    {
      id: 1,
      name: 'Premium Coffee',
      price: 25,
      stock: 150,
      sales: 45,
      status: 'active',
      image: null,
    },
    {
      id: 2,
      name: 'Organic Tea',
      price: 18,
      stock: 200,
      sales: 32,
      status: 'active',
      image: null,
    },
    {
      id: 3,
      name: 'Fresh Juice',
      price: 12,
      stock: 0,
      sales: 28,
      status: 'out_of_stock',
      image: null,
    },
  ];

  const handleTogglePublish = async () => {
    try {
      await marketplaceApi.updateBusinessListing({ is_published: !isPublished });
      setIsPublished(!isPublished);
      Alert.alert(
        'Success',
        isPublished ? 'Your business is now offline' : 'Your business is now live on the marketplace!'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update business status');
    }
  };

  const handleEditListing = () => {
    navigation.navigate('EditMarketplaceListing', { listing: businessListing });
  };

  const handleAddProduct = () => {
    navigation.navigate('AddMarketplaceProduct');
  };

  const handleManageOrders = () => {
    navigation.navigate('MarketplaceOrders');
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading marketplace data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadMarketplaceData} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Marketplace Business</Text>
          <TouchableOpacity onPress={handleEditListing}>
            <Icon name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Business Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.statusTitle}>Business Status</Text>
              <Text style={[styles.statusText, { color: isPublished ? '#22c55e' : '#ef4444' }]}>
                {isPublished ? 'Live on Marketplace' : 'Offline'}
              </Text>
            </View>
            <Switch
              value={isPublished}
              onValueChange={handleTogglePublish}
              trackColor={{ false: '#ccc', true: '#22c55e' }}
              thumbColor="white"
            />
          </View>
          {isPublished && (
            <View style={styles.statusInfo}>
              <Text style={styles.statusInfoText}>
                Your business is visible to customers in the marketplace
              </Text>
            </View>
          )}
        </View>

        {/* Analytics Overview */}
        {analytics && (
          <View style={styles.analyticsContainer}>
            <Text style={styles.sectionTitle}>Analytics Overview</Text>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsCard}>
                <Icon name="eye-outline" size={24} color="#2563eb" />
                <Text style={styles.analyticsValue}>{formatNumber(analytics.views)}</Text>
                <Text style={styles.analyticsLabel}>Views</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Icon name="people-outline" size={24} color="#22c55e" />
                <Text style={styles.analyticsValue}>{formatNumber(analytics.visitors)}</Text>
                <Text style={styles.analyticsLabel}>Visitors</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Icon name="cart-outline" size={24} color="#f59e0b" />
                <Text style={styles.analyticsValue}>{analytics.orders}</Text>
                <Text style={styles.analyticsLabel}>Orders</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Icon name="cash-outline" size={24} color="#8b5cf6" />
                <Text style={styles.analyticsValue}>{formatCurrency(analytics.revenue)}</Text>
                <Text style={styles.analyticsLabel}>Revenue</Text>
              </View>
            </View>

            <View style={styles.conversionRate}>
              <Text style={styles.conversionLabel}>Conversion Rate</Text>
              <Text style={styles.conversionValue}>{analytics.conversion_rate}%</Text>
            </View>
          </View>
        )}

        {/* Business Information */}
        {businessListing && (
          <View style={styles.businessInfoCard}>
            <Text style={styles.sectionTitle}>Business Information</Text>
            <View style={styles.infoRow}>
              <Icon name="business-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{businessListing.name}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Icon name="list-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Category</Text>
                <Text style={styles.infoValue}>{businessListing.category} - {businessListing.subcategory}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Icon name="location-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{businessListing.location}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Icon name="star" size={20} color="#f59e0b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Rating</Text>
                <Text style={styles.infoValue}>{businessListing.rating} ({businessListing.reviews} reviews)</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={handleEditListing}>
              <Text style={styles.editButtonText}>Edit Business Information</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Products Section */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Products ({products.length})</Text>
            <TouchableOpacity onPress={handleAddProduct}>
              <Icon name="add-circle-outline" size={24} color="#2563eb" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {products.map(product => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productImage}>
                  <Icon name="image-outline" size={40} color="#ccc" />
                </View>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                <View style={styles.productStats}>
                  <Text style={styles.productStock}>
                    Stock: {product.stock > 0 ? product.stock : 'Out'}
                  </Text>
                  <Text style={styles.productSales}>Sales: {product.sales}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionItem} onPress={handleManageOrders}>
            <Icon name="receipt-outline" size={24} color="#2563eb" />
            <Text style={styles.actionText}>Manage Orders</Text>
            <Icon name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={handleAddProduct}>
            <Icon name="add-circle-outline" size={24} color="#22c55e" />
            <Text style={styles.actionText}>Add Product</Text>
            <Icon name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('MarketplacePromotions')}>
            <Icon name="megaphone-outline" size={24} color="#f59e0b" />
            <Text style={styles.actionText}>Promotions</Text>
            <Icon name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('MarketplaceReviews')}>
            <Icon name="star-outline" size={24} color="#8b5cf6" />
            <Text style={styles.actionText}>Customer Reviews</Text>
            <Icon name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  statusCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statusInfoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  analyticsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  analyticsCard: {
    width: '50%',
    padding: 5,
  },
  analyticsCardInner: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  conversionRate: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversionLabel: {
    fontSize: 14,
    color: '#666',
  },
  conversionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  businessInfoCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  editButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  productsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginLeft: 20,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 80,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productStock: {
    fontSize: 11,
    color: '#666',
  },
  productSales: {
    fontSize: 11,
    color: '#22c55e',
  },
  quickActions: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginLeft: 15,
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

export default MarketplaceBusinessScreen;