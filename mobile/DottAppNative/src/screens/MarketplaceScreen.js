import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useCart } from '../context/CartContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import marketplaceApi from '../services/marketplaceApi';
import { getCategoryDisplayName, getCategoryIcon, getCategoryColor } from '../utils/categoryMapping';
// import Geolocation from '@react-native-community/geolocation'; // Temporarily disabled for testing

export default function MarketplaceScreen() {
  const { cartCount } = useCart();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({
    city: 'Juba',
    country: 'SS',
    countryName: 'South Sudan',
    latitude: 4.8517,
    longitude: 31.5825,
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchActive, setSearchActive] = useState(false);

  // Get user's location on mount
  useEffect(() => {
    getCurrentLocation();
    loadInitialData();
  }, []);

  // Reload data when city changes
  useEffect(() => {
    if (currentLocation.city) {
      loadInitialData();
    }
  }, [currentLocation.city]);

  const getCurrentLocation = () => {
    // Temporarily disabled geolocation for testing
    // For now, just use Juba, South Sudan as the default location
    console.log('Using test location: Juba, South Sudan');
    setCurrentLocation({
      city: 'Juba',
      country: 'SS',
      latitude: 4.8517,
      longitude: 31.5825,
    });
    
    // Uncomment below when Geolocation is properly linked
    /*
    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const city = await reverseGeocode(latitude, longitude);
          setCurrentLocation({
            city: city.city || 'Juba',
            country: city.country || 'SS',
            countryName: city.countryName || 'South Sudan',
            latitude,
            longitude,
          });
        } catch (error) {
          console.log('Geocoding error:', error);
        }
      },
      (error) => {
        console.log('Location error:', error);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
    */
  };

  const reverseGeocode = async (lat, lng) => {
    // Placeholder for reverse geocoding
    // You would implement actual reverse geocoding here
    // using Google Maps API or another service
    // For testing, return Juba, South Sudan
    return {
      city: 'Juba',
      country: 'SS',
      countryName: 'South Sudan',
    };
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      console.log('🏪 Loading marketplace data for:', currentLocation.city);
      
      // Load categories for the city
      console.log('📂 Loading categories...');
      try {
        const categoriesResponse = await marketplaceApi.getCategories(currentLocation.city);
        console.log('📂 Categories response:', categoriesResponse);
        if (categoriesResponse.success) {
          setCategories(categoriesResponse.categories);
          console.log('✅ Loaded', categoriesResponse.categories?.length, 'categories');
        }
      } catch (catError) {
        console.error('Category load error:', catError);
      }

      // Load featured businesses
      console.log('⭐ Loading featured businesses...');
      try {
        const featuredResponse = await marketplaceApi.getFeaturedBusinesses(currentLocation.city);
        console.log('⭐ Featured response:', featuredResponse);
        if (featuredResponse.success) {
          setFeaturedBusinesses(featuredResponse.businesses);
          console.log('✅ Loaded', featuredResponse.businesses?.length, 'featured businesses');
        }
      } catch (featError) {
        console.error('Featured businesses load error:', featError);
      }

      // Load initial businesses
      console.log('🏢 Loading businesses...');
      try {
        const businessesResponse = await marketplaceApi.getBusinesses({
          city: currentLocation.city,
          country: currentLocation.country,
          page: 1,
        });
        console.log('🏢 Businesses response:', businessesResponse);
        if (businessesResponse.success) {
          setBusinesses(businessesResponse.results);
          setHasMore(businessesResponse.results.length === 20);
          console.log('✅ Loaded', businessesResponse.results?.length, 'businesses');
        }
      } catch (busError) {
        console.error('Businesses load error:', busError);
      }
      
    } catch (error) {
      console.error('❌ Error loading marketplace data:', error);
      Alert.alert('Error', 'Failed to load marketplace data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchActive(true);
    setLoading(true);
    try {
      const response = await marketplaceApi.searchBusinesses(
        searchQuery,
        currentLocation.city,
        selectedCategory
      );
      if (response.success) {
        setBusinesses(response.results);
        setHasMore(false); // Don't paginate search results
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (category) => {
    setSelectedCategory(category.original_name || category.name);
    setLoading(true);
    try {
      const response = await marketplaceApi.getBusinesses({
        city: currentLocation.city,
        country: currentLocation.country,
        category: category.original_name || category.name,
        page: 1,
      });
      if (response.success) {
        setBusinesses(response.results);
        setPage(1);
        setHasMore(response.results.length === 20);
      }
    } catch (error) {
      console.error('Category filter error:', error);
      Alert.alert('Error', 'Failed to filter by category');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchActive(false);
    setSelectedCategory('');
    loadInitialData();
  };

  const loadMoreBusinesses = async () => {
    if (!hasMore || loading) return;
    
    try {
      const response = await marketplaceApi.getBusinesses({
        city: currentLocation.city,
        country: currentLocation.country,
        category: selectedCategory,
        page: page + 1,
      });
      if (response.success) {
        setBusinesses([...businesses, ...response.results]);
        setPage(page + 1);
        setHasMore(response.results.length === 20);
      }
    } catch (error) {
      console.error('Load more error:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.categoryCard,
        selectedCategory === (item.original_name || item.name) && styles.selectedCategory
      ]}
      onPress={() => handleCategorySelect(item)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
        <Icon name={item.icon} size={24} color={item.color} />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
      <Text style={styles.categoryCount}>{item.count} businesses</Text>
    </TouchableOpacity>
  );

  const renderBusiness = ({ item }) => (
    <TouchableOpacity 
      style={styles.businessCard}
      onPress={() => console.log('Business clicked:', item.id)}
    >
      <View style={styles.businessInfo}>
        <Text style={styles.businessName}>{item.name}</Text>
        <Text style={styles.businessCategory}>{getCategoryDisplayName(item.category)}</Text>
        {item.address && (
          <Text style={styles.businessAddress} numberOfLines={1}>
            <Icon name="location-outline" size={12} color="#6b7280" /> {item.address}
          </Text>
        )}
        {item.phone && (
          <Text style={styles.businessPhone}>
            <Icon name="call-outline" size={12} color="#6b7280" /> {item.phone}
          </Text>
        )}
      </View>
      <View style={styles.businessMeta}>
        {item.rating && (
          <View style={styles.businessRating}>
            <Icon name="star" size={16} color="#fbbf24" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
        {item.is_verified && (
          <View style={styles.verifiedBadge}>
            <Icon name="checkmark-circle" size={16} color="#10b981" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Marketplace</Text>
            {user?.has_business && (
              <View style={styles.businessOwnerBadge}>
                <Icon name="business" size={10} color="#ffffff" />
                <Text style={styles.businessOwnerText}>Business Owner</Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.locationContainer}
            onPress={getCurrentLocation}
          >
            <Icon name="location-outline" size={16} color="#ffffff" />
            <Text style={styles.locationText}>
              {currentLocation.city}, {currentLocation.countryName || currentLocation.country}
            </Text>
            <Icon name="refresh-outline" size={14} color="#ffffff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="search" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="notifications-outline" size={24} color="#ffffff" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Cart')}
          >
            <Icon name="cart-outline" size={24} color="#ffffff" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for businesses, products or services"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Icon name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading businesses in {currentLocation.city}...</Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Categories */}
          {!searchActive && categories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((category) => (
                  <TouchableOpacity 
                    key={category.id}
                    style={[
                      styles.categoryPill,
                      selectedCategory === (category.original_name || category.name) && styles.selectedCategoryPill
                    ]}
                    onPress={() => handleCategorySelect(category)}
                  >
                    <Icon 
                      name={category.icon} 
                      size={16} 
                      color={selectedCategory === (category.original_name || category.name) ? '#ffffff' : category.color} 
                    />
                    <Text style={[
                      styles.categoryPillText,
                      selectedCategory === (category.original_name || category.name) && styles.selectedCategoryPillText
                    ]}>
                      {category.name} ({category.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Featured Businesses */}
          {!searchActive && featuredBusinesses.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Featured Businesses</Text>
              {featuredBusinesses.map((business) => (
                <View key={`featured-${business.id}`}>
                  {renderBusiness({ item: business })}
                </View>
              ))}
            </View>
          )}

          {/* All Businesses */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {searchActive 
                ? `Search Results (${businesses.length})` 
                : selectedCategory 
                  ? `${selectedCategory} (${businesses.length})`
                  : `All Businesses in ${currentLocation.city}`}
            </Text>
            {businesses.length > 0 ? (
              businesses.map((business) => (
                <View key={`business-${business.id}`}>
                  {renderBusiness({ item: business })}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="business-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No businesses found</Text>
                <Text style={styles.emptySubtext}>
                  {searchActive 
                    ? 'Try a different search term'
                    : `No businesses available in ${currentLocation.city}`}
                </Text>
              </View>
            )}
            
            {hasMore && !searchActive && (
              <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreBusinesses}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#14532d',
    borderBottomWidth: 1,
    borderBottomColor: '#14532d',
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  businessOwnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  businessOwnerText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 4,
    opacity: 0.9,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#14532d',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#f97316',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#14532d',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1a1a1a',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedCategoryPill: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryPillText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  selectedCategoryPillText: {
    color: '#ffffff',
  },
  categoryCard: {
    width: 80,
    alignItems: 'center',
    marginRight: 12,
    padding: 8,
    borderRadius: 8,
  },
  selectedCategory: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  businessCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  businessCategory: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  businessAddress: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  businessPhone: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  businessMeta: {
    alignItems: 'flex-end',
  },
  businessRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  verifiedBadge: {
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  loadMoreText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});