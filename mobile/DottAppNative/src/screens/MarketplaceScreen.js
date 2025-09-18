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
import CountrySelector from '../components/common/CountrySelector';
import {
  NetworkErrorState,
  EmptyState,
  SkeletonLoader,
  OfflineBanner,
  StaleDataIndicator,
  RefreshableScrollView,
} from '../components/ErrorStates';
import NetInfo from '@react-native-community/netinfo';
import { NetworkHelper } from '../utils/apiErrorHandler';
import orderWebSocketService from '../services/orderWebSocketService';

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
  const [isOnline, setIsOnline] = useState(true);
  const [dataIsStale, setDataIsStale] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  useEffect(() => {
    detectLocation();
    loadInitialData();

    // Monitor network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
      if (state.isConnected && !isOnline) {
        // Network restored - refresh data
        handleRefresh();
      }
    });

    // Listen for order status updates
    const wsUnsubscribes = [];

    // Listen for order acceptance
    wsUnsubscribes.push(
      orderWebSocketService.on('order_update', (data) => {
        console.log('📦 Order update received:', data);

        // Show notification for important updates
        if (data.status === 'business_accepted') {
          Alert.alert(
            '✅ Order Accepted!',
            `Your order #${data.order_number} has been accepted and is being prepared.`,
            [{ text: 'OK' }]
          );
        } else if (data.status === 'courier_assigned') {
          Alert.alert(
            '🚚 Courier Assigned!',
            `A courier has been assigned to deliver your order #${data.order_number}.`,
            [{ text: 'OK' }]
          );
        } else if (data.status === 'picked_up') {
          Alert.alert(
            '🎉 On The Way!',
            `Your order #${data.order_number} is on its way to you!`,
            [{ text: 'OK' }]
          );
        } else if (data.status === 'delivered') {
          Alert.alert(
            '✅ Delivered!',
            `Your order #${data.order_number} has been delivered. Enjoy!`,
            [{ text: 'OK' }]
          );
        }
      })
    );

    // Listen for status updates
    wsUnsubscribes.push(
      orderWebSocketService.on('status_update', (data) => {
        console.log('📊 Status update:', data);
      })
    );

    return () => {
      unsubscribe();
      // Cleanup WebSocket listeners
      wsUnsubscribes.forEach(unsub => unsub());
    };
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
      
      let businessList = response.results || [];
      
      // If user has a business, prioritize showing their own business first
      if (pageNum === 1 && user?.business_id) {
        console.log('👔 User has a business, checking if it should be shown first');
        
        // Check if user's business is in the list
        const userBusinessIndex = businessList.findIndex(b => 
          b.id === user.business_id || b.business_id === user.business_id
        );
        
        if (userBusinessIndex > 0) {
          // Move user's business to the front
          const userBusiness = businessList[userBusinessIndex];
          businessList.splice(userBusinessIndex, 1);
          businessList.unshift(userBusiness);
          // User's business moved to front
        } else if (userBusinessIndex === -1) {
          // User's business not in list, try to fetch it separately
          try {
            const userBusinessResponse = await marketplaceApi.getBusinessDetail(user.business_id);
            if (userBusinessResponse && userBusinessResponse.is_published) {
              businessList.unshift({
                ...userBusinessResponse,
                isOwnerBusiness: true,
                featured: true,
              });
              // User's business added to front
            }
          } catch (error) {
            // Handle 404 gracefully - business might not exist yet
            if (error.response?.status !== 404) {
              // Only log non-404 errors in dev
              if (__DEV__) {
                console.warn('Could not fetch user business:', error.message);
              }
            }
          }
        }
      }
      
      if (pageNum === 1) {
        setBusinesses(businessList);
      } else {
        setBusinesses(prev => [...prev, ...businessList]);
      }
      
      setHasMore(!!response.next);
      setPage(pageNum);
    } catch (error) {
      // Set error state for UI to handle
      setLoadingError(error);

      // Check if we have cached data to show
      if (pageNum === 1 && businesses.length === 0) {
        setDataIsStale(true);
      }

      // Only show error if no cached data available
      if (businesses.length === 0 && !dataIsStale) {
        // Error will be handled by UI components
        if (__DEV__) {
          console.warn('Failed to load businesses:', error.message);
        }
      } else {
        // Other errors
        Alert.alert('Error', 'Failed to load businesses. Please try again.');
      }
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
    try {
      const location = locationData || { city: 'Juba', country: 'South Sudan' };
      const response = await marketplaceApi.getFeaturedItems({
        city: location.city,
        country: location.country,
        type: 'all',  // Get both products and menu items
        limit: 10,
      });

      if (response?.success && response?.results) {
        // Transform the response to match the expected format
        const transformedProducts = response.results.map(item => ({
          id: item.id,
          name: item.name,
          price: `SSP ${item.price ? item.price.toLocaleString() : 0}`,
          image: item.image_url || null,
          businessName: item.business_name,
          businessId: item.business_id,
          businessLogo: item.business_logo,
          description: item.description,
          isMenuRItem: item.category ? true : false,  // Menu items have categories
          category: item.category,
          preparationTime: item.preparation_time,
          isVegetarian: item.is_vegetarian,
          isVegan: item.is_vegan,
          isSpicy: item.is_spicy,
          spiceLevel: item.spice_level,
          viewCount: item.view_count,
          orderCount: item.order_count,
        }));

        setFeaturedProducts(transformedProducts);
      } else {
        // Fallback to empty array if no featured items
        setFeaturedProducts([]);
      }
    } catch (error) {
      console.error('Error loading featured products:', error);
      // Fallback to empty array on error
      setFeaturedProducts([]);
    }
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
    // Navigate to the business detail page when clicking on a product
    navigation.navigate('BusinessDetail', {
      businessId: product.businessId,
      businessName: product.businessName,
    });
  };

  const handleFeaturedItemPress = async (item) => {
    // Track the view
    try {
      await marketplaceApi.trackItemView({
        itemId: item.id,
        itemType: item.isMenuRItem ? 'menu_item' : 'product',
        businessId: item.businessId,
        viewSource: 'featured',
      });
    } catch (error) {
      console.log('Failed to track view:', error);
    }

    // Navigate to the business detail page with item details
    navigation.navigate('BusinessDetail', {
      businessId: item.businessId,
      businessName: item.businessName,
      highlightedItem: {
        id: item.id,
        name: item.name,
        type: item.isMenuRItem ? 'menu_item' : 'product',
      },
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
    const hasImages = featuredBusinesses.some(b => b.logo_url || b.logo || b.cover_image_url || b.cover_image || b.image_url);
    
    // If no businesses have images, show a different featured section
    if (!hasImages) {
      return renderFeaturedBusinessCards();
    }

    // Prepare images for carousel
    const carouselImages = featuredBusinesses.map(business => ({
      url: business.logo_url || business.logo || business.cover_image_url || business.cover_image || business.image_url,
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
          <Text style={styles.sectionTitle}>Featured Items</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {featuredProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => handleFeaturedItemPress(product)}
            >
              <View style={styles.productImage}>
                {product.image ? (
                  <Image source={{ uri: product.image }} style={styles.productImageContent} />
                ) : product.isMenuRItem ? (
                  <Icon name="restaurant-outline" size={40} color="#9ca3af" />
                ) : (
                  <Icon name="cube-outline" size={40} color="#9ca3af" />
                )}
                {product.orderCount > 10 && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>Popular</Text>
                  </View>
                )}
              </View>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.productPrice}>{product.price}</Text>
              <Text style={styles.productBusiness} numberOfLines={1}>
                {product.businessName}
              </Text>
              {product.isMenuRItem && product.preparationTime && (
                <View style={styles.prepTimeContainer}>
                  <Icon name="time-outline" size={12} color="#6b7280" />
                  <Text style={styles.prepTimeText}>{product.preparationTime} min</Text>
                </View>
              )}
              {product.isVegan && (
                <View style={styles.dietBadge}>
                  <Text style={styles.dietText}>🌱 Vegan</Text>
                </View>
              )}
              <TouchableOpacity style={styles.addToCartButton}>
                <Icon name="add-circle" size={24} color="#10b981" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderBusinessItem = ({ item }) => {
    const isOwnerBusiness = item.isOwnerBusiness || 
      (user?.business_id && (item.id === user.business_id || item.business_id === user.business_id));
    
    return (
      <TouchableOpacity 
        style={[styles.businessCard, isOwnerBusiness && styles.ownerBusinessCard]} 
        onPress={() => handleBusinessPress(item)}
      >
        {isOwnerBusiness && (
          <View style={styles.yourBusinessBanner}>
            <Icon name="star" size={14} color="#fbbf24" />
            <Text style={styles.yourBusinessText}>Your Business</Text>
          </View>
        )}
        
        <View style={styles.businessImageContainer}>
          {(item.logo_url || item.logo || item.cover_image_url) ? (
            <Image 
              source={{ uri: item.logo_url || item.logo || item.cover_image_url }} 
              style={styles.businessImage} 
            />
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

          <View style={styles.businessStatusRow}>
            <Text style={styles.businessCategory}>{item.business_type_display || item.category_display || 'Business'}</Text>
            <View style={[styles.statusBadge, item.is_open_now ? styles.openBadge : styles.closedBadge]}>
              <View style={[styles.statusDot, item.is_open_now ? styles.openDot : styles.closedDot]} />
              <Text style={[styles.statusText, item.is_open_now ? styles.openText : styles.closedText]}>
                {item.is_open_now ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>
        
        <View style={styles.businessMeta}>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={14} color="#fbbf24" />
            <Text style={styles.rating}>
              {item.average_rating && item.total_reviews >= 10 
                ? item.average_rating.toFixed(1) 
                : item.total_reviews > 0 && item.total_reviews < 10
                ? `${item.total_reviews} reviews`
                : 'Be the first'}
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
  };

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

  // Show network error if offline and no cached data
  if (!isOnline && businesses.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <NetworkErrorState
          onRetry={handleRefresh}
          message="Connect to the internet to discover businesses near you"
        />
      </SafeAreaView>
    );
  }

  // Show loading error if there was an error and no data
  if (loadingError && businesses.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <NetworkErrorState
          onRetry={handleRefresh}
          message="Something went wrong. Please try again."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Offline Banner */}
      <OfflineBanner isVisible={!isOnline} />

      {/* Stale Data Indicator */}
      {dataIsStale && (
        <StaleDataIndicator
          onRefresh={handleRefresh}
        />
      )}

      {/* Subcategory Modal */}
      <SubcategoryModal
        visible={showSubcategoryModal}
        onClose={() => setShowSubcategoryModal(false)}
        mainCategory={modalCategory}
        subcategories={modalSubcategories}
        onSelectSubcategory={handleSubcategorySelect}
      />
      
      {/* Header with Location, Bell, Cart, and Purchases */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Icon name="compass-outline" size={28} color="#000000" style={styles.discoverIcon} />
            <Text style={styles.headerTitle}>Discover</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Icon name="notifications-outline" size={24} color="#000" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('Cart')}
            >
              <Icon name="cart-outline" size={24} color="#000" />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* Add Purchases icon for all users */}
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('Purchases')}
            >
              <Icon name="receipt-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.locationContainer}
          onPress={() => setShowLocationPicker(true)}
        >
          <Icon name="location" size={16} color="rgba(255, 255, 255, 0.9)" />
          <Text style={styles.locationText}>{currentLocation}</Text>
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
            <View style={{ padding: 20 }}>
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonLoader count={3} type="card" />
          ) : (
            <EmptyState
              title={searchQuery ? "No Results Found" : "No Businesses Yet"}
              message={
                searchQuery
                  ? `We couldn't find businesses matching "${searchQuery}"`
                  : `Be the first to add your business in ${currentLocation}`
              }
              icon="business-outline"
              actionLabel="Change Location"
              onAction={() => setShowLocationPicker(true)}
            />
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoverIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000000',
  },
  countrySelector: {
    marginLeft: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  locationText: {
    color: '#6b7280',
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
    position: 'relative',
  },
  ownerBusinessCard: {
    borderWidth: 2,
    borderColor: '#fbbf24',
    backgroundColor: '#fffbeb',
  },
  yourBusinessBanner: {
    position: 'absolute',
    top: -8,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbbf24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  yourBusinessText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
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
  businessStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  openBadge: {
    backgroundColor: '#ecfdf5',
  },
  closedBadge: {
    backgroundColor: '#fef2f2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  openDot: {
    backgroundColor: '#10b981',
  },
  closedDot: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  openText: {
    color: '#10b981',
  },
  closedText: {
    color: '#ef4444',
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