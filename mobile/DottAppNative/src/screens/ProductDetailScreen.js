import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  FlatList,
  Dimensions,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import marketplaceApi from '../services/marketplaceApi';

const { width: screenWidth } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { product: initialProduct, businessId, businessName } = route.params || {};
  const { addToCart } = useCart();
  const { user } = useAuth();
  
  const [product, setProduct] = useState(initialProduct);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadProductDetails();
  }, []);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      
      // Load full product details if needed
      if (initialProduct?.id) {
        // For now use the initial product data
        setProduct(initialProduct);
      }

      // Load business details
      if (businessId) {
        const businessData = await marketplaceApi.getBusinessDetail(businessId);
        setBusiness(businessData);
      }

      // Load related products
      loadRelatedProducts();
      
      // Load reviews
      loadReviews();
      
    } catch (error) {
      console.error('Error loading product details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedProducts = async () => {
    try {
      // Simulate related products
      const mockRelated = [
        {
          id: 'rel1',
          name: 'Related Product 1',
          price: 19.99,
          image: 'https://via.placeholder.com/150',
        },
        {
          id: 'rel2',
          name: 'Related Product 2',
          price: 24.99,
          image: 'https://via.placeholder.com/150',
        },
      ];
      setRelatedProducts(mockRelated);
    } catch (error) {
      console.error('Error loading related products:', error);
    }
  };

  const loadReviews = async () => {
    try {
      // Simulate reviews
      const mockReviews = [
        {
          id: 'rev1',
          userName: 'John Doe',
          rating: 5,
          date: '2024-01-15',
          comment: 'Excellent product! Highly recommended.',
          helpful: 12,
        },
        {
          id: 'rev2',
          userName: 'Jane Smith',
          rating: 4,
          date: '2024-01-10',
          comment: 'Good quality, fast delivery.',
          helpful: 8,
        },
      ];
      setReviews(mockReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    const cartItem = {
      ...product,
      businessId: businessId || business?.id,
      businessName: businessName || business?.business_name,
      quantity,
      variant: selectedVariant,
    };
    
    addToCart(cartItem);
    Alert.alert('Success', `Added ${quantity} item(s) to cart`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigation.navigate('Cart');
  };

  const handleShare = async () => {
    try {
      Alert.alert(
        'Share Product',
        'How would you like to share?',
        [
          {
            text: 'Share to Chat',
            onPress: () => shareToChat(),
          },
          {
            text: 'Share External',
            onPress: async () => {
              await Share.share({
                message: `Check out ${product?.name} on Dott Marketplace! Price: ${product?.price}`,
                title: product?.name,
              });
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const shareToChat = () => {
    navigation.navigate('ChatConversation', {
      sharedProduct: {
        id: product?.id,
        name: product?.name,
        price: product?.price,
        image: product?.images?.[0] || 'https://via.placeholder.com/150',
        businessName: businessName || business?.business_name,
        businessId: businessId || business?.id,
      },
    });
  };

  const handleContactSeller = () => {
    if (business?.id) {
      navigation.navigate('ChatConversation', {
        conversationId: `business_${business.id}`,
        contactName: business.business_name,
        isBusiness: true,
      });
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Save to backend
  };

  const renderImageCarousel = () => {
    const images = product?.images || ['https://via.placeholder.com/400'];
    
    return (
      <View style={styles.imageSection}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            setSelectedImageIndex(index);
          }}
        >
          {images.map((image, index) => (
            <Image
              key={index}
              source={{ uri: image }}
              style={styles.productImage}
            />
          ))}
        </ScrollView>
        
        {images.length > 1 && (
          <View style={styles.imageIndicators}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === selectedImageIndex && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={toggleFavorite}
        >
          <Icon 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={28} 
            color={isFavorite ? "#ef4444" : "#ffffff"} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderProductInfo = () => (
    <View style={styles.infoSection}>
      <Text style={styles.productName}>{product?.name}</Text>
      
      <View style={styles.priceRow}>
        <Text style={styles.price}>${product?.price?.toFixed(2)}</Text>
        {product?.originalPrice && (
          <Text style={styles.originalPrice}>${product.originalPrice.toFixed(2)}</Text>
        )}
        {product?.discount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{product.discount}% OFF</Text>
          </View>
        )}
      </View>

      <View style={styles.ratingRow}>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Icon
              key={star}
              name={star <= (product?.rating || 4) ? "star" : "star-outline"}
              size={16}
              color="#fbbf24"
            />
          ))}
        </View>
        <Text style={styles.ratingText}>
          {product?.rating || 4.0} ({product?.reviewCount || 0} reviews)
        </Text>
      </View>

      {product?.inStock !== false ? (
        <View style={styles.stockBadge}>
          <Icon name="checkmark-circle" size={16} color="#10b981" />
          <Text style={styles.stockText}>In Stock</Text>
        </View>
      ) : (
        <View style={[styles.stockBadge, styles.outOfStock]}>
          <Icon name="close-circle" size={16} color="#ef4444" />
          <Text style={[styles.stockText, styles.outOfStockText]}>Out of Stock</Text>
        </View>
      )}
    </View>
  );

  const renderVariants = () => {
    if (!product?.variants || product.variants.length === 0) return null;

    return (
      <View style={styles.variantsSection}>
        <Text style={styles.sectionTitle}>Options</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {product.variants.map((variant) => (
            <TouchableOpacity
              key={variant.id}
              style={[
                styles.variantButton,
                selectedVariant?.id === variant.id && styles.selectedVariant,
              ]}
              onPress={() => setSelectedVariant(variant)}
            >
              <Text
                style={[
                  styles.variantText,
                  selectedVariant?.id === variant.id && styles.selectedVariantText,
                ]}
              >
                {variant.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderQuantitySelector = () => (
    <View style={styles.quantitySection}>
      <Text style={styles.sectionTitle}>Quantity</Text>
      <View style={styles.quantitySelector}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => setQuantity(Math.max(1, quantity - 1))}
        >
          <Icon name="remove" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => setQuantity(quantity + 1)}
        >
          <Icon name="add" size={20} color="#374151" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDescription = () => (
    <View style={styles.descriptionSection}>
      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.description}>
        {product?.description || 'No description available'}
      </Text>
    </View>
  );

  const renderBusinessInfo = () => (
    <TouchableOpacity 
      style={styles.businessSection}
      onPress={() => navigation.navigate('BusinessDetail', { businessId })}
    >
      <View style={styles.businessInfo}>
        <Image
          source={{ uri: business?.logo || 'https://via.placeholder.com/50' }}
          style={styles.businessLogo}
        />
        <View style={styles.businessDetails}>
          <Text style={styles.businessName}>
            {businessName || business?.business_name || 'Store Name'}
          </Text>
          <Text style={styles.businessRating}>
            <Icon name="star" size={14} color="#fbbf24" /> 4.5 • 100+ products
          </Text>
        </View>
      </View>
      <Icon name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  const renderReviews = () => (
    <View style={styles.reviewsSection}>
      <View style={styles.reviewsHeader}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      
      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewerName}>{review.userName}</Text>
            <View style={styles.reviewStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  name={star <= review.rating ? "star" : "star-outline"}
                  size={12}
                  color="#fbbf24"
                />
              ))}
            </View>
          </View>
          <Text style={styles.reviewDate}>{review.date}</Text>
          <Text style={styles.reviewComment}>{review.comment}</Text>
          <TouchableOpacity style={styles.helpfulButton}>
            <Icon name="thumbs-up-outline" size={14} color="#6b7280" />
            <Text style={styles.helpfulText}>Helpful ({review.helpful})</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderRelatedProducts = () => (
    <View style={styles.relatedSection}>
      <Text style={styles.sectionTitle}>You May Also Like</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {relatedProducts.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.relatedCard}
            onPress={() => navigation.push('ProductDetail', { 
              product: item, 
              businessId, 
              businessName 
            })}
          >
            <Image source={{ uri: item.image }} style={styles.relatedImage} />
            <Text style={styles.relatedName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.relatedPrice}>${item.price.toFixed(2)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Icon name="share-outline" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Cart')}
            style={styles.headerButton}
          >
            <Icon name="cart-outline" size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {renderImageCarousel()}
        {renderProductInfo()}
        {renderVariants()}
        {renderQuantitySelector()}
        {renderDescription()}
        {renderBusinessInfo()}
        {renderReviews()}
        {renderRelatedProducts()}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.contactButton}
          onPress={handleContactSeller}
        >
          <Icon name="chatbubble-outline" size={20} color="#2563eb" />
          <Text style={styles.contactText}>Chat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.addToCartButton}
          onPress={handleAddToCart}
        >
          <Icon name="cart-outline" size={20} color="#ffffff" />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.buyNowButton}
          onPress={handleBuyNow}
        >
          <Text style={styles.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageSection: {
    height: 400,
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  productImage: {
    width: screenWidth,
    height: 400,
    resizeMode: 'cover',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: '#ffffff',
    width: 24,
  },
  favoriteButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 2,
  },
  productName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  originalPrice: {
    fontSize: 16,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10b981',
  },
  outOfStock: {
    backgroundColor: '#fee2e2',
  },
  outOfStockText: {
    color: '#ef4444',
  },
  variantsSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  variantButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  selectedVariant: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  variantText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedVariantText: {
    color: '#ffffff',
  },
  quantitySection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 2,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    minWidth: 40,
    textAlign: 'center',
  },
  descriptionSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  businessSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  businessLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  businessDetails: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  businessRating: {
    fontSize: 14,
    color: '#6b7280',
  },
  reviewsSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 2,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#2563eb',
  },
  reviewCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpfulText: {
    fontSize: 12,
    color: '#6b7280',
  },
  relatedSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 2,
    marginBottom: 80,
  },
  relatedCard: {
    width: 120,
    marginRight: 12,
  },
  relatedImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  relatedName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  relatedPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#ffffff',
  },
  contactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  buyNowButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  buyNowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});