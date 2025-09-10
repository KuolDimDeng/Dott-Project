import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useBusinessContext } from '../../context/BusinessContext';
import { useMenuContext } from '../../context/MenuContext';
import api from '../../services/api';
import { 
  getPOSConfig, 
  getSalesTaxRate, 
  getMockProductsByType, 
  GLOBAL_SALES_TAX 
} from '../../config/posConfigurations';

const { width: screenWidth } = Dimensions.get('window');

export default function AdaptivePOSScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { businessData, businessProfile } = useBusinessContext();
  const { menuItems: contextMenuItems, getAvailableMenuItems, decreaseStock } = useMenuContext();
  
  // Get business type from context, fallback to detected type or default
  const businessName = businessData?.businessName?.toLowerCase() || '';
  const detectedType = businessName.includes('restaurant') || 
                      businessName.includes('cafe') || 
                      businessName.includes('diner') || 
                      businessName.includes('bistro') || 
                      businessName.includes('eatery') ? 'RESTAURANT_CAFE' : 'RETAIL_STORE';
                      
  const businessType = businessData?.businessType || 
                      businessData?.category || 
                      detectedType;
  
  console.log('🏪 POS Business Detection:');
  console.log('  - Business Name:', businessData?.businessName);
  console.log('  - Business Type from Data:', businessData?.businessType);
  console.log('  - Detected Type:', detectedType);
  console.log('  - Final Business Type:', businessType);
  
  const businessCountry = businessProfile?.businessCountry || user?.country || 'SS';
  const posConfig = getPOSConfig(businessType);
  
  // Main States
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Progressive Flow States
  const [currentStep, setCurrentStep] = useState('products'); // 'products', 'cart', 'payment'
  const [showCart, setShowCart] = useState(false);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [cashReceived, setCashReceived] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  
  // Business-specific states
  const [tableNumber, setTableNumber] = useState('');
  const [orderType, setOrderType] = useState(posConfig.orderTypes?.[0] || 'Regular');
  
  // Calculation States
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [change, setChange] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [taxInfo, setTaxInfo] = useState({ rate: 0, name: 'Tax' });

  // Refs
  const barcodeInputRef = useRef(null);

  useEffect(() => {
    loadInitialData();
  }, [businessType]);

  // Reload products when menu items change
  useEffect(() => {
    console.log('🛒 POS: Menu items changed, reloading products...');
    if (contextMenuItems && contextMenuItems.length > 0) {
      const isRestaurant = businessType === 'RESTAURANT_CAFE' || detectedType === 'RESTAURANT_CAFE';
      if (isRestaurant) {
        const productsToUse = contextMenuItems.map(menuItem => ({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          category: menuItem.category,
          stock: menuItem.stock,
          sku: menuItem.sku,
          description: menuItem.description,
          image: menuItem.image,
          available: menuItem.available && menuItem.stock > 0
        }));
        setProducts(productsToUse);
        console.log('🛒 POS: Updated products from menu context:', productsToUse.length);
      }
    }
  }, [contextMenuItems]);

  useEffect(() => {
    calculateTotals();
  }, [cart, discountValue, discountType, taxRate]);

  useEffect(() => {
    if (cashReceived && paymentMethod === 'cash') {
      const received = parseFloat(cashReceived) || 0;
      setChange(Math.max(0, received - total));
    }
  }, [cashReceived, total, paymentMethod]);

  // Update tax rate when customer or business country changes
  useEffect(() => {
    const customerCountry = selectedCustomer?.country || null;
    const applicableTaxInfo = getSalesTaxRate(businessCountry, customerCountry);
    setTaxInfo(applicableTaxInfo);
    setTaxRate(applicableTaxInfo.rate);
  }, [selectedCustomer, businessCountry]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      console.log('🛒 POS: Loading menu items from context (UPDATED)...');
      console.log('🛒 POS: Available context menu items:', contextMenuItems.length);
      
      // Use menu items from MenuContext for restaurants, fallback to mock for other business types
      const isRestaurant = businessType === 'RESTAURANT_CAFE' || detectedType === 'RESTAURANT_CAFE';
      console.log('🛒 POS: Is restaurant?', isRestaurant);
      
      let productsToUse = [];
      if (isRestaurant && contextMenuItems && contextMenuItems.length > 0) {
        // Convert menu items to POS product format
        productsToUse = contextMenuItems.map(menuItem => ({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          category: menuItem.category,
          stock: menuItem.stock,
          sku: menuItem.sku,
          description: menuItem.description,
          image: menuItem.image,
          available: menuItem.available && menuItem.stock > 0
        }));
        console.log('🛒 POS: Using menu items:', productsToUse.length);
      } else {
        // Fallback to mock data for non-restaurant businesses or if no menu items
        productsToUse = getMockProductsByType(businessType);
        console.log('🛒 POS: Using mock products:', productsToUse.length);
      }
      
      setProducts(productsToUse);
      
      // Use business-specific categories
      setCategories(posConfig.categories);
      
      // Try to load customers from API, fallback to mock
      try {
        const customersRes = await api.get('/crm/customers/');
        const customersData = customersRes.data.results || customersRes.data || [];
        setCustomers(customersData.length > 0 ? customersData : getMockCustomers());
      } catch (error) {
        console.log('🛒 POS: Using mock customers (API failed)');
        setCustomers(getMockCustomers());
      }
      
    } catch (error) {
      console.error('Error loading POS data:', error);
      setProducts(getMockProductsByType(businessType));
      setCategories(posConfig.categories);
      setCustomers(getMockCustomers());
    } finally {
      setLoading(false);
    }
  };

  const adaptProductsToBusinessType = (products) => {
    return products.map(product => ({
      ...product,
      price: typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0,
      stock: typeof product.stock === 'number' ? product.stock : parseInt(product.stock) || 0,
      category: mapCategoryToBusinessType(product.category),
    }));
  };

  const mapCategoryToBusinessType = (originalCategory) => {
    // Simple category mapping - could be more sophisticated
    const categoryMappings = {
      'RESTAURANT_CAFE': {
        'food': 'main_courses',
        'drinks': 'beverages',
        'appetizer': 'appetizers',
        'dessert': 'desserts',
        'coffee': 'coffee'
      },
      'RETAIL_STORE': {
        'tech': 'electronics',
        'fashion': 'clothing',
        'shoes': 'footwear'
      }
    };
    
    const mapping = categoryMappings[businessType];
    return mapping?.[originalCategory?.toLowerCase()] || originalCategory || 'general';
  };

  const getMockCustomers = () => [
    { id: 1, name: `Walk-in ${posConfig.terminology.customer}`, phone: '', email: '', country: null, loyalty_points: 0 },
    { id: 2, name: 'John Smith', phone: '+1234567890', email: 'john@example.com', country: 'US', loyalty_points: 150 },
    { id: 3, name: 'Sarah Johnson', phone: '+254701234567', email: 'sarah@example.com', country: 'KE', loyalty_points: 320 },
    { id: 4, name: 'David Wilson', phone: '+211123456789', email: 'david@example.com', country: 'SS', loyalty_points: 85 },
  ];

  const addToCart = (product) => {
    if (product.stock <= 0) {
      Alert.alert('Out of Stock', `${product.name} is currently out of stock`);
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        Alert.alert('Stock Limit', `Only ${product.stock} items available`);
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId, quantity) => {
    const product = products.find(p => p.id === productId);
    if (quantity <= 0) {
      removeFromCart(productId);
    } else if (quantity > product.stock) {
      Alert.alert('Stock Limit', `Only ${product.stock} items available`);
    } else {
      setCart(cart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const handleBarcodeSearch = (barcode) => {
    const product = products.find(p => p.sku === barcode);
    if (product) {
      addToCart(product);
      setSearchQuery('');
    } else {
      Alert.alert('Product Not Found', `No product found with barcode: ${barcode}`);
    }
  };

  const calculateTotals = () => {
    const sub = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = sub * (discountValue / 100);
    } else {
      discountAmount = Math.min(discountValue, sub);
    }
    
    const afterDiscount = sub - discountAmount;
    const taxAmount = afterDiscount * taxRate;
    
    setSubtotal(sub);
    setDiscount(discountAmount);
    setTax(taxAmount);
    setTotal(afterDiscount + taxAmount);
  };

  const processPayment = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', `Please add ${posConfig.terminology.products.toLowerCase()} before ${posConfig.terminology.checkout.toLowerCase()}`);
      return;
    }

    if (paymentMethod === 'cash' && parseFloat(cashReceived) < total) {
      Alert.alert('Insufficient Payment', 'Cash received is less than total amount');
      return;
    }

    setProcessing(true);
    try {
      const transactionData = {
        business_type: businessType,
        items: cart.map(item => ({
          product_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        customer_id: selectedCustomer?.id,
        customer_country: selectedCustomer?.country,
        business_country: businessCountry,
        payment_method: paymentMethod,
        subtotal,
        discount,
        discount_type: discountType,
        discount_value: discountValue,
        tax_rate: taxRate,
        tax_amount: tax,
        tax_name: taxInfo.name,
        total,
        cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
        change: paymentMethod === 'cash' ? change : null,
        note: customerNote,
        // Business-specific fields
        table_number: posConfig.features.includes('tableSelection') ? tableNumber : null,
        order_type: posConfig.features.includes('orderType') ? orderType : null,
      };

      const response = await api.post('/pos/transactions/', transactionData);

      // Update stock for menu items (for restaurants)
      const isRestaurant = businessType === 'RESTAURANT_CAFE' || detectedType === 'RESTAURANT_CAFE';
      if (isRestaurant && decreaseStock) {
        console.log('🛒 POS: Updating stock after successful transaction...');
        cart.forEach(cartItem => {
          console.log(`🛒 POS: Decreasing stock for ${cartItem.name} by ${cartItem.quantity}`);
          decreaseStock(cartItem.id, cartItem.quantity);
        });
      }

      Alert.alert(
        `${posConfig.terminology.checkout} Successful`,
        `Transaction completed!\n${paymentMethod === 'cash' && change > 0 ? `Change: $${change.toFixed(2)}` : ''}`,
        [
          {
            text: `Print ${posConfig.terminology.receipt}`,
            onPress: () => {
              printReceipt(response.data);
              resetPOS();
            },
          },
          {
            text: `New ${posConfig.terminology.cart}`,
            onPress: () => resetPOS(),
          },
        ]
      );
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', 'Unable to process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = (transaction) => {
    console.log('Printing receipt for transaction:', transaction);
    Alert.alert(`${posConfig.terminology.receipt}`, `${posConfig.terminology.receipt} sent to printer`);
  };

  const resetPOS = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscountValue(0);
    setCashReceived('');
    setCustomerNote('');
    setTableNumber('');
    setOrderType(posConfig.orderTypes?.[0] || 'Regular');
    setPaymentMethod('cash');
    setCurrentStep('products');
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderProduct = ({ item }) => {
    const safePrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
    const safeStock = typeof item.stock === 'number' ? item.stock : parseInt(item.stock) || 0;
    
    return (
      <TouchableOpacity style={[styles.productCard, { borderColor: posConfig.primaryColor }]} onPress={() => addToCart(item)}>
        <View style={[styles.productImage, { backgroundColor: `${posConfig.primaryColor}20` }]}>
          <Icon name="pricetag-outline" size={28} color={posConfig.primaryColor} />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productSku}>SKU: {item.sku || 'N/A'}</Text>
          <View style={styles.productFooter}>
            <Text style={[styles.productPrice, { color: posConfig.primaryColor }]}>${safePrice.toFixed(2)}</Text>
            <Text style={[styles.productStock, safeStock < 10 && styles.lowStock]}>
              Stock: {safeStock}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCartItem = ({ item }) => {
    const safePrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
    
    return (
      <View style={styles.cartItem}>
        <View style={styles.cartItemLeft}>
          <Text style={styles.cartItemName}>{item.name}</Text>
          <Text style={styles.cartItemPrice}>${safePrice.toFixed(2)} each</Text>
        </View>
        <View style={styles.cartItemRight}>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => updateQuantity(item.id, item.quantity - 1)}
            >
              <Icon name="remove" size={16} color="#666" />
            </TouchableOpacity>
            <TextInput
              style={styles.quantityInput}
              value={item.quantity.toString()}
              onChangeText={(text) => {
                const qty = parseInt(text) || 0;
                updateQuantity(item.id, qty);
              }}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => updateQuantity(item.id, item.quantity + 1)}
            >
              <Icon name="add" size={16} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.cartItemTotal}>
            ${(safePrice * item.quantity).toFixed(2)}
          </Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFromCart(item.id)}
          >
            <Icon name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={posConfig.primaryColor} />
          <Text style={styles.loadingText}>Loading {posConfig.terminology.products}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: posConfig.primaryColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {businessType.replace('_', ' ')} POS - {posConfig.terminology.products}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Action Bar */}
      <View style={styles.quickActionBar}>
        
        {/* Cart Button */}
        <TouchableOpacity 
          style={[styles.quickActionButton, styles.cartButton, cart.length > 0 && { backgroundColor: posConfig.primaryColor }]}
          onPress={() => setCurrentStep('cart')}
        >
          <Icon name="cart-outline" size={18} color={cart.length > 0 ? 'white' : '#666'} />
          <Text style={[styles.quickActionText, { color: cart.length > 0 ? 'white' : '#666' }]}>
            {posConfig.terminology.cart} ({cart.length})
          </Text>
        </TouchableOpacity>
        
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepDots}>
            <View style={[styles.stepDot, currentStep === 'products' && styles.activeStepDot]} />
            <View style={[styles.stepDot, currentStep === 'cart' && styles.activeStepDot]} />
            <View style={[styles.stepDot, currentStep === 'payment' && styles.activeStepDot]} />
          </View>
          <Text style={styles.stepText}>
            {currentStep === 'products' && `1. Select ${posConfig.terminology.products}`}
            {currentStep === 'cart' && '2. Review Order'}
            {currentStep === 'payment' && '3. Complete Payment'}
          </Text>
        </View>
      </View>

      <View style={styles.mainContainer}>
        {/* Step 1: Product Selection */}
        {currentStep === 'products' && (
          <View style={styles.fullScreenPanel}>
            <View style={styles.searchBar}>
              <Icon name="search" size={20} color="#666" />
              <TextInput
                ref={barcodeInputRef}
                style={styles.searchInput}
                placeholder={`Search ${posConfig.terminology.products.toLowerCase()} or scan barcode...`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => {
                  if (searchQuery.length > 6) {
                    handleBarcodeSearch(searchQuery);
                  }
                }}
              />
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Categories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
              <TouchableOpacity
                style={[styles.categoryButton, selectedCategory === 'all' && styles.categoryActive]}
                onPress={() => setSelectedCategory('all')}
              >
                <Icon name="apps" size={18} color={selectedCategory === 'all' ? 'white' : '#666'} />
                <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {posConfig.categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryButton, selectedCategory === category.id && [styles.categoryActive, { backgroundColor: category.color }]]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Icon
                    name={category.icon}
                    size={18}
                    color={selectedCategory === category.id ? 'white' : category.color}
                  />
                  <Text style={[styles.categoryText, selectedCategory === category.id && styles.categoryTextActive]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Products Grid */}
            <FlatList
              data={filteredProducts}
              renderItem={renderProduct}
              keyExtractor={item => item.id.toString()}
              numColumns={4}
              contentContainerStyle={styles.productGrid}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* Step 2: Cart Review */}
        {currentStep === 'cart' && (
          <View style={styles.fullScreenPanel}>
            <View style={styles.cartReviewHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setCurrentStep('products')}
              >
                <Icon name="arrow-back" size={20} color={posConfig.primaryColor} />
                <Text style={[styles.backButtonText, { color: posConfig.primaryColor }]}>Add More Items</Text>
              </TouchableOpacity>
              <Text style={styles.cartReviewTitle}>{posConfig.terminology.cart} Review</Text>
            </View>

            {cart.length === 0 ? (
              <View style={styles.emptyCartFullScreen}>
                <Icon name="cart-outline" size={80} color="#ccc" />
                <Text style={styles.emptyCartTitle}>{posConfig.terminology.cart} is empty</Text>
                <Text style={styles.emptyCartSubtext}>Add {posConfig.terminology.products.toLowerCase()} to get started</Text>
                <TouchableOpacity 
                  style={[styles.addItemsButton, { backgroundColor: posConfig.primaryColor }]}
                  onPress={() => setCurrentStep('products')}
                >
                  <Icon name="add" size={20} color="white" />
                  <Text style={styles.addItemsButtonText}>Add {posConfig.terminology.products}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.cartReviewContent} showsVerticalScrollIndicator={false}>
                {/* Customer Selection */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Customer</Text>
                  <TouchableOpacity
                    style={styles.customerSelector}
                    onPress={() => setShowCustomerModal(true)}
                  >
                    <Icon name="person-circle" size={24} color={posConfig.primaryColor} />
                    <Text style={styles.customerText}>
                      {selectedCustomer ? selectedCustomer.name : `Select ${posConfig.terminology.customer}`}
                    </Text>
                    <Icon name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Business-specific fields */}
                {posConfig.features.includes('tableSelection') && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Table Information</Text>
                    <TextInput
                      style={styles.businessInput}
                      placeholder="Table Number"
                      value={tableNumber}
                      onChangeText={setTableNumber}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                {/* Order Items */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Order Items</Text>
                  {cart.map((item, index) => (
                    <View key={item.id} style={styles.cartReviewItem}>
                      <View style={styles.cartReviewItemLeft}>
                        <Text style={styles.cartReviewItemName}>{item.name}</Text>
                        <Text style={styles.cartReviewItemPrice}>${(typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0).toFixed(2)} each</Text>
                      </View>
                      <View style={styles.cartReviewItemRight}>
                        <View style={styles.quantityControls}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Icon name="remove" size={16} color="#666" />
                          </TouchableOpacity>
                          <Text style={styles.quantityDisplay}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Icon name="add" size={16} color="#666" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.cartReviewItemTotal}>
                          ${((typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0) * item.quantity).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Order Summary */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Order Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
                  </View>
                  {discount > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Discount</Text>
                      <Text style={[styles.summaryValue, styles.discountText]}>
                        -${discount.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{taxInfo.name} ({(taxRate * 100).toFixed(1)}%)</Text>
                    <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalSummaryRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={[styles.totalValue, { color: posConfig.primaryColor }]}>${total.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.cartActionButtons}>
                  <TouchableOpacity
                    style={styles.discountButton}
                    onPress={() => setShowDiscountModal(true)}
                  >
                    <Icon name="pricetag-outline" size={18} color="#92400e" />
                    <Text style={styles.discountButtonText}>
                      {discount > 0 ? `Discount: $${discount.toFixed(2)}` : 'Add Discount'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.proceedButton, { backgroundColor: posConfig.primaryColor }]}
                    onPress={() => setCurrentStep('payment')}
                  >
                    <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
                    <Icon name="arrow-forward" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        )}

        {/* Step 3: Payment */}
        {currentStep === 'payment' && (
          <View style={styles.fullScreenPanel}>
            <View style={styles.paymentHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setCurrentStep('cart')}
              >
                <Icon name="arrow-back" size={20} color={posConfig.primaryColor} />
                <Text style={[styles.backButtonText, { color: posConfig.primaryColor }]}>Review Order</Text>
              </TouchableOpacity>
              <Text style={styles.paymentTitle}>Complete Payment</Text>
            </View>

            <ScrollView style={styles.paymentContent} showsVerticalScrollIndicator={false}>
              {/* Payment Summary */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Payment Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
                </View>
                {discount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Discount</Text>
                    <Text style={[styles.summaryValue, styles.discountText]}>
                      -${discount.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{taxInfo.name} ({(taxRate * 100).toFixed(1)}%)</Text>
                  <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalSummaryRow]}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={[styles.totalValue, styles.largeTotal, { color: posConfig.primaryColor }]}>${total.toFixed(2)}</Text>
                </View>
              </View>

              {/* Payment Methods */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Payment Method</Text>
                <View style={styles.paymentMethodsGrid}>
                  <TouchableOpacity
                    style={[styles.paymentMethodCard, paymentMethod === 'cash' && [styles.paymentMethodActive, { backgroundColor: posConfig.primaryColor }]]}
                    onPress={() => setPaymentMethod('cash')}
                  >
                    <Icon name="cash" size={28} color={paymentMethod === 'cash' ? 'white' : '#666'} />
                    <Text style={[styles.paymentMethodText, paymentMethod === 'cash' && styles.paymentMethodTextActive]}>
                      Cash
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.paymentMethodCard, paymentMethod === 'card' && [styles.paymentMethodActive, { backgroundColor: posConfig.primaryColor }]]}
                    onPress={() => setPaymentMethod('card')}
                  >
                    <Icon name="card" size={28} color={paymentMethod === 'card' ? 'white' : '#666'} />
                    <Text style={[styles.paymentMethodText, paymentMethod === 'card' && styles.paymentMethodTextActive]}>
                      Card
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.paymentMethodCard, paymentMethod === 'dott_qr' && [styles.paymentMethodActive, { backgroundColor: posConfig.primaryColor }]]}
                    onPress={() => setPaymentMethod('dott_qr')}
                  >
                    <Image 
                      source={require('../../assets/icon.png')} 
                      style={[styles.dottQRLogo, paymentMethod === 'dott_qr' && styles.dottQRLogoActive]} 
                    />
                    <Text style={[styles.paymentMethodText, paymentMethod === 'dott_qr' && styles.paymentMethodTextActive]}>
                      Dott (QR)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Cash Payment Details */}
              {paymentMethod === 'cash' && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Cash Payment</Text>
                  <Text style={styles.cashInputLabel}>Amount Received</Text>
                  <TextInput
                    style={styles.cashInputLarge}
                    value={cashReceived}
                    onChangeText={setCashReceived}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                  <View style={styles.quickCashButtons}>
                    {[Math.ceil(total), Math.ceil(total / 20) * 20, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100].map((amount, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.quickCashButton, { borderColor: posConfig.primaryColor }]}
                        onPress={() => setCashReceived(amount.toString())}
                      >
                        <Text style={[styles.quickCashText, { color: posConfig.primaryColor }]}>${amount}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {change > 0 && (
                    <View style={styles.changeContainer}>
                      <Text style={styles.changeLabel}>Change Due</Text>
                      <Text style={styles.changeAmount}>${change.toFixed(2)}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Notes */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>
                  {posConfig.features.includes('kitchenNotes') ? 'Kitchen Notes' : 'Order Notes'}
                </Text>
                <TextInput
                  style={styles.noteInput}
                  value={customerNote}
                  onChangeText={setCustomerNote}
                  placeholder={posConfig.features.includes('kitchenNotes') ? 'Special cooking instructions...' : 'Add a note...'}
                  multiline
                />
              </View>

              {/* Complete Payment Button */}
              <TouchableOpacity
                style={[styles.completePaymentButton, { backgroundColor: posConfig.primaryColor }, processing && styles.processingButton]}
                onPress={processPayment}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Icon name="checkmark-circle" size={24} color="white" />
                    <Text style={styles.completePaymentText}>
                      Complete Sale - ${total.toFixed(2)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

      </View>

      {/* Customer Selection Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {posConfig.terminology.customer}</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={customers}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerItem}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setShowCustomerModal(false);
                  }}
                >
                  <Icon name="person-circle" size={32} color={posConfig.primaryColor} />
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <Text style={styles.customerDetails}>
                      {item.phone || 'No phone'} 
                      {item.country && ` • ${GLOBAL_SALES_TAX[item.country]?.country || item.country}`}
                      {item.loyalty_points ? ` • Points: ${item.loyalty_points}` : ''}
                    </Text>
                  </View>
                  {selectedCustomer?.id === item.id && (
                    <Icon name="checkmark-circle" size={24} color="#22c55e" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>


      {/* Discount Modal */}
      <Modal
        visible={showDiscountModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDiscountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply Discount</Text>
              <TouchableOpacity onPress={() => setShowDiscountModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.discountTypes}>
              <TouchableOpacity
                style={[styles.discountTypeButton, discountType === 'percentage' && [styles.discountTypeActive, { backgroundColor: posConfig.primaryColor }]]}
                onPress={() => setDiscountType('percentage')}
              >
                <Text style={[styles.discountTypeText, discountType === 'percentage' && styles.discountTypeTextActive]}>
                  Percentage (%)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.discountTypeButton, discountType === 'fixed' && [styles.discountTypeActive, { backgroundColor: posConfig.primaryColor }]]}
                onPress={() => setDiscountType('fixed')}
              >
                <Text style={[styles.discountTypeText, discountType === 'fixed' && styles.discountTypeTextActive]}>
                  Fixed Amount ($)
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.discountInput}
              value={discountValue.toString()}
              onChangeText={(text) => setDiscountValue(parseFloat(text) || 0)}
              keyboardType="decimal-pad"
              placeholder={discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
            />
            <View style={styles.quickDiscounts}>
              {discountType === 'percentage' ? (
                <>
                  {[5, 10, 15, 20].map(percent => (
                    <TouchableOpacity
                      key={percent}
                      style={[styles.quickDiscountButton, { borderColor: posConfig.primaryColor }]}
                      onPress={() => setDiscountValue(percent)}
                    >
                      <Text style={[styles.quickDiscountText, { color: posConfig.primaryColor }]}>{percent}%</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <>
                  {[5, 10, 20, 50].map(amount => (
                    <TouchableOpacity
                      key={amount}
                      style={[styles.quickDiscountButton, { borderColor: posConfig.primaryColor }]}
                      onPress={() => setDiscountValue(amount)}
                    >
                      <Text style={[styles.quickDiscountText, { color: posConfig.primaryColor }]}>${amount}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
            <TouchableOpacity 
              style={[styles.applyDiscountButton, { backgroundColor: posConfig.primaryColor }]} 
              onPress={() => setShowDiscountModal(false)}
            >
              <Text style={styles.applyDiscountText}>Apply Discount</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 15,
  },
  quickActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  cartButton: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  quickActionText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  stepIndicator: {
    alignItems: 'center',
  },
  stepDots: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e1e8ed',
    marginHorizontal: 3,
  },
  activeStepDot: {
    backgroundColor: '#2563eb',
  },
  stepText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  mainContainer: {
    flex: 1,
  },
  fullScreenPanel: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 15,
    color: '#333',
  },
  categoriesContainer: {
    paddingHorizontal: 15,
    maxHeight: 50,
    marginBottom: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
    borderRadius: 15,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  categoryActive: {
    borderColor: '#2563eb',
  },
  categoryText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  categoryTextActive: {
    color: 'white',
  },
  productGrid: {
    padding: 15,
  },
  productCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    margin: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    minHeight: 120,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  productInfo: {
    width: '100%',
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  productSku: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
  productFooter: {
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  productStock: {
    fontSize: 9,
    color: '#666',
  },
  lowStock: {
    color: '#ef4444',
  },
  cartReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  cartReviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  cartReviewContent: {
    flex: 1,
    paddingHorizontal: 15,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  customerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  emptyCartFullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyCartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 30,
  },
  addItemsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addItemsButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  cartReviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartReviewItemLeft: {
    flex: 1,
  },
  cartReviewItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cartReviewItemPrice: {
    fontSize: 13,
    color: '#666',
  },
  cartReviewItemRight: {
    alignItems: 'flex-end',
  },
  quantityDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  cartReviewItemTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  cartActionButtons: {
    paddingVertical: 20,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 12,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginRight: 8,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  paymentContent: {
    flex: 1,
    paddingHorizontal: 15,
  },
  largeTotal: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  paymentMethodCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    backgroundColor: 'white',
  },
  paymentMethodActive: {
    borderWidth: 2,
  },
  paymentMethodText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  paymentMethodTextActive: {
    color: 'white',
  },
  dottQRLogo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  dottQRLogoActive: {
    // Keep same size for active state
  },
  cashInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cashInputLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  completePaymentButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginVertical: 20,
  },
  completePaymentText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  customerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#333',
  },
  businessInput: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  orderTypeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  orderTypeActive: {
    backgroundColor: '#2563eb',
  },
  orderTypeText: {
    fontSize: 11,
    color: '#666',
  },
  orderTypeTextActive: {
    color: 'white',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  cartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  clearCartText: {
    fontSize: 12,
    color: '#ef4444',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginTop: 8,
  },
  emptyCartSubtext: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 4,
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemLeft: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  cartItemRight: {
    alignItems: 'flex-end',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  quantityButton: {
    width: 24,
    height: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    width: 32,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 6,
  },
  cartItemTotal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  removeButton: {
    padding: 2,
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  discountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    marginBottom: 12,
  },
  discountButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#92400e',
  },
  taxInfoContainer: {
    marginBottom: 8,
  },
  taxInfoText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  taxInfoSubtext: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  totalsContainer: {
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalText: {
    fontSize: 12,
    color: '#666',
  },
  totalAmount: {
    fontSize: 12,
    color: '#333',
  },
  discountAmount: {
    color: '#22c55e',
  },
  grandTotalRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  grandTotalText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtons: {
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 6,
  },
  payButton: {
    backgroundColor: '#22c55e',
  },
  payButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  paymentModalContent: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  customerDetails: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  paymentSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  discountText: {
    color: '#22c55e',
  },
  totalSummaryRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paymentMethods: {
    marginBottom: 20,
  },
  methodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    backgroundColor: 'white',
  },
  methodActive: {
    borderColor: '#2563eb',
  },
  methodText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  methodTextActive: {
    color: 'white',
  },
  cashSection: {
    marginBottom: 20,
  },
  cashInput: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
  },
  quickCashButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickCashButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    alignItems: 'center',
  },
  quickCashText: {
    fontSize: 12,
    fontWeight: '600',
  },
  changeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    padding: 10,
    borderRadius: 8,
  },
  changeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  changeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#166534',
  },
  noteSection: {
    marginBottom: 20,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  processButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
  },
  processingButton: {
    opacity: 0.7,
  },
  processButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  discountTypes: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  discountTypeButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    alignItems: 'center',
  },
  discountTypeActive: {
    borderColor: '#2563eb',
  },
  discountTypeText: {
    fontSize: 12,
    color: '#666',
  },
  discountTypeTextActive: {
    color: 'white',
  },
  discountInput: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
  },
  quickDiscounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  quickDiscountButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    alignItems: 'center',
  },
  quickDiscountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  applyDiscountButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyDiscountText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
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