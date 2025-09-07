import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import marketplaceApi from '../services/marketplaceApi';
import ImageCarousel from '../components/ImageCarousel';
import SubcategoryModal from '../components/SubcategoryModal';
import locationService from '../services/locationService';

const { width: screenWidth } = Dimensions.get('window');

// Categories with icons and colors
const CATEGORIES = [
  { id: 'food', name: 'Food', icon: 'restaurant', color: '#ff6b6b' },
  { id: 'shopping', name: 'Shopping', icon: 'cart', color: '#4ecdc4' },
  { id: 'transport', name: 'Transport', icon: 'car', color: '#95e1d3' },
  { id: 'services', name: 'Services', icon: 'construct', color: '#f38181' },
  { id: 'health', name: 'Health', icon: 'medical', color: '#3d5af1' },
  { id: 'beauty', name: 'Beauty', icon: 'color-palette', color: '#ff6b9d' },
  { id: 'education', name: 'Education', icon: 'school', color: '#667eea' },
  { id: 'more', name: 'More', icon: 'grid', color: '#6c757d' },
];

export default function MarketplaceScreen() {
  const navigation = useNavigation();
  const { user, userMode } = useAuth();
  const { cartCount } = useCart();
  
  const [businesses, setBusinesses] = useState([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryHierarchy, setCategoryHierarchy] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('Detecting location...');
  const [locationData, setLocationData] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [modalCategory, setModalCategory] = useState(null);
  const [modalSubcategories, setModalSubcategories] = useState([]);

  useEffect(() => {
    detectLocation();
    loadInitialData();
  }, []);

  useEffect(() => {
    if (searchQuery || selectedCategory || selectedMainCategory || selectedSubcategory) {
      searchBusinesses();
    } else {
      loadBusinesses();
    }
  }, [searchQuery, selectedCategory, selectedMainCategory, selectedSubcategory]);

  const detectLocation = async () => {
    try {
      // FOR TESTING: Always use Juba, South Sudan
      // Comment this out when ready for production
      const testLocation = {
        latitude: 4.8517,
        longitude: 31.5825,
        city: 'Juba',
        state: 'Central Equatoria',
        country: 'South Sudan',
        displayName: 'Juba, South Sudan',
        formattedAddress: 'Juba, Central Equatoria, South Sudan',
        isDefault: true,
      };
      setLocationData(testLocation);
      setCurrentLocation('Juba, South Sudan');
      return;
      
      // Production code (currently disabled for testing)
      const location = await locationService.getCurrentLocation();
      setLocationData(location);
      setCurrentLocation(`${location.city}, ${location.country}`);
      
      // Reload data with new location
      if (!location.isDefault) {
        loadInitialData();
      }
    } catch (error) {
      console.error('Location detection error:', error);
      setCurrentLocation('Juba, South Sudan');
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadBusinesses(),
        loadFeaturedBusinesses(),
        loadCategories(),
        loadCategoryHierarchy(),
        loadFeaturedProducts(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBusinesses = async (pageNum = 1) => {
    try {
      const location = locationData || { city: 'Juba', country: 'South Sudan' };
      const params = {
        city: location.city,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        page: pageNum,
      };
      
      console.log('🔍 Loading businesses with params:', params);
      
      // Add category filters if selected
      if (selectedMainCategory) {
        params.mainCategory = selectedMainCategory;
        if (selectedSubcategory) {
          params.subcategory = selectedSubcategory;
        }
      }
      
      const response = await marketplaceApi.getBusinesses(params);
      
      console.log('📦 API Response:', {
        success: response?.success,
        resultsCount: response?.results?.length || 0,
        count: response?.count,
        city: response?.city,
        country: response?.country,
        firstBusiness: response?.results?.[0]?.name || 'none'
      });
      
      if (pageNum === 1) {
        setBusinesses(response.results || []);
      } else {
        setBusinesses(prev => [...prev, ...(response.results || [])]);
      }
      
      setHasMore(!!response.next);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading businesses:', error);
      Alert.alert('Error', 'Failed to load businesses');
    }
  };

  const loadFeaturedBusinesses = async () => {
    try {
      const location = locationData || { city: 'Juba', country: 'South Sudan' };
      const response = await marketplaceApi.getFeaturedBusinesses({
        city: location.city,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setFeaturedBusinesses(response.results || []);
    } catch (error) {
      console.error('Error loading featured businesses:', error);
    }
  };

  const loadFeaturedProducts = async () => {
    // Mock featured products - in production, this would be an API call
    const mockProducts = [
      {
        id: '1',
        name: 'Fresh Vegetables',
        price: 'SSP 500',
        image: null,
        businessName: 'Green Market',
        businessId: '1',
      },
      {
        id: '2',
        name: 'Electronics',
        price: 'SSP 15,000',
        image: null,
        businessName: 'Tech Store',
        businessId: '2',
      },
      {
        id: '3',
        name: 'Fashion Items',
        price: 'SSP 3,000',
        image: null,
        businessName: 'Style Shop',
        businessId: '3',
      },
    ];
    setFeaturedProducts(mockProducts);
  };

  const loadCategories = async () => {
    try {
      const location = locationData || { city: 'Juba', country: 'South Sudan' };
      const response = await marketplaceApi.getCategories({
        city: location.city,
        country: location.country,
      });
      setCategories(response || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadCategoryHierarchy = async () => {
    try {
      const location = locationData || { city: 'Juba', country: 'South Sudan' };
      const response = await marketplaceApi.getCategoryHierarchy(location.city);
      if (response && response.categories) {
        setCategoryHierarchy(response.categories);
      }
    } catch (error) {
      console.error('Error loading category hierarchy:', error);
    }
  };

  const searchBusinesses = async () => {
    try {
      const location = locationData || { city: 'Juba', country: 'South Sudan' };
      const params = {
        city: location.city,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        page: 1,
      };
      
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedMainCategory) {
        params.mainCategory = selectedMainCategory;
        if (selectedSubcategory) {
          params.subcategory = selectedSubcategory;
        }
      }
      
      const response = await marketplaceApi.getBusinesses(params);
      setBusinesses(response.results || []);
      setHasMore(!!response.next);
    } catch (error) {
      console.error('Error searching businesses:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadBusinesses(page + 1);
    }
  };

  const handleBusinessPress = (business) => {
    // Check if it's a placeholder business (has 'placeholder' tag or is not verified)
    const isPlaceholder = business.search_tags?.includes('placeholder') || 
                         business.is_verified === false ||
                         business.is_placeholder === true;
    
    navigation.navigate('BusinessDetail', { 
      businessId: business.id,
      businessName: business.business_name || business.name,
      isPlaceholder: isPlaceholder,
    });
  };

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', {
      productId: product.id,
      businessId: product.businessId,
    });
  };

  const handleCategoryPress = (category) => {
    if (category.id === 'more') {
      navigation.navigate('AllCategories');
    } else {
      // Find category data from hierarchy
      const categoryData = categoryHierarchy.find(cat => cat.id === category.id);
      
      if (categoryData && categoryData.subcategories) {
        // Show subcategory modal
        setModalCategory({
          ...category,
          count: categoryData.count
        });
        setModalSubcategories(categoryData.subcategories);
        setShowSubcategoryModal(true);
      } else {
        // Fallback to old behavior if no hierarchy data
        setSelectedCategory(category.id === selectedCategory ? null : category.id);
      }
    }
  };

  const handleSubcategorySelect = (mainCategoryId, subcategoryId) => {
    setSelectedMainCategory(mainCategoryId);
    setSelectedSubcategory(subcategoryId);
    setSelectedCategory(null); // Clear old category selection
    setPage(1);
    loadBusinesses(1);
  };

  const handleLocationPress = () => {
    navigation.navigate('LocationSelector', {
      currentLocation,
      onLocationChange: (newLocation) => {
        setCurrentLocation(newLocation);
        loadInitialData();
      },
    });
  };

  const renderFeaturedBusinessCards = () => {
    return (
      <View style={styles.featuredSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Businesses</Text>
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {featuredBusinesses.map((business) => (
            <TouchableOpacity
              key={business.id}
              style={styles.featuredCard}
              onPress={() => handleBusinessPress(business)}
            >
              <View style={styles.featuredCardIcon}>
                <Icon 
                  name={
                    business.category === 'food' ? 'restaurant' :
                    business.category === 'shopping' ? 'cart' :
                    business.category === 'health' ? 'medical' :
                    business.category === 'beauty' ? 'sparkles' :
                    business.category === 'transport' ? 'car' :
                    business.category === 'services' ? 'construct' :
                    'business'
                  } 
                  size={30} 
                  color="#10b981" 
                />
              </View>
              <Text style={styles.featuredCardName} numberOfLines={2}>
                {business.name || business.business_name}
              </Text>
              <Text style={styles.featuredCardCategory}>
                {business.category?.charAt(0).toUpperCase() + business.category?.slice(1)}
              </Text>
              {business.rating && (
                <View style={styles.ratingContainer}>
                  <Icon name="star" size={14} color="#fbbf24" />
                  <Text style={styles.ratingText}>{business.rating}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderFeaturedCarousel = () => {
    if (featuredBusinesses.length === 0) return null;

    // For businesses without images, we'll show a card with name and category
    const hasImages = featuredBusinesses.some(b => b.logo || b.cover_image || b.image_url);
    
    // If no businesses have images, show a different featured section
    if (!hasImages) {
      return renderFeaturedBusinessCards();
    }

    // Prepare images for carousel
    const carouselImages = featuredBusinesses.map(business => ({
      url: business.logo || business.cover_image || business.image_url,
      business: business,
    }));

    return (
      <View style={styles.featuredSection}>
        <ImageCarousel
          images={carouselImages}
          height={220}
          autoPlay={true}
          autoPlayInterval={5000}
          showIndicators={true}
          onPress={(index, image) => handleBusinessPress(image.business)}
          renderOverlay={(image, index) => (
            <View style={styles.featuredOverlay}>
              <Text style={styles.featuredTag}>FEATURED</Text>
              <Text style={styles.featuredTitle}>{image.business.business_name}</Text>
              <Text style={styles.featuredSubtitle}>{image.business.category_display}</Text>
            </View>
          )}
        />
      </View>
    );
  };

  const renderCategories = () => (
    <View style={styles.categoriesSection}>
      <View style={styles.categoriesGrid}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryItem}
            onPress={() => handleCategoryPress(category)}
          >
            <View style={[
              styles.categoryIcon,
              { backgroundColor: category.color },
              selectedCategory === category.id && styles.selectedCategoryIcon,
            ]}>
              <Icon name={category.icon} size={24} color="#fff" />
            </View>
            <Text style={styles.categoryName}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFeaturedProducts = () => {
    if (featuredProducts.length === 0) return null;

    return (
      <View style={styles.productsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {featuredProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => handleProductPress(product)}
            >
              <View style={styles.productImage}>
                {product.image ? (
                  <Image source={{ uri: product.image }} style={styles.productImageContent} />
                ) : (
                  <Icon name="cube-outline" size={40} color="#9ca3af" />
                )}
              </View>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.productPrice}>{product.price}</Text>
              <Text style={styles.productBusiness} numberOfLines={1}>
                {product.businessName}
              </Text>
              <TouchableOpacity style={styles.addToCartButton}>
                <Icon name="add-circle" size={24} color="#10b981" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderBusinessItem = ({ item }) => (
    <TouchableOpacity style={styles.businessCard} onPress={() => handleBusinessPress(item)}>
      <View style={styles.businessImageContainer}>
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.businessImage} />
        ) : (
          <View style={styles.businessImagePlaceholder}>
            <Icon name="business-outline" size={30} color="#9ca3af" />
          </View>
        )}
        {item.is_verified && (
          <View style={styles.verifiedBadge}>
            <Icon name="checkmark-circle" size={16} color="#10b981" />
          </View>
        )}
      </View>
      
      <View style={styles.businessInfo}>
        <View style={styles.businessHeader}>
          <Text style={styles.businessName} numberOfLines={1}>
            {item.business_name}
          </Text>
          {item.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.businessCategory}>{item.category_display}</Text>
        
        <View style={styles.businessMeta}>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={14} color="#fbbf24" />
            <Text style={styles.rating}>
              {item.average_rating ? item.average_rating.toFixed(1) : 'New'}
            </Text>
          </View>
          
          <View style={styles.locationContainer}>
            <Icon name="location-outline" size={14} color="#6b7280" />
            <Text style={styles.location} numberOfLines={1}>
              {item.city}
            </Text>
          </View>
        </View>

        <View style={styles.businessActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="chatbubble-outline" size={18} color="#2563eb" />
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="call-outline" size={18} color="#2563eb" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="eye-outline" size={18} color="#2563eb" />
            <Text style={styles.actionText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const ListHeaderComponent = () => (
    <>
      {renderFeaturedCarousel()}
      {renderCategories()}
      {renderFeaturedProducts()}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Businesses</Text>
        <Text style={styles.businessCount}>{businesses.length} businesses</Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Subcategory Modal */}
      <SubcategoryModal
        visible={showSubcategoryModal}
        onClose={() => setShowSubcategoryModal(false)}
        mainCategory={modalCategory}
        subcategories={modalSubcategories}
        onSelectSubcategory={handleSubcategorySelect}
      />
      
      {/* Original Header with Location, Bell, and Cart */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Marketplace</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Icon name="notifications-outline" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('Cart')}
            >
              <Icon name="cart-outline" size={24} color="#fff" />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.locationContainer}
          onPress={() => setShowLocationPicker(true)}
        >
          <Icon name="location" size={16} color="rgba(255, 255, 255, 0.9)" />
          <Text style={styles.locationText}>Juba, South Sudan</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search businesses, products, services..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Active Filter Display */}
      {selectedMainCategory && (
        <View style={styles.activeFilterContainer}>
          <View style={styles.activeFilter}>
            <Text style={styles.activeFilterText}>
              {categoryHierarchy.find(c => c.id === selectedMainCategory)?.name || selectedMainCategory}
              {selectedSubcategory && selectedSubcategory !== 'all' && 
                ` > ${modalSubcategories.find(s => s.id === selectedSubcategory)?.name || selectedSubcategory}`
              }
            </Text>
            <TouchableOpacity 
              onPress={() => {
                setSelectedMainCategory(null);
                setSelectedSubcategory(null);
                loadBusinesses(1);
              }}
              style={styles.clearFilterButton}
            >
              <Icon name="close-circle" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Content */}
      <FlatList
        data={businesses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBusinessItem}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && businesses.length > 0 ? (
            <ActivityIndicator size="large" color="#10b981" style={{ padding: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Icon name="business-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No businesses found</Text>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? `No results for "${searchQuery}"`
                  : 'No businesses available in your area'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  headerContainer: {
    backgroundColor: '#14532d',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  locationText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  featuredSection: {
    marginBottom: 20,
  },
  featuredCard: {
    width: screenWidth,
  },
  featuredImageContainer: {
    height: 200,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
  },
  featuredTag: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  featuredSubtitle: {
    color: '#e5e7eb',
    fontSize: 14,
    marginTop: 4,
  },
  featuredDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#10b981',
    width: 24,
  },
  categoriesSection: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    marginBottom: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  categoryItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedCategoryIcon: {
    transform: [{ scale: 1.1 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryName: {
    fontSize: 12,
    color: '#4b5563',
    textAlign: 'center',
  },
  productsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  businessCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  productCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginLeft: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 100,
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
    color: '#1f2937',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  productBusiness: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  featuredCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    width: 150,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  featuredCardCategory: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  addToCartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  businessCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  businessImageContainer: {
    position: 'relative',
  },
  businessImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  businessImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 2,
  },
  businessInfo: {
    flex: 1,
    marginLeft: 12,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  featuredBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredBadgeText: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  businessCategory: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  businessMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  rating: {
    fontSize: 12,
    color: '#1f2937',
    marginLeft: 4,
  },
  location: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    flex: 1,
  },
  businessActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#2563eb',
    marginLeft: 4,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  activeFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  activeFilterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  clearFilterButton: {
    marginLeft: 4,
  },
});