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
import { getCurrencyForCountry } from '../../utils/currencyUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Tax rates by country (can be customized)
const TAX_RATES = {
  'KE': 0.16,  // Kenya VAT
  'UG': 0.18,  // Uganda VAT
  'TZ': 0.18,  // Tanzania VAT
  'RW': 0.18,  // Rwanda VAT
  'NG': 0.075, // Nigeria VAT
  'GH': 0.125, // Ghana VAT
  'ZA': 0.15,  // South Africa VAT
  'SS': 0.18,  // South Sudan VAT
  'DEFAULT': 0.10,
};

export default function ProgressivePOSScreen() {
  const navigation = useNavigation();
  const { menuItems, categories: menuCategories, getAvailableMenuItems, updateMenuItemStock } = useMenuContext();
  const { businessProfile, businessData } = useBusinessContext();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Screen states - 'products', 'cart', 'payment'
  const [currentScreen, setCurrentScreen] = useState('products');
  
  // Main States
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Receipt Modal States
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [receiptSending, setReceiptSending] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Currency and Tax States
  const [currency, setCurrency] = useState(getCurrencyForCountry('SS'));
  const [taxRate, setTaxRate] = useState(TAX_RATES.SS);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [cashReceived, setCashReceived] = useState('');
  // QR payment doesn't need phone number state
  const [mtnNumber, setMtnNumber] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  
  // Dott Payment states
  const [dottCustomerId, setDottCustomerId] = useState('');
  const [showDottScanner, setShowDottScanner] = useState(false);
  const [dottCustomerInfo, setDottCustomerInfo] = useState(null);
  const [scannerType, setScannerType] = useState('qr'); // 'qr' or 'manual'
  
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
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animate screen transitions
  const animateScreenChange = (newScreen) => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setCurrentScreen(newScreen);
  };

  // Load initial data
  useEffect(() => {
    loadInitialData();
    detectCurrency();
  }, []);

  // Update products when menu items change
  useEffect(() => {
    console.log('🍔 POS: Menu items received:', menuItems?.length || 0);
    if (menuItems && menuItems.length > 0) {
      const availableItems = getAvailableMenuItems();
      console.log('🍔 POS: Available items:', availableItems?.length || 0);
      const formattedItems = availableItems.map(item => ({
        ...item,
        price: parseFloat(item.price) || 0,
        stock: item.quantity_on_hand || item.stock || 50,
        category: item.category || 'Uncategorized',
        sku: item.sku || `ITEM-${item.id}`,
        image: item.image || item.photo || null,
      }));
      setProducts(formattedItems);
    } else {
      // Load sample data if no menu items
      console.log('🍔 POS: No menu items, loading sample data');
      loadInitialData();
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
      // Always check for current country
      const country = businessProfile?.country || 
                     businessData?.businessCountry || 
                     'SS'; // Default to South Sudan
      
      console.log('🌍 POS Currency - Detected country:', country);
      const countryCode = country.toUpperCase();
      const currencyConfig = getCurrencyForCountry(countryCode);
      const countryTaxRate = TAX_RATES[countryCode] || TAX_RATES.DEFAULT;
      
      console.log('💰 POS Currency - Using:', currencyConfig);
      console.log('📊 Tax Rate:', countryTaxRate);
      
      setCurrency(currencyConfig);
      setTaxRate(countryTaxRate);
      await AsyncStorage.setItem('pos_currency', JSON.stringify({ ...currencyConfig, taxRate: countryTaxRate }));
    } catch (error) {
      console.error('Error detecting currency:', error);
      // Fallback to SSP for South Sudan
      setCurrency(getCurrencyForCountry('SS'));
      setTaxRate(TAX_RATES.SS);
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
      console.log('🍔 POS: Loading initial data...');
      const availableItems = getAvailableMenuItems();
      console.log('🍔 POS: Available items from context:', availableItems?.length || 0);
      
      // If no menu items from API, use sample data for demo
      if (!availableItems || availableItems.length === 0) {
        console.log('🍔 POS: Using sample products');
        const sampleProducts = [
          { id: 1, name: 'Cappuccino', price: 500, stock: 50, category: 'Coffee', sku: 'COF001' },
          { id: 2, name: 'Espresso', price: 400, stock: 50, category: 'Coffee', sku: 'COF002' },
          { id: 3, name: 'Latte', price: 550, stock: 50, category: 'Coffee', sku: 'COF003' },
          { id: 4, name: 'Americano', price: 450, stock: 50, category: 'Coffee', sku: 'COF004' },
          { id: 5, name: 'Chicken Burger', price: 2500, stock: 25, category: 'Food', sku: 'FOD001' },
          { id: 6, name: 'Beef Burger', price: 3000, stock: 20, category: 'Food', sku: 'FOD002' },
          { id: 7, name: 'Vegetable Pizza', price: 3500, stock: 15, category: 'Food', sku: 'FOD003' },
          { id: 8, name: 'Chicken Wings', price: 2000, stock: 30, category: 'Food', sku: 'FOD004' },
          { id: 9, name: 'French Fries', price: 800, stock: 40, category: 'Snacks', sku: 'SNK001' },
          { id: 10, name: 'Samosa', price: 300, stock: 60, category: 'Snacks', sku: 'SNK002' },
          { id: 11, name: 'Spring Rolls', price: 500, stock: 35, category: 'Snacks', sku: 'SNK003' },
          { id: 12, name: 'Coca Cola', price: 300, stock: 100, category: 'Drinks', sku: 'DRK001' },
          { id: 13, name: 'Fanta', price: 300, stock: 100, category: 'Drinks', sku: 'DRK002' },
          { id: 14, name: 'Water', price: 200, stock: 200, category: 'Drinks', sku: 'DRK003' },
          { id: 15, name: 'Fresh Juice', price: 600, stock: 30, category: 'Drinks', sku: 'DRK004' },
        ];
        setProducts(sampleProducts);
      } else {
        const formattedItems = availableItems.map(item => ({
          ...item,
          price: parseFloat(item.price) || 0,
          stock: item.quantity_on_hand || item.stock || 50, // Default stock if not provided
          category: item.category || 'Uncategorized',
          sku: item.sku || `ITEM-${item.id}`,
          image: item.image || item.photo || null,
        }));
        setProducts(formattedItems);
      }
    } catch (error) {
      console.error('Error loading POS data:', error);
      // Fallback to sample data on error
      const sampleProducts = [
        { id: 1, name: 'Cappuccino', price: 500, stock: 50, category: 'Coffee', sku: 'COF001' },
        { id: 2, name: 'Espresso', price: 400, stock: 50, category: 'Coffee', sku: 'COF002' },
        { id: 3, name: 'Chicken Burger', price: 2500, stock: 25, category: 'Food', sku: 'FOD001' },
        { id: 4, name: 'French Fries', price: 800, stock: 40, category: 'Snacks', sku: 'SNK001' },
        { id: 5, name: 'Coca Cola', price: 300, stock: 100, category: 'Drinks', sku: 'DRK001' },
      ];
      setProducts(sampleProducts);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    console.log('🛒 Adding to cart:', product.name, 'Stock:', product.stock);
    
    if (!product.stock || product.stock <= 0) {
      Alert.alert('Out of Stock', `${product.name} is currently out of stock`);
      return;
    }

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
      console.log('✅ Added to cart successfully');
      
      // Show success animation
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
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

  // Dott Payment Functions
  const handleDottScanQR = () => {
    // For now, simulate QR scan with modal for manual entry
    // In production, this would open camera for QR scanning
    setScannerType('qr');
    Alert.alert(
      'Scan Customer QR',
      'Point camera at customer\'s BLUE QR code or enter their ID manually',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Enter ID', onPress: () => setScannerType('manual') }
      ]
    );
  };

  const handleDottManualEntry = async () => {
    if (!dottCustomerId) {
      Alert.alert('Error', 'Please enter customer ID or phone number');
      return;
    }

    try {
      // Simulate customer lookup - in production this would call API
      // Format: BIZ12345678 for business or USER12345678 for consumer
      const mockCustomer = {
        id: dottCustomerId,
        name: dottCustomerId.startsWith('BIZ') ? 'Business Customer' : 'John Doe',
        phone: dottCustomerId.startsWith('211') ? dottCustomerId : '211123456789',
        type: dottCustomerId.startsWith('BIZ') ? 'business' : 'consumer',
        payment_methods: ['mobile_money', 'card'],
        default_method: 'mobile_money'
      };

      setDottCustomerInfo(mockCustomer);
      Alert.alert(
        'Customer Found',
        `${mockCustomer.name}\n${mockCustomer.phone}\nPayment will be processed via ${mockCustomer.default_method}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Customer not found. Please check the ID.');
    }
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

    if (paymentMethod === 'dott_qr' && !dottCustomerInfo) {
      Alert.alert('Customer Required', 'Please scan customer QR or enter their ID first');
      return;
    }

    if (paymentMethod === 'mtn' && !mtnNumber) {
      Alert.alert('MTN MoMo Number Required', 'Please enter MTN phone number');
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
        payment_method: paymentMethod,
        subtotal,
        discount,
        tax,
        total,
        currency: currency.code,
        cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
        change: paymentMethod === 'cash' ? change : null,
        qr_payment: paymentMethod === 'dott_qr' ? true : null,
        dott_customer: paymentMethod === 'dott_qr' ? dottCustomerInfo : null,
        mtn_number: paymentMethod === 'mtn' ? mtnNumber : null,
        note: customerNote,
        // Double-entry accounting data
        accounting_entries: generateAccountingEntries({
          total,
          tax,
          discount,
          paymentMethod,
          items: cart,
        }),
      };

      const response = await api.post('/pos/transactions/', transactionData);
      
      // Store transaction for receipt
      const transaction = {
        ...transactionData,
        id: response.data.id || Date.now(),
        date: new Date().toISOString(),
        receipt_number: response.data.receipt_number || `RCP-${Date.now()}`,
      };
      setLastTransaction(transaction);
      
      // Update stock levels
      cart.forEach(item => {
        updateMenuItemStock(item.id, -item.quantity);
      });
      
      // Show receipt modal instead of alert
      setShowReceiptModal(true);
      
    } catch (error) {
      console.error('Payment error:', error);
      // Save offline for sync later
      await saveOfflineTransaction(transactionData);
      Alert.alert('Payment Saved', 'Transaction saved offline. Will sync when online.');
      resetPOS();
      animateScreenChange('products');
    } finally {
      setProcessing(false);
    }
  };

  const resetPOS = () => {
    setCart([]);
    setDiscountValue(0);
    setCashReceived('');
    // No QR reset needed
    setMtnNumber('');
    setCustomerNote('');
    setPaymentMethod('cash');
    setCustomerEmail('');
    setCustomerPhone('');
  };

  // Generate double-entry accounting entries
  const generateAccountingEntries = ({ total, tax, discount, paymentMethod, items }) => {
    const entries = [];
    const timestamp = new Date().toISOString();
    
    // Debit: Cash/Bank account (based on payment method)
    const debitAccount = paymentMethod === 'cash' ? 'Cash' : 
                         paymentMethod === 'card' ? 'Bank' : 
                         paymentMethod === 'dott_qr' ? 'Dott QR Payment' : 
                         paymentMethod === 'mtn' ? 'MTN MoMo Merchant' : 'Cash';
    
    entries.push({
      date: timestamp,
      account: debitAccount,
      debit: total,
      credit: 0,
      description: `Sales receipt - ${paymentMethod}`,
    });
    
    // Credit: Sales Revenue
    const salesAmount = total - tax;
    entries.push({
      date: timestamp,
      account: 'Sales Revenue',
      debit: 0,
      credit: salesAmount,
      description: 'Sales revenue',
    });
    
    // Credit: Sales Tax Payable
    if (tax > 0) {
      entries.push({
        date: timestamp,
        account: 'Sales Tax Payable',
        debit: 0,
        credit: tax,
        description: 'Sales tax collected',
      });
    }
    
    // Debit: Discount Expense
    if (discount > 0) {
      entries.push({
        date: timestamp,
        account: 'Sales Discount',
        debit: discount,
        credit: 0,
        description: 'Discount given',
      });
    }
    
    // Credit: Inventory & Debit: Cost of Goods Sold (COGS)
    items.forEach(item => {
      const costPrice = item.cost || item.price * 0.6; // Assume 40% margin if cost not available
      const totalCost = costPrice * item.quantity;
      
      entries.push({
        date: timestamp,
        account: 'Cost of Goods Sold',
        debit: totalCost,
        credit: 0,
        description: `COGS - ${item.name}`,
      });
      
      entries.push({
        date: timestamp,
        account: 'Inventory',
        debit: 0,
        credit: totalCost,
        description: `Inventory reduction - ${item.name}`,
      });
    });
    
    return entries;
  };

  // Save transaction offline for later sync
  const saveOfflineTransaction = async (transaction) => {
    try {
      const offlineTransactions = await AsyncStorage.getItem('offline_transactions');
      const transactions = offlineTransactions ? JSON.parse(offlineTransactions) : [];
      transactions.push({
        ...transaction,
        timestamp: Date.now(),
        synced: false,
      });
      await AsyncStorage.setItem('offline_transactions', JSON.stringify(transactions));
    } catch (error) {
      console.error('Error saving offline transaction:', error);
    }
  };

  // Send receipt via different methods
  const sendReceipt = async (method) => {
    if (!lastTransaction) return;
    
    setReceiptSending(true);
    try {
      const receiptData = {
        transaction_id: lastTransaction.id,
        receipt_number: lastTransaction.receipt_number,
        items: lastTransaction.items,
        total: lastTransaction.total,
        tax: lastTransaction.tax,
        discount: lastTransaction.discount,
        payment_method: lastTransaction.payment_method,
        business_name: businessProfile?.businessName || 'Business',
        date: lastTransaction.date,
      };
      
      switch (method) {
        case 'email':
          if (!customerEmail) {
            Alert.alert('Email Required', 'Please enter customer email address');
            return;
          }
          await api.post('/pos/receipts/email/', {
            ...receiptData,
            email: customerEmail,
          });
          Alert.alert('Success', 'Receipt sent to email');
          break;
          
        case 'sms':
          if (!customerPhone) {
            Alert.alert('Phone Required', 'Please enter customer phone number');
            return;
          }
          await api.post('/pos/receipts/sms/', {
            ...receiptData,
            phone: customerPhone,
          });
          Alert.alert('Success', 'Receipt sent via SMS');
          break;
          
        case 'chat':
          await api.post('/pos/receipts/chat/', receiptData);
          Alert.alert('Success', 'Receipt sent to customer chat');
          break;
          
        case 'print':
          // Generate PDF and open print dialog
          const pdfUrl = await api.post('/pos/receipts/pdf/', receiptData);
          // Open PDF for printing (you might need react-native-print library)
          Alert.alert('Print', 'Receipt PDF generated. Opening print dialog...');
          break;
      }
      
      // Close modal and reset after sending
      setTimeout(() => {
        setShowReceiptModal(false);
        resetPOS();
        animateScreenChange('products');
      }, 1000);
      
    } catch (error) {
      console.error('Error sending receipt:', error);
      Alert.alert('Error', 'Failed to send receipt. Please try again.');
    } finally {
      setReceiptSending(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Product Screen
  const renderProductScreen = () => {
    console.log('🍔 POS: Rendering products screen, products count:', products.length);
    console.log('🍔 POS: First product:', products[0]);
    
    return (
    <View style={styles.screenContainer}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Icon name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu items..."
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
          style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryActive]}
          onPress={() => setSelectedCategory('all')}
        >
          <Icon name="apps" size={18} color={selectedCategory === 'all' ? 'white' : '#666'} />
          <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryChip, selectedCategory === category.name && styles.categoryActive]}
            onPress={() => setSelectedCategory(category.name)}
          >
            <Icon
              name={category.icon}
              size={18}
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
        numColumns={2}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.productGrid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isLowStock = item.stock < 5 && item.stock > 0;
          const isOutOfStock = item.stock <= 0;
          const cartItem = cart.find(c => c.id === item.id);
          const inCart = cartItem ? cartItem.quantity : 0;
          
          return (
            <Animated.View style={[styles.productCardWrapper, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
              <TouchableOpacity 
                style={[
                  styles.productCard,
                  isOutOfStock && styles.outOfStock,
                  inCart > 0 && styles.productInCart
                ]} 
                onPress={() => {
                  console.log('🎯 Product tapped:', item.name);
                  addToCart(item);
                }}
                disabled={isOutOfStock}
              >
                {inCart > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{inCart}</Text>
                  </View>
                )}
                
                <View style={styles.stockIndicator}>
                  <View style={[
                    styles.stockDot,
                    item.stock > 5 && styles.inStock,
                    isLowStock && styles.lowStock,
                    isOutOfStock && styles.noStock,
                  ]} />
                </View>
                
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.productImage} />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <Icon name={getCategoryIcon(item.category)} size={40} color="#ccc" />
                  </View>
                )}
                
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.productCategory}>{item.category}</Text>
                  <Text style={styles.productPrice}>
                    {currency.symbol}{item.price.toFixed(0)}
                  </Text>
                  {isLowStock && (
                    <Text style={styles.stockWarning}>Only {item.stock} left</Text>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />
    </View>
  );
  };

  // Cart Screen
  const renderCartScreen = () => (
    <Animated.View style={[styles.screenContainer, { transform: [{ translateX: slideAnim }] }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {cart.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="cart-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <TouchableOpacity 
              style={styles.continueShoppingButton}
              onPress={() => animateScreenChange('products')}
            >
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {cart.map(item => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.cartItemLeft}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.cartItemImage} />
                  ) : (
                    <View style={styles.cartItemImagePlaceholder}>
                      <Icon name={getCategoryIcon(item.category)} size={24} color="#999" />
                    </View>
                  )}
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>
                      {currency.symbol}{item.price.toFixed(0)} each
                    </Text>
                  </View>
                </View>
                
                <View style={styles.cartItemRight}>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Icon name="remove" size={20} color="#666" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Icon name="add" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cartItemTotal}>
                    {currency.symbol}{(item.price * item.quantity).toFixed(0)}
                  </Text>
                </View>
              </View>
            ))}

            {/* Discount Section */}
            <View style={styles.discountSection}>
              <Text style={styles.sectionTitle}>Discount</Text>
              <View style={styles.discountRow}>
                <TouchableOpacity
                  style={[styles.discountTypeButton, discountType === 'percentage' && styles.discountTypeActive]}
                  onPress={() => setDiscountType('percentage')}
                >
                  <Text style={[styles.discountTypeText, discountType === 'percentage' && styles.discountTypeTextActive]}>%</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.discountInput}
                  value={discountValue.toString()}
                  onChangeText={(text) => setDiscountValue(parseFloat(text) || 0)}
                  keyboardType="decimal-pad"
                  placeholder={discountType === 'percentage' ? '0%' : '0'}
                />
                <TouchableOpacity
                  style={[styles.discountTypeButton, discountType === 'fixed' && styles.discountTypeActive]}
                  onPress={() => setDiscountType('fixed')}
                >
                  <Text style={[styles.discountTypeText, discountType === 'fixed' && styles.discountTypeTextActive]}>{currency.symbol}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Totals */}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{currency.symbol}{subtotal.toFixed(0)}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={[styles.totalValue, styles.discountValue]}>
                    -{currency.symbol}{discount.toFixed(0)}
                  </Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax ({(taxRate * 100).toFixed(0)}%)</Text>
                <Text style={styles.totalValue}>{currency.symbol}{tax.toFixed(0)}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{currency.symbol}{total.toFixed(0)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Animated.View>
  );

  // Payment Screen
  const renderPaymentScreen = () => (
    <Animated.View style={[styles.screenContainer, { transform: [{ translateX: slideAnim }] }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items</Text>
            <Text style={styles.summaryValue}>{cart.reduce((sum, item) => sum + item.quantity, 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.summaryTotal}>{currency.symbol}{total.toFixed(0)}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethods}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.methodsGrid}>
            <TouchableOpacity
              style={[styles.methodCard, paymentMethod === 'cash' && styles.methodActive]}
              onPress={() => setPaymentMethod('cash')}
            >
              <Icon name="cash" size={32} color={paymentMethod === 'cash' ? 'white' : '#666'} />
              <Text style={[styles.methodText, paymentMethod === 'cash' && styles.methodTextActive]}>
                Cash
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.methodCard, paymentMethod === 'dott_qr' && styles.methodActive]}
              onPress={() => {
                setPaymentMethod('dott_qr');
                // Reset Dott states when selecting this payment method
                setDottCustomerId('');
                setDottCustomerInfo(null);
              }}
            >
              <Image 
                source={require('../../assets/icon.png')} 
                style={[styles.dottQRLogo, paymentMethod === 'dott_qr' && styles.dottQRLogoActive]} 
              />
              <Text style={[styles.methodText, paymentMethod === 'dott_qr' && styles.methodTextActive]}>
                Dott
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.methodCard, paymentMethod === 'mtn' && styles.methodActive]}
              onPress={() => setPaymentMethod('mtn')}
            >
              <View style={[styles.mtnIcon, paymentMethod === 'mtn' && styles.mtnIconActive]}>
                <Text style={[styles.mtnText, paymentMethod === 'mtn' && styles.mtnTextActive]}>MTN</Text>
              </View>
              <Text style={[styles.methodText, paymentMethod === 'mtn' && styles.methodTextActive]}>
                MoMo
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.methodCard, paymentMethod === 'card' && styles.methodActive]}
              onPress={() => setPaymentMethod('card')}
            >
              <Icon name="card" size={32} color={paymentMethod === 'card' ? 'white' : '#666'} />
              <Text style={[styles.methodText, paymentMethod === 'card' && styles.methodTextActive]}>
                Card
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Input Fields */}
        {paymentMethod === 'cash' && (
          <View style={styles.cashSection}>
            <Text style={styles.sectionTitle}>Cash Payment</Text>
            <TextInput
              style={styles.cashInput}
              value={cashReceived}
              onChangeText={setCashReceived}
              keyboardType="decimal-pad"
              placeholder="Enter amount received"
            />
            <View style={styles.quickCashButtons}>
              {[1000, 2000, 5000, 10000].map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickCashButton}
                  onPress={() => setCashReceived(amount.toString())}
                >
                  <Text style={styles.quickCashText}>{currency.symbol}{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {change > 0 && (
              <View style={styles.changeContainer}>
                <Text style={styles.changeLabel}>Change</Text>
                <Text style={styles.changeAmount}>{currency.symbol}{change.toFixed(0)}</Text>
              </View>
            )}
          </View>
        )}

        {paymentMethod === 'dott_qr' && (
          <View style={styles.dottQRSection}>
            <Text style={styles.sectionTitle}>Dott Payment</Text>
            
            {!dottCustomerInfo ? (
              <>
                <View style={styles.dottActionButtons}>
                  <TouchableOpacity 
                    style={styles.dottScanButton}
                    onPress={handleDottScanQR}
                  >
                    <Icon name="scan-outline" size={24} color="white" />
                    <Text style={styles.dottScanButtonText}>Scan QR</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.dottOrText}>OR</Text>
                  
                  <View style={styles.dottManualEntry}>
                    <TextInput
                      style={styles.dottIdInput}
                      placeholder="Enter Customer ID or Phone"
                      value={dottCustomerId}
                      onChangeText={setDottCustomerId}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity 
                      style={styles.dottLookupButton}
                      onPress={handleDottManualEntry}
                      disabled={!dottCustomerId}
                    >
                      <Icon name="search" size={20} color={dottCustomerId ? '#2563eb' : '#9ca3af'} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={styles.dottQRInfo}>
                  Scan customer's BLUE QR code or enter their Dott ID
                </Text>
              </>
            ) : (
              <View style={styles.dottCustomerCard}>
                <View style={styles.dottCustomerHeader}>
                  <Icon name="person-circle" size={48} color="#2563eb" />
                  <View style={styles.dottCustomerDetails}>
                    <Text style={styles.dottCustomerName}>{dottCustomerInfo.name}</Text>
                    <Text style={styles.dottCustomerPhone}>{dottCustomerInfo.phone}</Text>
                    <Text style={styles.dottCustomerType}>
                      {dottCustomerInfo.type === 'business' ? 'Business' : 'Personal'} • {dottCustomerInfo.default_method}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.dottChangeButton}
                  onPress={() => {
                    setDottCustomerInfo(null);
                    setDottCustomerId('');
                  }}
                >
                  <Text style={styles.dottChangeButtonText}>Change Customer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {paymentMethod === 'mtn' && (
          <View style={styles.mtnSection}>
            <Text style={styles.sectionTitle}>MTN Mobile Money</Text>
            <TextInput
              style={styles.mtnInput}
              value={mtnNumber}
              onChangeText={setMtnNumber}
              keyboardType="phone-pad"
              placeholder="Phone Number (e.g. 0776XXXXXX)"
            />
            <Text style={styles.mtnInfo}>
              Customer will receive a payment prompt on their MTN number
            </Text>
          </View>
        )}

        {/* Complete Payment Button */}
        <TouchableOpacity
          style={[styles.completeButton, processing && styles.processingButton]}
          onPress={processPayment}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Icon name="checkmark-circle" size={24} color="white" />
              <Text style={styles.completeButtonText}>
                Complete Payment
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  // Receipt Modal Component
  const renderReceiptModal = () => (
    <Modal
      visible={showReceiptModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowReceiptModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.receiptModal}>
          {/* Success Icon */}
          <View style={styles.successIcon}>
            <Icon name="checkmark-circle" size={64} color="#22c55e" />
          </View>
          
          <Text style={styles.modalTitle}>Payment Successful!</Text>
          <Text style={styles.receiptNumber}>Receipt #{lastTransaction?.receipt_number}</Text>
          
          {/* Transaction Summary */}
          <View style={styles.receiptSummary}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Total Amount:</Text>
              <Text style={styles.receiptValue}>
                {currency.symbol}{lastTransaction?.total?.toFixed(0)}
              </Text>
            </View>
            {lastTransaction?.payment_method === 'cash' && lastTransaction?.change > 0 && (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Change:</Text>
                <Text style={styles.receiptValue}>
                  {currency.symbol}{lastTransaction?.change?.toFixed(0)}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.receiptQuestion}>Send receipt to customer?</Text>
          
          {/* Email Input */}
          <View style={styles.receiptInputContainer}>
            <Icon name="mail-outline" size={20} color="#666" />
            <TextInput
              style={styles.receiptInput}
              placeholder="Customer email (optional)"
              value={customerEmail}
              onChangeText={setCustomerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          {/* Phone Input */}
          <View style={styles.receiptInputContainer}>
            <Icon name="call-outline" size={20} color="#666" />
            <TextInput
              style={styles.receiptInput}
              placeholder="Customer phone (optional)"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
            />
          </View>
          
          {/* Receipt Actions */}
          <View style={styles.receiptActions}>
            <TouchableOpacity
              style={[styles.receiptButton, styles.emailButton]}
              onPress={() => sendReceipt('email')}
              disabled={!customerEmail || receiptSending}
            >
              <Icon name="mail" size={20} color="white" />
              <Text style={styles.receiptButtonText}>Email</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.receiptButton, styles.smsButton]}
              onPress={() => sendReceipt('sms')}
              disabled={!customerPhone || receiptSending}
            >
              <Icon name="chatbox" size={20} color="white" />
              <Text style={styles.receiptButtonText}>SMS</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.receiptButton, styles.chatButton]}
              onPress={() => sendReceipt('chat')}
              disabled={receiptSending}
            >
              <Icon name="chatbubbles" size={20} color="white" />
              <Text style={styles.receiptButtonText}>Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.receiptButton, styles.printButton]}
              onPress={() => sendReceipt('print')}
              disabled={receiptSending}
            >
              <Icon name="print" size={20} color="white" />
              <Text style={styles.receiptButtonText}>Print</Text>
            </TouchableOpacity>
          </View>
          
          {/* Skip Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              setShowReceiptModal(false);
              resetPOS();
              animateScreenChange('products');
            }}
            disabled={receiptSending}
          >
            <Text style={styles.skipButtonText}>Skip & Start New Sale</Text>
          </TouchableOpacity>
          
          {receiptSending && (
            <View style={styles.sendingOverlay}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.sendingText}>Sending receipt...</Text>
            </View>
          )}
        </View>
      </View>
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
      {/* Receipt Modal */}
      {renderReceiptModal()}
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentScreen === 'products' && 'Menu'}
          {currentScreen === 'cart' && 'Cart'}
          {currentScreen === 'payment' && 'Payment'}
        </Text>
        <View style={styles.headerRight}>
          {currentScreen === 'products' && cart.length > 0 && (
            <View style={styles.cartIndicator}>
              <Text style={styles.cartCount}>{cart.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressStep, currentScreen !== 'products' && styles.progressStepComplete]}>
          <View style={[styles.progressDot, currentScreen === 'products' && styles.progressDotActive]}>
            <Icon name="restaurant" size={16} color={currentScreen === 'products' ? 'white' : '#2563eb'} />
          </View>
          <Text style={styles.progressLabel}>Menu</Text>
        </View>
        
        <View style={[styles.progressLine, currentScreen !== 'products' && styles.progressLineComplete]} />
        
        <View style={[styles.progressStep, currentScreen === 'payment' && styles.progressStepComplete]}>
          <View style={[styles.progressDot, currentScreen === 'cart' && styles.progressDotActive]}>
            <Icon name="cart" size={16} color={currentScreen === 'cart' ? 'white' : currentScreen === 'payment' ? '#2563eb' : '#ccc'} />
          </View>
          <Text style={styles.progressLabel}>Cart</Text>
        </View>
        
        <View style={[styles.progressLine, currentScreen === 'payment' && styles.progressLineComplete]} />
        
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, currentScreen === 'payment' && styles.progressDotActive]}>
            <Icon name="card" size={16} color={currentScreen === 'payment' ? 'white' : '#ccc'} />
          </View>
          <Text style={styles.progressLabel}>Payment</Text>
        </View>
      </View>

      {/* Screen Content */}
      {currentScreen === 'products' && renderProductScreen()}
      {currentScreen === 'cart' && renderCartScreen()}
      {currentScreen === 'payment' && renderPaymentScreen()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {currentScreen === 'products' && (
          <>
            <View style={styles.cartSummary}>
              <Text style={styles.cartSummaryText}>
                {cart.length} items • {currency.symbol}{total.toFixed(0)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.navButton, styles.primaryButton, cart.length === 0 && styles.disabledButton]}
              onPress={() => animateScreenChange('cart')}
              disabled={cart.length === 0}
            >
              <Text style={styles.primaryButtonText}>View Cart</Text>
              <Icon name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </>
        )}

        {currentScreen === 'cart' && (
          <>
            <TouchableOpacity
              style={[styles.navButton, styles.secondaryButton]}
              onPress={() => animateScreenChange('products')}
            >
              <Icon name="arrow-back" size={20} color="#666" />
              <Text style={styles.secondaryButtonText}>Add More</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, styles.primaryButton, cart.length === 0 && styles.disabledButton]}
              onPress={() => animateScreenChange('payment')}
              disabled={cart.length === 0}
            >
              <Text style={styles.primaryButtonText}>Checkout</Text>
              <Icon name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </>
        )}

        {currentScreen === 'payment' && (
          <>
            <TouchableOpacity
              style={[styles.navButton, styles.secondaryButton]}
              onPress={() => animateScreenChange('cart')}
            >
              <Icon name="arrow-back" size={20} color="#666" />
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.totalDisplay}>
              <Text style={styles.totalDisplayLabel}>Total</Text>
              <Text style={styles.totalDisplayAmount}>{currency.symbol}{total.toFixed(0)}</Text>
            </View>
          </>
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  cartIndicator: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cartCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 30,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressStepComplete: {
    opacity: 1,
  },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e1e8ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressDotActive: {
    backgroundColor: '#2563eb',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e1e8ed',
    marginHorizontal: 10,
    marginBottom: 20,
  },
  progressLineComplete: {
    backgroundColor: '#2563eb',
  },
  screenContainer: {
    flex: 1,
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
    maxHeight: 50,
    marginBottom: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
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
    fontWeight: '500',
    color: '#666',
  },
  categoryTextActive: {
    color: 'white',
  },
  productGrid: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  productCardWrapper: {
    flex: 1,
    padding: 5,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  productInCart: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  outOfStock: {
    opacity: 0.5,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  stockIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  stockWarning: {
    fontSize: 11,
    color: '#f59e0b',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 15,
  },
  continueShoppingButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  continueShoppingText: {
    color: 'white',
    fontWeight: '600',
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 5,
    padding: 15,
    borderRadius: 10,
  },
  cartItemLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  cartItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  cartItemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 13,
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
    width: 32,
    height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  discountSection: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountTypeButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  discountTypeActive: {
    backgroundColor: '#2563eb',
  },
  discountTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  discountTypeTextActive: {
    color: 'white',
  },
  discountInput: {
    flex: 1,
    marginHorizontal: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  totalsSection: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 15,
    borderRadius: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  discountValue: {
    color: '#22c55e',
  },
  grandTotalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  orderSummary: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 15,
    borderRadius: 10,
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
  summaryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  paymentMethods: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 15,
    borderRadius: 10,
  },
  methodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 5,
    borderRadius: 10,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  methodTextActive: {
    color: 'white',
  },
  dottQRLogo: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  dottQRLogoActive: {
    // Keep same size for active state
  },
  cashSection: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 15,
    borderRadius: 10,
  },
  cashInput: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 15,
  },
  quickCashButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickCashButton: {
    flex: 1,
    paddingVertical: 10,
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
    marginTop: 15,
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
  dottQRSection: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 15,
    borderRadius: 10,
  },
  qrPlaceholder: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
  },
  qrDottLogo: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  qrText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  dottQRInfo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  dottActionButtons: {
    marginVertical: 15,
  },
  dottScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 15,
    gap: 8,
  },
  dottScanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  dottOrText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9ca3af',
    marginVertical: 10,
  },
  dottManualEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dottIdInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dottLookupButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dottCustomerCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  dottCustomerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  dottCustomerDetails: {
    flex: 1,
  },
  dottCustomerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  dottCustomerPhone: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 2,
  },
  dottCustomerType: {
    fontSize: 12,
    color: '#2563eb',
    marginTop: 4,
  },
  dottChangeButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  dottChangeButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  mtnSection: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 15,
    borderRadius: 10,
  },
  mtnInput: {
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
  },
  mtnInfo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  mtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffcb05',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mtnIconActive: {
    backgroundColor: 'white',
  },
  mtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  mtnTextActive: {
    color: '#ffcb05',
  },
  completeButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    marginHorizontal: 15,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  processingButton: {
    opacity: 0.7,
  },
  completeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  cartSummary: {
    flex: 1,
  },
  cartSummaryText: {
    fontSize: 14,
    color: '#666',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 5,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 5,
  },
  totalDisplay: {
    alignItems: 'flex-end',
  },
  totalDisplayLabel: {
    fontSize: 12,
    color: '#666',
  },
  totalDisplayAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
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
  // Receipt Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: screenWidth - 40,
    maxHeight: screenHeight * 0.8,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  receiptNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  receiptSummary: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptLabel: {
    fontSize: 14,
    color: '#666',
  },
  receiptValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  receiptQuestion: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
  },
  receiptInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 10,
  },
  receiptInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },
  receiptActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    margin: 5,
  },
  emailButton: {
    backgroundColor: '#3b82f6',
  },
  smsButton: {
    backgroundColor: '#10b981',
  },
  chatButton: {
    backgroundColor: '#8b5cf6',
  },
  printButton: {
    backgroundColor: '#6b7280',
  },
  receiptButtonText: {
    color: 'white',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
  sendingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  sendingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});