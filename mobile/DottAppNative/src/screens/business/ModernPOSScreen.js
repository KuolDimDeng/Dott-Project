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
  Animated,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useMenuContext } from '../../context/MenuContext';
import { useBusinessContext } from '../../context/BusinessContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Currency configurations for African countries
const AFRICAN_CURRENCIES = {
  'KE': { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', taxRate: 0.16 },
  'UG': { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', taxRate: 0.18 },
  'TZ': { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', taxRate: 0.18 },
  'RW': { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', taxRate: 0.18 },
  'NG': { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', taxRate: 0.075 },
  'GH': { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', taxRate: 0.125 },
  'ZA': { code: 'ZAR', symbol: 'R', name: 'South African Rand', taxRate: 0.15 },
  'EG': { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', taxRate: 0.14 },
  'ET': { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', taxRate: 0.15 },
  'SS': { code: 'SSP', symbol: 'SSP', name: 'South Sudanese Pound', taxRate: 0.18 },
  'DEFAULT': { code: 'USD', symbol: '$', name: 'US Dollar', taxRate: 0.08 },
};

export default function ModernPOSScreen() {
  const navigation = useNavigation();
  const { menuItems, categories: menuCategories, getAvailableMenuItems, updateMenuItemStock } = useMenuContext();
  const { businessProfile } = useBusinessContext();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  
  // Main States
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [heldOrders, setHeldOrders] = useState([]);
  const [dailySales, setDailySales] = useState({ total: 0, count: 0, topItems: [] });
  
  // Currency and Tax States
  const [currency, setCurrency] = useState(AFRICAN_CURRENCIES.DEFAULT);
  const [taxRate, setTaxRate] = useState(0.08);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [splitPayment, setSplitPayment] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState({ cash: 0, mpesa: 0, card: 0 });
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [cashReceived, setCashReceived] = useState('');
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  
  // Calculation States
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [change, setChange] = useState(0);

  // Initialize animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Load initial data
  useEffect(() => {
    loadInitialData();
    loadHeldOrders();
    loadDailySales();
    detectCurrency();
  }, []);

  // Update products when menu items change
  useEffect(() => {
    if (menuItems && menuItems.length > 0) {
      const availableItems = getAvailableMenuItems();
      const formattedItems = availableItems.map(item => ({
        ...item,
        price: parseFloat(item.price) || 0,
        stock: item.quantity_on_hand || 0,
        category: item.category || 'Uncategorized',
        sku: item.sku || `ITEM-${item.id}`,
        image: item.image || item.photo || null,
      }));
      setProducts(formattedItems);
    }
  }, [menuItems]);

  // Update categories dynamically from menu
  useEffect(() => {
    if (menuCategories && menuCategories.length > 0) {
      const dynamicCategories = menuCategories.map((cat, index) => ({
        id: cat.id || index,
        name: cat.name || cat,
        icon: getCategoryIcon(cat.name || cat),
        color: getCategoryColor(cat.name || cat),
      }));
      setCategories(dynamicCategories);
    } else if (products.length > 0) {
      // Generate categories from products if not provided
      const uniqueCategories = [...new Set(products.map(p => p.category))];
      const generatedCategories = uniqueCategories.map((cat, index) => ({
        id: index,
        name: cat,
        icon: getCategoryIcon(cat),
        color: getCategoryColor(cat),
      }));
      setCategories(generatedCategories);
    }
  }, [menuCategories, products]);

  // Calculate totals
  useEffect(() => {
    calculateTotals();
  }, [cart, discountValue, discountType, taxRate]);

  // Calculate change
  useEffect(() => {
    if (paymentMethod === 'cash' && cashReceived) {
      const received = parseFloat(cashReceived) || 0;
      setChange(Math.max(0, received - total));
    }
  }, [cashReceived, total, paymentMethod]);

  const detectCurrency = async () => {
    try {
      // Get country from business profile or use stored preference
      const storedCurrency = await AsyncStorage.getItem('pos_currency');
      if (storedCurrency) {
        const parsed = JSON.parse(storedCurrency);
        setCurrency(parsed);
        setTaxRate(parsed.taxRate);
      } else if (businessProfile?.country) {
        const countryCode = businessProfile.country.toUpperCase();
        const currencyConfig = AFRICAN_CURRENCIES[countryCode] || AFRICAN_CURRENCIES.DEFAULT;
        setCurrency(currencyConfig);
        setTaxRate(currencyConfig.taxRate);
        await AsyncStorage.setItem('pos_currency', JSON.stringify(currencyConfig));
      }
    } catch (error) {
      console.error('Error detecting currency:', error);
    }
  };

  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'coffee': 'cafe',
      'bakery': 'restaurant',
      'food': 'fast-food',
      'beverages': 'beer',
      'drinks': 'beer',
      'desserts': 'ice-cream',
      'snacks': 'pizza',
      'breakfast': 'sunny',
      'lunch': 'restaurant',
      'dinner': 'moon',
      'appetizers': 'leaf',
      'main': 'restaurant',
      'sides': 'nutrition',
    };
    const name = categoryName.toLowerCase();
    return iconMap[name] || 'pricetag';
  };

  const getCategoryColor = (categoryName) => {
    const colorMap = {
      'coffee': '#8B4513',
      'bakery': '#D2691E',
      'food': '#FF6347',
      'beverages': '#4169E1',
      'drinks': '#4169E1',
      'desserts': '#FF69B4',
      'snacks': '#FFA500',
      'breakfast': '#FFD700',
      'lunch': '#32CD32',
      'dinner': '#8B008B',
    };
    const name = categoryName.toLowerCase();
    return colorMap[name] || '#2563eb';
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load customers
      const customersRes = await api.get('/crm/customers/').catch(() => ({ data: { results: [] } }));
      const customersData = customersRes.data.results || customersRes.data || [];
      setCustomers(customersData.length > 0 ? customersData : getDefaultCustomers());

      // Use menu items from context
      const availableItems = getAvailableMenuItems();
      if (availableItems.length > 0) {
        const formattedItems = availableItems.map(item => ({
          ...item,
          price: parseFloat(item.price) || 0,
          stock: item.quantity_on_hand || 0,
          category: item.category || 'Uncategorized',
          sku: item.sku || `ITEM-${item.id}`,
          image: item.image || item.photo || null,
        }));
        setProducts(formattedItems);
      }
      
    } catch (error) {
      console.error('Error loading POS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCustomers = () => [
    { id: 1, name: 'Walk-in Customer', phone: '', email: '', loyalty_points: 0 },
  ];

  const loadHeldOrders = async () => {
    try {
      const stored = await AsyncStorage.getItem('held_orders');
      if (stored) {
        setHeldOrders(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading held orders:', error);
    }
  };

  const loadDailySales = async () => {
    try {
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem(`daily_sales_${today}`);
      if (stored) {
        setDailySales(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading daily sales:', error);
    }
  };

  const syncOfflineTransactions = async () => {
    try {
      const pendingTransactions = await AsyncStorage.getItem('pending_transactions');
      if (pendingTransactions) {
        const transactions = JSON.parse(pendingTransactions);
        for (const transaction of transactions) {
          await api.post('/pos/transactions/', transaction);
        }
        await AsyncStorage.removeItem('pending_transactions');
        Alert.alert('Sync Complete', `${transactions.length} offline transactions synced successfully`);
      }
    } catch (error) {
      console.error('Error syncing offline transactions:', error);
    }
  };

  const addToCart = (product) => {
    // Check stock
    if (product.stock <= 0) {
      Alert.alert('Out of Stock', `${product.name} is currently out of stock`);
      return;
    }

    // Vibrate for feedback
    Vibration.vibrate(10);

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        Alert.alert('Stock Limit', `Only ${product.stock} items available`);
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    Vibration.vibrate(10);
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

  const holdOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Nothing to hold');
      return;
    }
    
    const heldOrder = {
      id: Date.now(),
      cart,
      customer: selectedCustomer,
      discount: discountValue,
      discountType,
      note: customerNote,
      timestamp: new Date().toISOString(),
      total,
    };
    
    const updatedHeldOrders = [...heldOrders, heldOrder];
    setHeldOrders(updatedHeldOrders);
    await AsyncStorage.setItem('held_orders', JSON.stringify(updatedHeldOrders));
    
    Alert.alert('Order Held', 'Order saved for later');
    resetPOS();
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

    if (paymentMethod === 'mpesa' && !mpesaNumber) {
      Alert.alert('M-Pesa Number Required', 'Please enter M-Pesa phone number');
      return;
    }

    setProcessing(true);
    try {
      const transactionData = {
        items: cart.map(item => ({
          product_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        customer_id: selectedCustomer?.id,
        payment_method: splitPayment ? 'split' : paymentMethod,
        split_payments: splitPayment ? splitAmounts : null,
        subtotal,
        discount,
        discount_type: discountType,
        discount_value: discountValue,
        tax,
        tax_rate: taxRate,
        total,
        currency: currency.code,
        cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
        change: paymentMethod === 'cash' ? change : null,
        mpesa_number: paymentMethod === 'mpesa' ? mpesaNumber : null,
        note: customerNote,
        timestamp: new Date().toISOString(),
      };

      try {
        const response = await api.post('/pos/transactions/', transactionData);
        
        // Update stock in backend
        for (const item of cart) {
          if (updateMenuItemStock) {
            await updateMenuItemStock(item.id, item.stock - item.quantity);
          }
        }
        
        // Generate receipt
        const receipt = generateReceipt(response.data);
        setCurrentReceipt(receipt);
        setShowReceiptModal(true);
      } catch (error) {
        // Save offline if API fails
        const pendingTransactions = await AsyncStorage.getItem('pending_transactions');
        const pending = pendingTransactions ? JSON.parse(pendingTransactions) : [];
        pending.push(transactionData);
        await AsyncStorage.setItem('pending_transactions', JSON.stringify(pending));
        
        // Update stock locally
        setProducts(products.map(p => {
          const cartItem = cart.find(c => c.id === p.id);
          if (cartItem) {
            return { ...p, stock: p.stock - cartItem.quantity };
          }
          return p;
        }));
        
        Alert.alert('Offline Mode', 'Transaction saved. Will sync when online.');
      }

      // Update daily sales
      await updateDailySales(transactionData);

      // Reset POS
      resetPOS();
      
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', 'Unable to process payment. Please try again.');
    } finally {
      setProcessing(false);
      setShowPaymentModal(false);
    }
  };

  const updateDailySales = async (transaction) => {
    const today = new Date().toDateString();
    const updatedSales = {
      total: dailySales.total + transaction.total,
      count: dailySales.count + 1,
      topItems: updateTopItems(dailySales.topItems, transaction.items),
    };
    setDailySales(updatedSales);
    await AsyncStorage.setItem(`daily_sales_${today}`, JSON.stringify(updatedSales));
  };

  const updateTopItems = (currentTop, newItems) => {
    const itemMap = new Map();
    
    // Add current top items
    currentTop.forEach(item => {
      itemMap.set(item.name, (itemMap.get(item.name) || 0) + item.quantity);
    });
    
    // Add new items
    newItems.forEach(item => {
      itemMap.set(item.name, (itemMap.get(item.name) || 0) + item.quantity);
    });
    
    // Convert to array and sort
    return Array.from(itemMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  const generateReceipt = (transaction) => {
    const business = businessProfile || { name: 'Restaurant', phone: '', address: '' };
    return {
      business,
      transaction,
      date: new Date().toLocaleString(),
      receiptNumber: `RCP-${Date.now()}`,
    };
  };

  const sendSMSReceipt = async (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert('Phone Required', 'Please enter customer phone number');
      return;
    }
    
    try {
      await api.post('/communications/sms/receipt/', {
        phone: phoneNumber,
        receipt: currentReceipt,
      });
      Alert.alert('Receipt Sent', `Receipt sent to ${phoneNumber}`);
    } catch (error) {
      Alert.alert('SMS Failed', 'Could not send SMS receipt');
    }
  };

  const resetPOS = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscountValue(0);
    setCashReceived('');
    setMpesaNumber('');
    setCustomerNote('');
    setPaymentMethod('cash');
    setSplitPayment(false);
    setSplitAmounts({ cash: 0, mpesa: 0, card: 0 });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderProduct = ({ item }) => {
    const isLowStock = item.stock < 5 && item.stock > 0;
    const isOutOfStock = item.stock <= 0;
    
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity 
          style={[
            styles.productCard,
            isOutOfStock && styles.outOfStock,
            isLowStock && styles.lowStockCard
          ]} 
          onPress={() => addToCart(item)}
          disabled={isOutOfStock}
        >
          <View style={styles.stockIndicator}>
            <View style={[
              styles.stockDot,
              item.stock > 5 && styles.inStock,
              isLowStock && styles.lowStock,
              isOutOfStock && styles.noStock,
            ]} />
          </View>
          
          <View style={styles.productImageContainer}>
            {item.image ? (
              <Image 
                source={{ uri: item.image }} 
                style={styles.productPhoto}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Icon name={getCategoryIcon(item.category)} size={32} color="#999" />
              </View>
            )}
            {item.is_special && (
              <View style={styles.specialBadge}>
                <Text style={styles.specialText}>SPECIAL</Text>
              </View>
            )}
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.productCategory}>{item.category}</Text>
            <View style={styles.productFooter}>
              <Text style={styles.productPrice}>
                {currency.symbol}{(item.price * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}
              </Text>
              {isLowStock && (
                <Text style={styles.stockWarning}>Only {item.stock} left!</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCartItem = ({ item }) => (
    <Animated.View style={[styles.cartItem, { transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.cartItemLeft}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cartItemImage} />
        ) : (
          <View style={styles.cartItemImagePlaceholder}>
            <Icon name={getCategoryIcon(item.category)} size={20} color="#999" />
          </View>
        )}
        <View style={styles.cartItemDetails}>
          <Text style={styles.cartItemName}>{item.name}</Text>
          <Text style={styles.cartItemPrice}>
            {currency.symbol}{(item.price * (currency.code === 'USD' ? 1 : 100)).toFixed(0)} each
          </Text>
        </View>
      </View>
      
      <View style={styles.cartItemRight}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
          >
            <Icon name="remove" size={18} color="#666" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
          >
            <Icon name="add" size={18} color="#666" />
          </TouchableOpacity>
        </View>
        <Text style={styles.cartItemTotal}>
          {currency.symbol}{((item.price * item.quantity) * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}
        </Text>
      </View>
    </Animated.View>
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
            {/* Payment Summary */}
            <View style={styles.paymentSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>
                  {currency.symbol}{(subtotal * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}
                </Text>
              </View>
              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, styles.discountText]}>
                    -{currency.symbol}{(discount * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax ({(taxRate * 100).toFixed(0)}%)</Text>
                <Text style={styles.summaryValue}>
                  {currency.symbol}{(tax * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {currency.symbol}{(total * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}
                </Text>
              </View>
            </View>

            {/* Payment Methods */}
            <View style={styles.paymentMethods}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.methodsGrid}>
                <TouchableOpacity
                  style={[styles.methodButton, paymentMethod === 'cash' && styles.methodActive]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <Icon name="cash" size={28} color={paymentMethod === 'cash' ? 'white' : '#666'} />
                  <Text style={[styles.methodText, paymentMethod === 'cash' && styles.methodTextActive]}>
                    Cash
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.methodButton, paymentMethod === 'mpesa' && styles.methodActive]}
                  onPress={() => setPaymentMethod('mpesa')}
                >
                  <View style={[styles.mpesaIcon, paymentMethod === 'mpesa' && styles.mpesaIconActive]}>
                    <Text style={[styles.mpesaText, paymentMethod === 'mpesa' && styles.mpesaTextActive]}>M</Text>
                  </View>
                  <Text style={[styles.methodText, paymentMethod === 'mpesa' && styles.methodTextActive]}>
                    M-Pesa
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.methodButton, paymentMethod === 'card' && styles.methodActive]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <Icon name="card" size={28} color={paymentMethod === 'card' ? 'white' : '#666'} />
                  <Text style={[styles.methodText, paymentMethod === 'card' && styles.methodTextActive]}>
                    Card
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Payment Input Fields */}
            {paymentMethod === 'cash' && (
              <View style={styles.cashSection}>
                <Text style={styles.sectionTitle}>Cash Received</Text>
                <TextInput
                  style={styles.cashInput}
                  value={cashReceived}
                  onChangeText={setCashReceived}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
                <View style={styles.quickCashButtons}>
                  {[1000, 2000, 5000, 10000].map(amount => (
                    <TouchableOpacity
                      key={amount}
                      style={styles.quickCashButton}
                      onPress={() => setCashReceived(amount.toString())}
                    >
                      <Text style={styles.quickCashText}>
                        {currency.symbol}{amount}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {change > 0 && (
                  <View style={styles.changeContainer}>
                    <Text style={styles.changeLabel}>Change</Text>
                    <Text style={styles.changeAmount}>
                      {currency.symbol}{(change * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {paymentMethod === 'mpesa' && (
              <View style={styles.mpesaSection}>
                <Text style={styles.sectionTitle}>M-Pesa Details</Text>
                <TextInput
                  style={styles.mpesaInput}
                  value={mpesaNumber}
                  onChangeText={setMpesaNumber}
                  keyboardType="phone-pad"
                  placeholder="Phone Number (07XXXXXXXX)"
                />
                <Text style={styles.mpesaInfo}>
                  Customer will receive a prompt to complete payment
                </Text>
              </View>
            )}

            {/* Process Button */}
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
                    Complete Sale - {currency.symbol}{(total * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}
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
          <Text style={styles.loadingText}>Loading POS Terminal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>POS Terminal</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowDailyReport(true)}
          >
            <Icon name="stats-chart" size={24} color="#333" />
            {dailySales.count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{dailySales.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContainer}>
        {/* Left Panel - Products */}
        <View style={styles.leftPanel}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Categories */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.categoriesContainer}
          >
            <TouchableOpacity
              style={[styles.categoryButton, selectedCategory === 'all' && styles.categoryActive]}
              onPress={() => setSelectedCategory('all')}
            >
              <Icon name="apps" size={20} color={selectedCategory === 'all' ? 'white' : '#666'} />
              <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>
                All Items
              </Text>
            </TouchableOpacity>
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton, 
                  selectedCategory === category.name && styles.categoryActive,
                  { borderColor: selectedCategory === category.name ? category.color : '#e1e8ed' }
                ]}
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

          {/* Products Grid */}
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={item => item.id.toString()}
            numColumns={3}
            contentContainerStyle={styles.productGrid}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyProducts}>
                <Icon name="cube-outline" size={48} color="#ccc" />
                <Text style={styles.emptyProductsText}>No products found</Text>
                {searchQuery.length > 0 && (
                  <Text style={styles.emptyProductsSubtext}>Try a different search term</Text>
                )}
              </View>
            }
          />
        </View>

        {/* Right Panel - Cart */}
        <View style={styles.rightPanel}>
          {/* Customer Section */}
          <TouchableOpacity
            style={styles.customerSelector}
            onPress={() => setShowCustomerModal(true)}
          >
            <Icon name="person-circle" size={24} color="#2563eb" />
            <Text style={styles.customerText}>
              {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
            </Text>
            <Icon name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {/* Cart Header */}
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Cart ({cart.length})</Text>
            {cart.length > 0 && (
              <TouchableOpacity onPress={() => setCart([])}>
                <Text style={styles.clearCartText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cart Items */}
          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Icon name="cart-outline" size={64} color="#e0e0e0" />
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
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

          {/* Cart Footer */}
          <View style={styles.cartFooter}>
            {/* Discount Button */}
            <TouchableOpacity
              style={styles.discountButton}
              onPress={() => setShowDiscountModal(true)}
            >
              <Icon name="pricetag-outline" size={20} color="#f59e0b" />
              <Text style={styles.discountButtonText}>
                {discount > 0 ? `Discount: ${currency.symbol}${(discount * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}` : 'Add Discount'}
              </Text>
            </TouchableOpacity>

            {/* Totals */}
            <View style={styles.totalsContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalText}>Subtotal</Text>
                <Text style={styles.totalAmount}>
                  {currency.symbol}{(subtotal * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}
                </Text>
              </View>
              {discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalText}>Discount</Text>
                  <Text style={[styles.totalAmount, styles.discountAmount]}>
                    -{currency.symbol}{(discount * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}
                  </Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalText}>Tax ({(taxRate * 100).toFixed(0)}%)</Text>
                <Text style={styles.totalAmount}>
                  {currency.symbol}{(tax * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}
                </Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalText}>Total</Text>
                <Text style={styles.grandTotalAmount}>
                  {currency.symbol}{(total * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.holdButton]}
                onPress={holdOrder}
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
                <Text style={styles.payButtonText}>
                  Pay {currency.symbol}{(total * (currency.code === 'USD' ? 1 : 100)).toFixed(0)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Modals */}
      {renderPaymentModal()}
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
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 20,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 2,
    backgroundColor: '#f8f9fa',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: 'white',
    borderLeftWidth: 1,
    borderLeftColor: '#e1e8ed',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
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
    marginBottom: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 25,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e1e8ed',
  },
  categoryActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 12,
    padding: 12,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  outOfStock: {
    opacity: 0.5,
  },
  lowStockCard: {
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  stockIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
  },
  inStock: {
    backgroundColor: '#22c55e',
  },
  lowStock: {
    backgroundColor: '#fbbf24',
  },
  noStock: {
    backgroundColor: '#ef4444',
  },
  productImageContainer: {
    width: 80,
    height: 80,
    marginBottom: 10,
    position: 'relative',
    alignSelf: 'center',
  },
  productPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  specialText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  stockWarning: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600',
  },
  emptyProducts: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyProductsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 10,
  },
  emptyProductsSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
  customerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f0f9ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  customerText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  cartTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  clearCartText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 15,
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
    borderBottomColor: '#f3f4f6',
  },
  cartItemLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  cartItemImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  cartItemImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  discountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    marginBottom: 12,
  },
  discountButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  totalsContainer: {
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalText: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  discountAmount: {
    color: '#22c55e',
  },
  grandTotalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  grandTotalText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  grandTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  holdButton: {
    backgroundColor: '#f3f4f6',
  },
  holdButtonText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  payButton: {
    backgroundColor: '#22c55e',
  },
  payButtonText: {
    marginLeft: 6,
    fontSize: 15,
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
    borderRadius: 16,
    padding: 24,
    maxHeight: '85%',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  paymentSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  discountText: {
    color: '#22c55e',
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  paymentMethods: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  methodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 5,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e1e8ed',
    backgroundColor: 'white',
  },
  methodActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  methodText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  methodTextActive: {
    color: 'white',
  },
  mpesaIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00875a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mpesaIconActive: {
    backgroundColor: 'white',
  },
  mpesaText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  mpesaTextActive: {
    color: '#00875a',
  },
  cashSection: {
    marginBottom: 20,
  },
  cashInput: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 15,
  },
  quickCashButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  quickCashButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickCashText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
  },
  changeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    padding: 15,
    borderRadius: 10,
  },
  changeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
  },
  changeAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#166534',
  },
  mpesaSection: {
    marginBottom: 20,
  },
  mpesaInput: {
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    marginBottom: 10,
  },
  mpesaInfo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  processButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  processingButton: {
    opacity: 0.7,
  },
  processButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
});