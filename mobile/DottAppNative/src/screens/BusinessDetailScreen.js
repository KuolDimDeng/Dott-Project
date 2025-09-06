import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  FlatList,
  Dimensions,
  Share,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import marketplaceApi from '../services/marketplaceApi';

const { width: screenWidth } = Dimensions.get('window');

export default function BusinessDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { addToCart } = useCart();
  const { businessId, businessName, isPlaceholder } = route.params || {};
  
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [imageIndex, setImageIndex] = useState(0);
  const [placeholderStatus, setPlaceholderStatus] = useState(null);
  const [inquirySent, setInquirySent] = useState(false);

  useEffect(() => {
    loadBusinessDetails();
    if (isPlaceholder) {
      checkPlaceholderStatus();
    }
  }, [businessId]);

  const checkPlaceholderStatus = async () => {
    try {
      const status = await marketplaceApi.checkPlaceholderStatus(businessId);
      setPlaceholderStatus(status);
    } catch (error) {
      console.error('Error checking placeholder status:', error);
    }
  };

  const handlePlaceholderInquiry = async (inquiryType = 'view') => {
    if (inquirySent) {
      Alert.alert('Already Notified', 'The business owner has already been notified about your interest.');
      return;
    }

    try {
      const result = await marketplaceApi.sendPlaceholderInquiry({
        business_id: businessId,
        inquiry_type: inquiryType,
        message: `Customer interested in ${businessName}`,
      });

      if (result.success) {
        setInquirySent(true);
        Alert.alert(
          'Business Notified',
          'The business owner has been notified via SMS about your interest. They will contact you soon.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Notice',
          result.message || 'Could not notify the business owner at this time.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error sending inquiry:', error);
      Alert.alert('Error', 'Failed to notify the business owner. Please try again.');
    }
  };

  const loadBusinessDetails = async () => {
    setLoading(true);
    try {
      // In production, these would be actual API calls
      const businessData = await marketplaceApi.getBusinessDetails(businessId);
      setBusiness(businessData || mockBusinessData());
      
      const productsData = await marketplaceApi.getBusinessProducts(businessId);
      setProducts(productsData?.results || mockProducts());
      
      const servicesData = await marketplaceApi.getBusinessServices(businessId);
      setServices(servicesData?.results || mockServices());
      
      setReviews(mockReviews());
    } catch (error) {
      console.error('Error loading business details:', error);
      // Use mock data as fallback
      setBusiness(mockBusinessData());
      setProducts(mockProducts());
      setServices(mockServices());
      setReviews(mockReviews());
    } finally {
      setLoading(false);
    }
  };

  const mockBusinessData = () => ({
    id: businessId,
    business_name: businessName || 'Sample Business',
    description: 'Your trusted partner for quality products and services. We have been serving the community for over 10 years with dedication and excellence.',
    category: 'Shopping',
    phone: '+211 912 345 678',
    email: 'info@business.com',
    address: '123 Main Street, Juba, South Sudan',
    city: 'Juba',
    country: 'South Sudan',
    average_rating: 4.5,
    total_reviews: 128,
    total_orders: 500,
    response_time: '< 1 hour',
    is_verified: true,
    is_featured: true,
    business_hours: {
      monday: '9:00 AM - 6:00 PM',
      tuesday: '9:00 AM - 6:00 PM',
      wednesday: '9:00 AM - 6:00 PM',
      thursday: '9:00 AM - 6:00 PM',
      friday: '9:00 AM - 6:00 PM',
      saturday: '10:00 AM - 4:00 PM',
      sunday: 'Closed',
    },
    images: [null, null, null], // Placeholder for business images
    logo: null,
    cover_image: null,
  });

  const mockProducts = () => [
    { id: '1', name: 'Product 1', price: 1500, currency: 'SSP', description: 'High quality product', stock: 50, image: null },
    { id: '2', name: 'Product 2', price: 2500, currency: 'SSP', description: 'Premium item', stock: 30, image: null },
    { id: '3', name: 'Product 3', price: 800, currency: 'SSP', description: 'Best seller', stock: 100, image: null },
    { id: '4', name: 'Product 4', price: 3200, currency: 'SSP', description: 'Limited edition', stock: 10, image: null },
  ];

  const mockServices = () => [
    { id: '1', name: 'Service 1', price: 5000, currency: 'SSP', description: 'Professional service', duration: '1 hour' },
    { id: '2', name: 'Service 2', price: 8000, currency: 'SSP', description: 'Premium service', duration: '2 hours' },
  ];

  const mockReviews = () => [
    { id: '1', user: 'John D.', rating: 5, comment: 'Excellent service and quality products!', date: '2024-01-15' },
    { id: '2', user: 'Sarah M.', rating: 4, comment: 'Good experience, fast delivery', date: '2024-01-10' },
    { id: '3', user: 'Mike R.', rating: 5, comment: 'Best shop in town!', date: '2024-01-05' },
  ];

  const handleCall = () => {
    if (business?.phone) {
      Linking.openURL(`tel:${business.phone}`);
    }
  };

  const handleChat = () => {
    navigation.navigate('ChatConversation', {
      conversationId: `business_${businessId}`,
      recipientName: business?.business_name,
      businessName: business?.business_name,
      isGroup: false,
      phoneNumber: business?.phone,
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${business?.business_name} on Dott! Download the app: https://dottapps.com`,
        title: business?.business_name,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAddToCart = (item, type = 'product') => {
    addToCart({
      businessId: business.id,
      businessName: business.business_name,
      productId: item.id,
      productName: item.name,
      price: item.price,
      currency: item.currency || 'SSP',
      type: type,
    });
    Alert.alert('Success', `${item.name} added to cart`);
  };

  const renderHeader = () => (
    <View>
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        {business?.cover_image ? (
          <Image source={{ uri: business.cover_image }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Icon name="business" size={60} color="#fff" />
          </View>
        )}
        
        {/* Profile Image */}
        <View style={styles.profileImageContainer}>
          {business?.logo ? (
            <Image source={{ uri: business.logo }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileInitial}>
                {business?.business_name?.[0]?.toUpperCase() || 'B'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Business Info */}
      <View style={styles.businessInfo}>
        <View style={styles.nameContainer}>
          <Text style={styles.businessName}>{business?.business_name}</Text>
          {business?.is_verified && (
            <Icon name="checkmark-circle" size={20} color="#10b981" style={{ marginLeft: 8 }} />
          )}
        </View>
        
        <Text style={styles.category}>{business?.category}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Icon name="star" size={16} color="#fbbf24" />
            <Text style={styles.statText}>{business?.average_rating || 0}</Text>
            <Text style={styles.statLabel}>({business?.total_reviews || 0})</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="bag-check" size={16} color="#10b981" />
            <Text style={styles.statText}>{business?.total_orders || 0}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="time" size={16} color="#3b82f6" />
            <Text style={styles.statText}>{business?.response_time || 'N/A'}</Text>
          </View>
        </View>

        <Text style={styles.description}>{business?.description}</Text>
      </View>

      {/* Placeholder Business Notice */}
      {isPlaceholder && placeholderStatus && (
        <View style={styles.placeholderNotice}>
          <Icon name="information-circle" size={20} color="#f59e0b" />
          <Text style={styles.placeholderText}>
            This business is not yet registered on Dott
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {isPlaceholder ? (
          <>
            <TouchableOpacity 
              style={[styles.primaryButton, inquirySent && styles.disabledButton]} 
              onPress={() => handlePlaceholderInquiry('message')}
              disabled={inquirySent || !placeholderStatus?.can_contact}
            >
              <Icon name="send" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {inquirySent ? 'Owner Notified' : 'Notify Owner'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCall}>
              <Icon name="call" size={20} color="#10b981" />
              <Text style={styles.secondaryButtonText}>Call Directly</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={handleChat}>
              <Icon name="chatbubble" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCall}>
              <Icon name="call" size={20} color="#10b981" />
              <Text style={styles.secondaryButtonText}>Call</Text>
            </TouchableOpacity>
          </>
        )}
        
        <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
          <Icon name="share-social" size={20} color="#10b981" />
          <Text style={styles.secondaryButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.activeTab]}
          onPress={() => setActiveTab('products')}
        >
          <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
            Products
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'services' && styles.activeTab]}
          onPress={() => setActiveTab('services')}
        >
          <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
            Services
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
          onPress={() => setActiveTab('reviews')}
        >
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
            Reviews
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.activeTab]}
          onPress={() => setActiveTab('info')}
        >
          <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
            Info
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProducts = () => (
    <View style={styles.productsGrid}>
      {products.map((product) => (
        <TouchableOpacity
          key={product.id}
          style={styles.productCard}
          onPress={() => navigation.navigate('ProductDetail', {
            productId: product.id,
            businessId: business.id,
            businessName: business.business_name,
          })}
        >
          <View style={styles.productImage}>
            {product.image ? (
              <Image source={{ uri: product.image }} style={styles.productImageContent} />
            ) : (
              <Icon name="cube-outline" size={40} color="#9ca3af" />
            )}
          </View>
          
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.productPrice}>{product.currency} {product.price}</Text>
          
          {product.stock !== undefined && (
            <Text style={styles.productStock}>
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </Text>
          )}
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddToCart(product, 'product')}
            disabled={product.stock === 0}
          >
            <Icon name="add-circle" size={24} color={product.stock > 0 ? "#10b981" : "#d1d5db"} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderServices = () => (
    <View style={styles.servicesContainer}>
      {services.map((service) => (
        <View key={service.id} style={styles.serviceCard}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceDescription}>{service.description}</Text>
            <View style={styles.serviceMeta}>
              <Text style={styles.servicePrice}>{service.currency} {service.price}</Text>
              {service.duration && (
                <Text style={styles.serviceDuration}>
                  <Icon name="time-outline" size={14} color="#6b7280" /> {service.duration}
                </Text>
              )}
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => handleAddToCart(service, 'service')}
          >
            <Text style={styles.bookButtonText}>Book</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderReviews = () => (
    <View style={styles.reviewsContainer}>
      <View style={styles.reviewsSummary}>
        <View style={styles.ratingOverview}>
          <Text style={styles.ratingNumber}>{business?.average_rating || 0}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Icon
                key={star}
                name="star"
                size={20}
                color={star <= (business?.average_rating || 0) ? "#fbbf24" : "#e5e7eb"}
              />
            ))}
          </View>
          <Text style={styles.reviewCount}>{business?.total_reviews || 0} reviews</Text>
        </View>
      </View>
      
      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewerInfo}>
              <View style={styles.reviewerAvatar}>
                <Text style={styles.reviewerInitial}>{review.user[0]}</Text>
              </View>
              <View>
                <Text style={styles.reviewerName}>{review.user}</Text>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon
                      key={star}
                      name="star"
                      size={12}
                      color={star <= review.rating ? "#fbbf24" : "#e5e7eb"}
                    />
                  ))}
                </View>
              </View>
            </View>
            <Text style={styles.reviewDate}>{review.date}</Text>
          </View>
          <Text style={styles.reviewComment}>{review.comment}</Text>
        </View>
      ))}
    </View>
  );

  const renderInfo = () => (
    <View style={styles.infoContainer}>
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Contact Information</Text>
        
        <TouchableOpacity style={styles.infoItem} onPress={handleCall}>
          <Icon name="call-outline" size={20} color="#6b7280" />
          <Text style={styles.infoText}>{business?.phone}</Text>
        </TouchableOpacity>
        
        {business?.email && (
          <TouchableOpacity style={styles.infoItem}>
            <Icon name="mail-outline" size={20} color="#6b7280" />
            <Text style={styles.infoText}>{business?.email}</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.infoItem}>
          <Icon name="location-outline" size={20} color="#6b7280" />
          <Text style={styles.infoText}>{business?.address}</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Business Hours</Text>
        {business?.business_hours && Object.entries(business.business_hours).map(([day, hours]) => (
          <View key={day} style={styles.hoursItem}>
            <Text style={styles.dayText}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
            <Text style={styles.hoursText}>{hours}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'products':
        return renderProducts();
      case 'services':
        return renderServices();
      case 'reviews':
        return renderReviews();
      case 'info':
        return renderInfo();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle} numberOfLines={1}>
          {business?.business_name || 'Business'}
        </Text>
        
        <TouchableOpacity style={styles.moreButton}>
          <Icon name="ellipsis-vertical" size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
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
    marginHorizontal: 16,
  },
  moreButton: {
    padding: 4,
  },
  coverContainer: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'absolute',
    bottom: -40,
    left: 20,
    borderWidth: 4,
    borderColor: '#fff',
    borderRadius: 50,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  businessInfo: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  category: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 2,
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  primaryButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  secondaryButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#10b981',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#10b981',
    fontWeight: '600',
  },
  placeholderNotice: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  placeholderText: {
    fontSize: 14,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  productCard: {
    width: (screenWidth - 32) / 2,
    backgroundColor: '#fff',
    margin: 8,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productImageContent: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  productStock: {
    fontSize: 12,
    color: '#6b7280',
  },
  addButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  servicesContainer: {
    padding: 16,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginRight: 12,
  },
  serviceDuration: {
    fontSize: 14,
    color: '#6b7280',
  },
  bookButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewsContainer: {
    padding: 16,
  },
  reviewsSummary: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  ratingOverview: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  stars: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  reviewCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  reviewCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewStars: {
    flexDirection: 'row',
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  reviewComment: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  infoContainer: {
    padding: 16,
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 12,
    flex: 1,
  },
  hoursItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dayText: {
    fontSize: 14,
    color: '#4b5563',
  },
  hoursText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
});