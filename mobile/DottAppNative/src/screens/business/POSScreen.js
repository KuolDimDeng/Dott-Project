import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  FlatList,
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
import { useMenuContext } from '../../context/MenuContext';
import { useCurrency } from '../../context/CurrencyContext';
import api from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

export default function POSScreen() {
  const navigation = useNavigation();
  const { menuItems, categories: menuCategories, getAvailableMenuItems } = useMenuContext();
  const { currency } = useCurrency();
  
  // Main States
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showQuickCash, setShowQuickCash] = useState(false);
  const [showNumpad, setShowNumpad] = useState(false);
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountType, setDiscountType] = useState('percentage'); // percentage or fixed
  const [discountValue, setDiscountValue] = useState(0);
  const [cashReceived, setCashReceived] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  
  // Calculation States
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [change, setChange] = useState(0);

  // Refs
  const barcodeInputRef = useRef(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Update products when menu items change
  useEffect(() => {
    if (menuItems && menuItems.length > 0) {
      const availableItems = getAvailableMenuItems();
      setProducts(availableItems);
    }
  }, [menuItems]);

  // Update categories when menu categories change  
  useEffect(() => {
    if (menuCategories && menuCategories.length > 0) {
      setCategories(menuCategories);
    }
  }, [menuCategories]);

  useEffect(() => {
    calculateTotals();
  }, [cart, discountValue, discountType]);

  useEffect(() => {
    if (cashReceived && paymentMethod === 'cash') {
      const received = parseFloat(cashReceived) || 0;
      setChange(Math.max(0, received - total));
    }
  }, [cashReceived, total, paymentMethod]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load customers from API
      const customersRes = await api.get('/crm/customers/').catch(() => ({ data: { results: [] } }));
      const customersData = customersRes.data.results || customersRes.data || [];
      setCustomers(customersData);

      // Use menu items from MenuContext (these include photos and costing data)
      const availableItems = getAvailableMenuItems();
      setProducts(availableItems);
      
      // Use menu categories from MenuContext
      setCategories(menuCategories);
      
    } catch (error) {
      console.error('Error loading POS data:', error);
      // Use menu items even on error
      setProducts(getAvailableMenuItems());
      setCategories(menuCategories);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const getMockProducts = () => [
    { id: 1, name: 'Americano', price: 4.50, category: 'Coffee', sku: 'COF001', stock: 100, image: null },
    { id: 2, name: 'Cappuccino', price: 5.50, category: 'Coffee', sku: 'COF002', stock: 85, image: null },
    { id: 3, name: 'Latte', price: 5.99, category: 'Coffee', sku: 'COF003', stock: 92, image: null },
    { id: 4, name: 'Espresso', price: 3.50, category: 'Coffee', sku: 'COF004', stock: 150, image: null },
    { id: 5, name: 'Croissant', price: 3.99, category: 'Bakery', sku: 'BAK001', stock: 45, image: null },
    { id: 6, name: 'Bagel', price: 2.99, category: 'Bakery', sku: 'BAK002', stock: 60, image: null },
    { id: 7, name: 'Muffin', price: 3.50, category: 'Bakery', sku: 'BAK003', stock: 38, image: null },
    { id: 8, name: 'Sandwich', price: 8.99, category: 'Food', sku: 'FOD001', stock: 25, image: null },
    { id: 9, name: 'Salad', price: 7.50, category: 'Food', sku: 'FOD002', stock: 30, image: null },
    { id: 10, name: 'Pasta', price: 12.99, category: 'Food', sku: 'FOD003', stock: 20, image: null },
    { id: 11, name: 'Orange Juice', price: 4.99, category: 'Beverages', sku: 'BEV001', stock: 55, image: null },
    { id: 12, name: 'Water', price: 1.99, category: 'Beverages', sku: 'BEV002', stock: 200, image: null },
    { id: 13, name: 'Soda', price: 2.99, category: 'Beverages', sku: 'BEV003', stock: 120, image: null },
    { id: 14, name: 'Ice Cream', price: 4.50, category: 'Desserts', sku: 'DES001', stock: 40, image: null },
    { id: 15, name: 'Cake Slice', price: 5.99, category: 'Desserts', sku: 'DES002', stock: 25, image: null },
  ];

  const getMockCategories = () => [
    { id: 1, name: 'Coffee', icon: 'cafe', color: '#8B4513' },
    { id: 2, name: 'Bakery', icon: 'restaurant', color: '#D2691E' },
    { id: 3, name: 'Food', icon: 'fast-food', color: '#FF6347' },
    { id: 4, name: 'Beverages', icon: 'beer', color: '#4169E1' },
    { id: 5, name: 'Desserts', icon: 'ice-cream', color: '#FF69B4' },
  ];

  const getMockCustomers = () => [
    { id: 1, name: 'Walk-in Customer', phone: '', email: '', loyalty_points: 0 },
    { id: 2, name: 'John Smith', phone: '+1234567890', email: 'john@example.com', loyalty_points: 150 },
    { id: 3, name: 'Sarah Johnson', phone: '+1234567891', email: 'sarah@example.com', loyalty_points: 320 },
    { id: 4, name: 'Mike Williams', phone: '+1234567892', email: 'mike@example.com', loyalty_points: 85 },
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

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
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
    const taxAmount = afterDiscount * 0.08; // 8% tax
    
    setSubtotal(sub);
    setDiscount(discountAmount);
    setTax(taxAmount);
    setTotal(afterDiscount + taxAmount);
  };

  const applyDiscount = () => {
    setShowDiscountModal(false);
  };

  const handleQuickCash = (amount) => {
    setCashReceived(amount.toString());
    setShowQuickCash(false);
  };

  const processPayment = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before checkout');
      return;
    }

    if (paymentMethod === 'cash' && parseFloat(cashReceived) < total) {
      Alert.alert('Insufficient Payment', 'Cash received is less than total amount');
      return;
    }

    setProcessing(true);
    try {
      // Convert discount to percentage if it's an amount
      let discountPercentage = 0;
      if (discountType === 'percentage') {
        discountPercentage = discountValue;
      } else if (discountType === 'amount' && subtotal > 0) {
        discountPercentage = (discountValue / subtotal) * 100;
      }

      // Calculate tax rate from tax amount
      const taxRate = subtotal > 0 ? (tax / (subtotal - discount)) * 100 : 0;

      const transactionData = {
        items: cart.map(item => ({
          id: item.id,
          type: 'product', // Assuming all items are products for now
          quantity: item.quantity,
          unit_price: item.price,
        })),
        customer_id: selectedCustomer?.id || null,
        payment_method: paymentMethod,
        amount_tendered: paymentMethod === 'cash' ? parseFloat(cashReceived) : total,
        discount_percentage: discountPercentage,
        tax_rate: taxRate,
        notes: customerNote || '',
        currency_code: currency?.code || 'USD',
        currency_symbol: currency?.symbol || '$',
      };

      const response = await api.post('/pos/transactions/', transactionData);

      Alert.alert(
        'Payment Successful',
        `Transaction completed!\n${paymentMethod === 'cash' ? `Change: $${change.toFixed(2)}` : ''}`,
        [
          {
            text: 'Print Receipt',
            onPress: () => printReceipt(response.data),
          },
          {
            text: 'New Sale',
            onPress: () => resetPOS(),
          },
        ]
      );
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', 'Unable to process payment. Please try again.');
    } finally {
      setProcessing(false);
      setShowPaymentModal(false);
    }
  };

  const printReceipt = (transaction) => {
    console.log('Printing receipt for transaction:', transaction);
    Alert.alert('Receipt', 'Receipt sent to printer');
  };

  const resetPOS = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscountValue(0);
    setCashReceived('');
    setCustomerNote('');
    setPaymentMethod('cash');
  };

  const holdTransaction = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Nothing to hold');
      return;
    }
    
    // Save current transaction
    const heldTransaction = {
      cart,
      customer: selectedCustomer,
      discount: discountValue,
      discountType,
      note: customerNote,
      timestamp: new Date().toISOString(),
    };
    
    // In real app, save to AsyncStorage or backend
    console.log('Holding transaction:', heldTransaction);
    Alert.alert('Transaction Held', 'Transaction saved for later');
    resetPOS();
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderProduct = ({ item }) => {
    // Safely handle price formatting
    const safePrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
    const safeStock = typeof item.stock === 'number' ? item.stock : parseInt(item.stock) || 0;
    
    return (
      <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
        <View style={styles.productImage}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productPhoto} />
          ) : (
            <Icon name={getCategoryIcon(item.category)} size={32} color="#666" />
          )}
          {item.estimatedCost && (
            <View style={styles.costBadge}>
              <Text style={styles.costText}>${safePrice.toFixed(2)}</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productSku}>SKU: {item.sku || 'N/A'}</Text>
          <View style={styles.productFooter}>
            <Text style={styles.productPrice}>${safePrice.toFixed(2)}</Text>
            <Text style={[styles.productStock, safeStock < 10 && styles.lowStock]}>
              Stock: {safeStock}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemLeft}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>${item.price.toFixed(2)} each</Text>
      </View>
      <View style={styles.cartItemRight}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
          >
            <Icon name="remove" size={18} color="#666" />
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
            <Icon name="add" size={18} color="#666" />
          </TouchableOpacity>
        </View>
        <Text style={styles.cartItemTotal}>
          ${(item.price * item.quantity).toFixed(2)}
        </Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Icon name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.name === category);
    return cat?.icon || 'pricetag';
  };

  const renderCustomerModal = () => (
    <Modal
      visible={showCustomerModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCustomerModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Customer</Text>
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
                <Icon name="person-circle" size={32} color="#2563eb" />
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerDetails}>
                    {item.phone || 'No phone'} • Points: {item.loyalty_points}
                  </Text>
                </View>
                {selectedCustomer?.id === item.id && (
                  <Icon name="checkmark-circle" size={24} color="#22c55e" />
                )}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.addCustomerButton}
            onPress={() => {
              setShowCustomerModal(false);
              navigation.navigate('AddCustomer');
            }}
          >
            <Icon name="add-circle-outline" size={20} color="white" />
            <Text style={styles.addCustomerText}>Add New Customer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderPaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalContent, styles.paymentModalContent]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Complete Payment</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.paymentSummary}>
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
                <Text style={styles.summaryLabel}>Tax (8%)</Text>
                <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.paymentMethods}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.methodsGrid}>
                <TouchableOpacity
                  style={[styles.methodButton, paymentMethod === 'cash' && styles.methodActive]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <Icon name="cash" size={24} color={paymentMethod === 'cash' ? 'white' : '#666'} />
                  <Text style={[styles.methodText, paymentMethod === 'cash' && styles.methodTextActive]}>
                    Cash
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodButton, paymentMethod === 'card' && styles.methodActive]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <Icon name="card" size={24} color={paymentMethod === 'card' ? 'white' : '#666'} />
                  <Text style={[styles.methodText, paymentMethod === 'card' && styles.methodTextActive]}>
                    Card
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodButton, paymentMethod === 'mobile' && styles.methodActive]}
                  onPress={() => setPaymentMethod('mobile')}
                >
                  <Icon name="phone-portrait" size={24} color={paymentMethod === 'mobile' ? 'white' : '#666'} />
                  <Text style={[styles.methodText, paymentMethod === 'mobile' && styles.methodTextActive]}>
                    Mobile
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {paymentMethod === 'cash' && (
              <View style={styles.cashSection}>
                <Text style={styles.sectionTitle}>Cash Received</Text>
                <TextInput
                  style={styles.cashInput}
                  value={cashReceived}
                  onChangeText={setCashReceived}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
                <View style={styles.quickCashButtons}>
                  {[20, 50, 100, 200].map(amount => (
                    <TouchableOpacity
                      key={amount}
                      style={styles.quickCashButton}
                      onPress={() => handleQuickCash(amount)}
                    >
                      <Text style={styles.quickCashText}>${amount}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {change > 0 && (
                  <View style={styles.changeContainer}>
                    <Text style={styles.changeLabel}>Change</Text>
                    <Text style={styles.changeAmount}>${change.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.noteSection}>
              <Text style={styles.sectionTitle}>Note (Optional)</Text>
              <TextInput
                style={styles.noteInput}
                value={customerNote}
                onChangeText={setCustomerNote}
                placeholder="Add a note..."
                multiline
              />
            </View>

            <TouchableOpacity
              style={[styles.processButton, processing && styles.processingButton]}
              onPress={processPayment}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Icon name="checkmark-circle" size={24} color="white" />
                  <Text style={styles.processButtonText}>
                    Complete Sale - ${total.toFixed(2)}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading POS...</Text>
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
        <Text style={styles.headerTitle}>POS Terminal</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('POSHistory')}>
            <Icon name="time-outline" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('POSSettings')}>
            <Icon name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContainer}>
        {/* Left Panel - Products */}
        <View style={styles.leftPanel}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#666" />
            <TextInput
              ref={barcodeInputRef}
              style={styles.searchInput}
              placeholder="Search or scan barcode..."
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            <TouchableOpacity
              style={[styles.categoryButton, selectedCategory === 'all' && styles.categoryActive]}
              onPress={() => setSelectedCategory('all')}
            >
              <Icon name="apps" size={20} color={selectedCategory === 'all' ? 'white' : '#666'} />
              <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryButton, selectedCategory === category.name && styles.categoryActive]}
                onPress={() => setSelectedCategory(category.name)}
              >
                <Icon
                  name={category.icon}
                  size={20}
                  color={selectedCategory === category.name ? 'white' : category.color}
                />
                <Text style={[styles.categoryText, selectedCategory === category.name && styles.categoryTextActive]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={item => item.id.toString()}
            numColumns={3}
            contentContainerStyle={styles.productGrid}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Right Panel - Cart */}
        <View style={styles.rightPanel}>
          <View style={styles.customerSection}>
            <TouchableOpacity
              style={styles.customerSelector}
              onPress={() => setShowCustomerModal(true)}
            >
              <Icon name="person-circle" size={24} color="#2563eb" />
              <Text style={styles.customerText}>
                {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
              </Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Cart ({cart.length} items)</Text>
            <TouchableOpacity onPress={() => setCart([])}>
              <Text style={styles.clearCartText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Icon name="cart-outline" size={48} color="#ccc" />
              <Text style={styles.emptyCartText}>Cart is empty</Text>
              <Text style={styles.emptyCartSubtext}>Add items to get started</Text>
            </View>
          ) : (
            <FlatList
              data={cart}
              renderItem={renderCartItem}
              keyExtractor={item => item.id.toString()}
              style={styles.cartList}
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={styles.cartFooter}>
            <TouchableOpacity
              style={styles.discountButton}
              onPress={() => setShowDiscountModal(true)}
            >
              <Icon name="pricetag-outline" size={20} color="#666" />
              <Text style={styles.discountButtonText}>
                {discount > 0 ? `Discount: $${discount.toFixed(2)}` : 'Add Discount'}
              </Text>
            </TouchableOpacity>

            <View style={styles.totalsContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalText}>Subtotal</Text>
                <Text style={styles.totalAmount}>${subtotal.toFixed(2)}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalText}>Discount</Text>
                  <Text style={[styles.totalAmount, styles.discountAmount]}>
                    -${discount.toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalText}>Tax</Text>
                <Text style={styles.totalAmount}>${tax.toFixed(2)}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalText}>Total</Text>
                <Text style={styles.grandTotalAmount}>${total.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.holdButton]}
                onPress={holdTransaction}
                disabled={cart.length === 0}
              >
                <Icon name="pause-outline" size={20} color="#666" />
                <Text style={styles.holdButtonText}>Hold</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.payButton]}
                onPress={() => setShowPaymentModal(true)}
                disabled={cart.length === 0}
              >
                <Icon name="cash-outline" size={20} color="white" />
                <Text style={styles.payButtonText}>Pay ${total.toFixed(2)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Modals */}
      {renderCustomerModal()}
      {renderPaymentModal()}

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
                style={[styles.discountTypeButton, discountType === 'percentage' && styles.discountTypeActive]}
                onPress={() => setDiscountType('percentage')}
              >
                <Text style={[styles.discountTypeText, discountType === 'percentage' && styles.discountTypeTextActive]}>
                  Percentage (%)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.discountTypeButton, discountType === 'fixed' && styles.discountTypeActive]}
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
                      style={styles.quickDiscountButton}
                      onPress={() => setDiscountValue(percent)}
                    >
                      <Text style={styles.quickDiscountText}>{percent}%</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <>
                  {[5, 10, 20, 50].map(amount => (
                    <TouchableOpacity
                      key={amount}
                      style={styles.quickDiscountButton}
                      onPress={() => setDiscountValue(amount)}
                    >
                      <Text style={styles.quickDiscountText}>${amount}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
            <TouchableOpacity style={styles.applyDiscountButton} onPress={applyDiscount}>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 15,
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 2,
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e1e8ed',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: 'white',
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
    maxHeight: 60,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  categoryActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryText: {
    marginLeft: 5,
    fontSize: 14,
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
    borderRadius: 10,
    padding: 10,
    margin: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  productPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  costBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
  },
  costText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  productInfo: {
    width: '100%',
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  productSku: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  productStock: {
    fontSize: 10,
    color: '#666',
  },
  lowStock: {
    color: '#ef4444',
  },
  customerSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  customerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  customerText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clearCartText: {
    fontSize: 14,
    color: '#ef4444',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 10,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemLeft: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cartItemRight: {
    alignItems: 'flex-end',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  quantityButton: {
    width: 28,
    height: 28,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  removeButton: {
    padding: 4,
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  discountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    marginBottom: 10,
  },
  discountButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#92400e',
  },
  totalsContainer: {
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalText: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 14,
    color: '#333',
  },
  discountAmount: {
    color: '#22c55e',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  grandTotalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  holdButton: {
    backgroundColor: '#f0f0f0',
  },
  holdButtonText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  payButton: {
    backgroundColor: '#22c55e',
  },
  payButtonText: {
    marginLeft: 5,
    fontSize: 14,
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
  addCustomerButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  addCustomerText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
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
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  discountText: {
    color: '#22c55e',
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
    paddingVertical: 15,
    marginHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    backgroundColor: 'white',
  },
  methodActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  methodText: {
    marginTop: 5,
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
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 15,
  },
  quickCashButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  quickCashButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    alignItems: 'center',
  },
  quickCashText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  changeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 8,
  },
  changeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
  },
  changeAmount: {
    fontSize: 20,
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
    paddingVertical: 15,
    borderRadius: 8,
  },
  processingButton: {
    opacity: 0.7,
  },
  processButtonText: {
    marginLeft: 8,
    fontSize: 16,
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
    marginHorizontal: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    alignItems: 'center',
  },
  discountTypeActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  discountTypeText: {
    fontSize: 14,
    color: '#666',
  },
  discountTypeTextActive: {
    color: 'white',
  },
  discountInput: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 15,
  },
  quickDiscounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  quickDiscountButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    alignItems: 'center',
  },
  quickDiscountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  applyDiscountButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
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