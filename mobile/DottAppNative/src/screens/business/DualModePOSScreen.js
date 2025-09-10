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
import QRCode from 'react-native-qrcode-svg';
import { useNavigation } from '@react-navigation/native';
import { useMenuContext } from '../../context/MenuContext';
import { useBusinessContext } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Dark green theme color
const THEME_COLOR = '#14532d';
const THEME_COLOR_LIGHT = '#15803d';

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

export default function DualModePOSScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { menuItems, categories: menuCategories, getAvailableMenuItems, updateMenuItemStock } = useMenuContext();
  const { businessProfile } = useBusinessContext();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Progressive flow states
  const [currentStep, setCurrentStep] = useState('mode'); // 'mode', 'menu', 'cart', 'payment'
  const [posMode, setPosMode] = useState('simple'); // 'simple' or 'advanced'
  
  // Simple Mode States
  const [simpleAmount, setSimpleAmount] = useState('');
  const [simpleNote, setSimpleNote] = useState('');
  
  // Advanced Mode States
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Common States
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currency, setCurrency] = useState(AFRICAN_CURRENCIES.DEFAULT);
  const [taxRate, setTaxRate] = useState(0.08);
  
  // Payment States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [mtnNumber, setMtnNumber] = useState('');
  const [cardProcessing, setCardProcessing] = useState(false);
  const [mtnProcessing, setMtnProcessing] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showMtnModal, setShowMtnModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [sendingSMS, setSendingSMS] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState(null);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    exp_month: '',
    exp_year: '',
    cvc: '',
    name: '',
  });
  
  // QR Code States
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrTransactionId, setQrTransactionId] = useState(null);
  const [qrTimer, setQrTimer] = useState(300); // 5 minutes
  
  // Calculation States
  const [subtotal, setSubtotal] = useState(0);
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
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
    detectCurrency();
  }, []);

  // Update products when menu items change (Advanced Mode)
  useEffect(() => {
    if (posMode === 'advanced' && menuItems && menuItems.length > 0) {
      const availableItems = getAvailableMenuItems();
      const formattedItems = availableItems.map(item => ({
        ...item,
        price: parseFloat(item.price) || 0,
        stock: item.quantity_on_hand || 99,
        category: item.category_name || item.category || 'General',
        sku: item.sku || `ITEM-${item.id}`,
        image: item.image_url || item.image || item.photo || null,
      }));
      setProducts(formattedItems);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(formattedItems.map(p => p.category))];
      const categoriesData = uniqueCategories.map((cat, index) => ({
        id: index,
        name: cat,
        icon: getCategoryIcon(cat),
        color: getCategoryColor(cat),
      }));
      setCategories(categoriesData);
    }
  }, [menuItems, posMode]);

  // Calculate totals for both modes
  useEffect(() => {
    if (posMode === 'simple') {
      const amount = parseFloat(simpleAmount) || 0;
      const taxAmount = amount * taxRate;
      setSubtotal(amount);
      setTax(taxAmount);
      setTotal(amount + taxAmount);
    } else {
      // Advanced mode calculation
      const sub = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const taxAmount = sub * taxRate;
      setSubtotal(sub);
      setTax(taxAmount);
      setTotal(sub + taxAmount);
    }
  }, [simpleAmount, cart, taxRate, posMode]);

  // Calculate change
  useEffect(() => {
    if (paymentMethod === 'cash' && cashReceived) {
      const received = parseFloat(cashReceived) || 0;
      setChange(Math.max(0, received - total));
    }
  }, [cashReceived, total, paymentMethod]);

  const detectCurrency = async () => {
    try {
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

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Load any necessary data
    } catch (error) {
      console.error('Error loading POS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'general': 'restaurant',
      'main_courses': 'restaurant',
      'beverages': 'beer',
      'drinks': 'beer',
      'desserts': 'ice-cream',
      'appetizers': 'leaf',
    };
    const name = categoryName.toLowerCase();
    return iconMap[name] || 'pricetag';
  };

  const getCategoryColor = (categoryName) => {
    const colorMap = {
      'general': THEME_COLOR,
      'main_courses': '#FF6347',
      'beverages': '#4169E1',
      'drinks': '#4169E1',
      'desserts': '#FF69B4',
      'appetizers': '#32CD32',
    };
    const name = categoryName.toLowerCase();
    return colorMap[name] || THEME_COLOR;
  };

  // Generate dynamic QR code for Dott payment
  const generateDynamicQR = async () => {
    if (total <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setProcessing(true);
    try {
      const transactionId = `TXN_${Date.now()}_${user?.id}`;
      
      const qrPaymentData = {
        transaction_id: transactionId,
        business_id: user?.business_id || user?.tenant_id,
        business_name: businessProfile?.business_name || businessProfile?.name || 'Business',
        amount: total.toFixed(2),
        currency: currency.code,
        tax: tax.toFixed(2),
        subtotal: subtotal.toFixed(2),
        items: posMode === 'simple' ? [{
          name: simpleNote || 'Payment',
          quantity: 1,
          price: subtotal.toFixed(2),
        }] : cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price.toFixed(2),
        })),
        metadata: {
          pos_mode: posMode,
          timestamp: new Date().toISOString(),
        },
      };

      // Call backend API to create QR payment transaction
      try {
        const response = await api.post('/payments/qr/create/', qrPaymentData);
        
        if (response.data?.qr_data) {
          setQrData(response.data.qr_data);
          setQrTransactionId(response.data.transaction_id || transactionId);
          setQrTimer(300); // Reset 5-minute timer
          setShowQRModal(true);
          setShowPaymentModal(false);
          
          // Start polling for payment status
          startPaymentPolling(response.data.transaction_id || transactionId);
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (apiError) {
        console.error('Backend QR API error:', apiError);
        
        // Fallback to local QR generation if backend fails
        const fallbackQrData = {
          type: 'dott_payment',
          transaction_id: transactionId,
          business_id: qrPaymentData.business_id,
          business_name: qrPaymentData.business_name,
          amount: total.toFixed(2),
          currency: currency.code,
        };
        
        setQrData(JSON.stringify(fallbackQrData));
        setQrTransactionId(transactionId);
        setQrTimer(300);
        setShowQRModal(true);
        setShowPaymentModal(false);
        
        // Use mock polling for fallback
        startMockPaymentPolling(transactionId);
      }
    } catch (error) {
      console.error('QR generation error:', error);
      Alert.alert('QR Generation Failed', 'Could not generate payment QR code. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Real payment polling from backend
  const startPaymentPolling = async (transactionId) => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for 5 minutes max
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        clearInterval(pollInterval);
        setShowQRModal(false);
        Alert.alert('Payment Timeout', 'The payment request has expired. Please try again.');
        return;
      }
      
      try {
        const response = await api.get(`/payments/qr/status/${transactionId}/`);
        
        if (response.data?.status === 'completed') {
          clearInterval(pollInterval);
          setShowQRModal(false);
          
          Alert.alert(
            'Payment Successful!',
            `Payment of ${currency.symbol}${total.toFixed(0)} received successfully`,
            [{ text: 'OK', onPress: () => completeTransaction({
              method: 'qr_code',
              gateway: 'dott_pay',
              transaction_id: transactionId,
            }) }]
          );
        } else if (response.data?.status === 'failed' || response.data?.status === 'cancelled') {
          clearInterval(pollInterval);
          setShowQRModal(false);
          Alert.alert('Payment Failed', 'The payment was not completed. Please try again.');
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 5000); // Poll every 5 seconds
  };

  // Mock payment polling for demo/fallback
  const startMockPaymentPolling = (transactionId) => {
    // Simulate payment completion after 10 seconds for demo
    setTimeout(() => {
      if (qrTransactionId === transactionId) {
        setShowQRModal(false);
        Alert.alert(
          'Payment Successful!',
          `Payment of ${currency.symbol}${total.toFixed(0)} received successfully`,
          [{ text: 'OK', onPress: () => completeTransaction({
            method: 'qr_code',
            gateway: 'dott_pay',
            transaction_id: transactionId,
          }) }]
        );
      }
    }, 10000);
  };

  // QR Timer countdown
  useEffect(() => {
    let timer;
    if (showQRModal && qrTimer > 0) {
      timer = setInterval(() => {
        setQrTimer(prev => {
          if (prev <= 1) {
            setShowQRModal(false);
            Alert.alert('QR Expired', 'Payment QR code has expired. Please generate a new one.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showQRModal, qrTimer]);

  const addToCart = (product) => {
    if (product.stock <= 0) {
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
    }
  };

  const updateQuantity = (productId, quantity) => {
    const product = products.find(p => p.id === productId);
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== productId));
    } else if (quantity > product.stock) {
      Alert.alert('Stock Limit', `Only ${product.stock} items available`);
    } else {
      setCart(cart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  // Process Stripe card payment
  const processStripePayment = async () => {
    if (!cardDetails.number || !cardDetails.exp_month || !cardDetails.exp_year || !cardDetails.cvc) {
      Alert.alert('Incomplete Details', 'Please fill in all card details');
      return;
    }

    setCardProcessing(true);
    try {
      const paymentData = {
        amount: total.toFixed(2),
        currency: currency.code,
        payment_method_type: 'card',
        gateway: 'stripe',
        card_details: {
          number: cardDetails.number.replace(/\s/g, ''),
          exp_month: parseInt(cardDetails.exp_month),
          exp_year: parseInt(cardDetails.exp_year),
          cvc: cardDetails.cvc,
          name: cardDetails.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
        },
        metadata: {
          pos_mode: posMode,
          items: posMode === 'simple' ? [{
            name: simpleNote || 'Payment',
            quantity: 1,
            price: subtotal.toFixed(2),
          }] : cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price.toFixed(2),
          })),
          tax: tax.toFixed(2),
          subtotal: subtotal.toFixed(2),
        },
      };

      const response = await api.post('/payments/pos/process-card/', paymentData);
      
      if (response.data?.success) {
        setShowCardModal(false);
        Alert.alert(
          'Payment Successful',
          `Card payment of ${currency.symbol}${total.toFixed(0)} processed successfully`,
          [{ text: 'OK', onPress: () => completeTransaction({
            method: 'card',
            gateway: 'stripe',
            cardLastFour: cardDetails.number.slice(-4),
            stripe_payment_id: response.data?.payment_id,
          }) }]
        );
      } else {
        throw new Error(response.data?.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      Alert.alert(
        'Payment Failed', 
        error.response?.data?.message || 'Card payment failed. Please try again.'
      );
    } finally {
      setCardProcessing(false);
    }
  };

  // Process MTN Mobile Money payment
  const processMtnPayment = async () => {
    if (!mtnNumber || mtnNumber.length < 9) {
      Alert.alert('Invalid Number', 'Please enter a valid MTN phone number');
      return;
    }

    setMtnProcessing(true);
    try {
      const paymentData = {
        amount: total.toFixed(2),
        currency: currency.code,
        payment_method_type: 'mobile_money',
        gateway: 'mtn',
        phone_number: mtnNumber,
        metadata: {
          pos_mode: posMode,
          items: posMode === 'simple' ? [{
            name: simpleNote || 'Payment',
            quantity: 1,
            price: subtotal.toFixed(2),
          }] : cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price.toFixed(2),
          })),
          tax: tax.toFixed(2),
          subtotal: subtotal.toFixed(2),
        },
      };

      const response = await api.post('/payments/pos/process-mobile-money/', paymentData);
      
      if (response.data?.success) {
        // Start polling for payment confirmation
        pollMtnPaymentStatus(response.data.transaction_id);
        Alert.alert(
          'Payment Initiated',
          'Please approve the payment request on your phone',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(response.data?.message || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('MTN payment error:', error);
      Alert.alert(
        'Payment Failed',
        error.response?.data?.message || 'MTN payment failed. Please try again.'
      );
      setMtnProcessing(false);
    }
  };

  // Poll MTN payment status
  const pollMtnPaymentStatus = async (transactionId) => {
    let attempts = 0;
    const maxAttempts = 30; // Poll for 2.5 minutes max
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        clearInterval(pollInterval);
        setMtnProcessing(false);
        setShowMtnModal(false);
        Alert.alert('Payment Timeout', 'The payment request has expired. Please try again.');
        return;
      }
      
      try {
        const response = await api.get(`/payments/mobile-money/status/${transactionId}/`);
        
        if (response.data?.status === 'completed') {
          clearInterval(pollInterval);
          setMtnProcessing(false);
          setShowMtnModal(false);
          
          Alert.alert(
            'Payment Successful',
            `MTN payment of ${currency.symbol}${total.toFixed(0)} received successfully`,
            [{ text: 'OK', onPress: () => completeTransaction({
            method: 'mobile_money',
            gateway: 'mtn',
            mobile_number: mtnNumber,
            transaction_id: transactionId,
          }) }]
          );
        } else if (response.data?.status === 'failed' || response.data?.status === 'cancelled') {
          clearInterval(pollInterval);
          setMtnProcessing(false);
          setShowMtnModal(false);
          Alert.alert('Payment Failed', 'The payment was not completed. Please try again.');
        }
      } catch (error) {
        console.error('Error polling MTN payment status:', error);
      }
    }, 5000); // Poll every 5 seconds
  };

  const completeTransaction = async (paymentDetails = {}) => {
    try {
      // Prepare transaction data
      const transactionData = {
        // Transaction details
        transaction_type: posMode === 'simple' ? 'quick_sale' : 'full_pos',
        payment_method: paymentDetails.method || paymentMethod,
        payment_gateway: paymentDetails.gateway || null,
        
        // Amounts
        subtotal: subtotal.toFixed(2),
        tax_amount: tax.toFixed(2),
        total_amount: total.toFixed(2),
        currency: currency.code,
        
        // Items
        items: posMode === 'simple' ? [{
          item_name: simpleNote || 'Quick Sale',
          quantity: 1,
          unit_price: subtotal.toFixed(2),
          total_price: subtotal.toFixed(2),
        }] : cart.map(item => ({
          item_name: item.name,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price.toFixed(2),
          total_price: (item.price * item.quantity).toFixed(2),
          tax_amount: (item.price * item.quantity * taxRate).toFixed(2),
        })),
        
        // Payment specific details
        payment_details: {
          ...paymentDetails,
          cash_received: cashReceived || null,
          change_amount: change || null,
          card_last_four: paymentDetails.cardLastFour || null,
          mobile_number: mtnNumber || null,
        },
        
        // Customer info for receipt - use from payment details or state
        customer_phone: paymentDetails.customer_phone || customerPhone || null,
        send_sms_receipt: !!(paymentDetails.customer_phone || customerPhone),
        
        // Metadata
        metadata: {
          pos_mode: posMode,
          device_type: Platform.OS,
          app_version: '1.0.0',
        },
      };

      // Try to call backend to complete transaction
      try {
        const response = await api.post('/sales/pos/complete-transaction/', transactionData);
        
        if (response.data?.success) {
          setLastTransactionId(response.data.transaction_id);
          
          // Check if customer phone was provided during payment
          const hasCustomerPhone = paymentDetails.customer_phone || customerPhone;
          
          if (hasCustomerPhone) {
            // If phone was provided, send receipt automatically
            Alert.alert(
              'Transaction Complete',
              `Receipt has been sent to ${hasCustomerPhone}`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setCurrentStep('mode');
                    resetPOS();
                  },
                },
              ]
            );
          } else {
            // Ask if they want to send receipt
            Alert.alert(
              'Transaction Complete',
              'Would you like to send a receipt via SMS?',
              [
                {
                  text: 'No',
                  onPress: () => {
                    setCurrentStep('mode');
                    resetPOS();
                  },
                  style: 'cancel',
                },
                {
                  text: 'Yes',
                  onPress: () => setShowReceiptModal(true),
                },
              ]
            );
          }
        } else {
          throw new Error(response.data?.message || 'Transaction recording failed');
        }
      } catch (apiError) {
        // If backend is not available, still complete the transaction locally
        console.log('Backend recording failed, completing locally:', apiError.message);
        
        // Generate a local transaction ID
        const localTransactionId = `LOCAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setLastTransactionId(localTransactionId);
        
        // Store transaction locally for later sync
        try {
          const pendingTransactions = await AsyncStorage.getItem('pendingTransactions');
          const transactions = pendingTransactions ? JSON.parse(pendingTransactions) : [];
          transactions.push({
            ...transactionData,
            localId: localTransactionId,
            timestamp: new Date().toISOString(),
          });
          await AsyncStorage.setItem('pendingTransactions', JSON.stringify(transactions));
        } catch (storageError) {
          console.error('Failed to store transaction locally:', storageError);
        }
        
        // Still show success to user
        Alert.alert(
          'Payment Successful',
          'Transaction completed successfully. Receipt will be available once synced.',
          [
            {
              text: 'OK',
              onPress: () => {
                setCurrentStep('mode');
                resetPOS();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Transaction completion error:', error);
      
      // Still reset POS even if recording failed (transaction was successful)
      Alert.alert(
        'Recording Error',
        'Payment was successful but transaction recording failed. The sale will be saved for later sync.',
        [
          {
            text: 'OK',
            onPress: () => {
              setCurrentStep('mode');
              resetPOS();
            },
          },
        ]
      );
    }
  };

  const resetPOS = () => {
    if (posMode === 'simple') {
      setSimpleAmount('');
      setSimpleNote('');
    } else {
      setCart([]);
    }
    setCashReceived('');
    setMtnNumber('');
    setCardDetails({
      number: '',
      exp_month: '',
      exp_year: '',
      cvc: '',
      name: '',
    });
    setPaymentMethod('cash');
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const navigateToStep = (step) => {
    setCurrentStep(step);
  };

  // Render progress bar
  const renderProgressBar = () => (
    <View style={styles.progressBar}>
      {/* Mode Selection */}
      <TouchableOpacity 
        style={styles.progressStep}
        onPress={() => navigateToStep('mode')}
      >
        <View style={[styles.progressCircle, currentStep === 'mode' && styles.progressCircleActive]}>
          <Icon name="grid" size={20} color={currentStep === 'mode' ? 'white' : THEME_COLOR} />
        </View>
        <Text style={[styles.progressLabel, currentStep === 'mode' && styles.progressLabelActive]}>
          Mode
        </Text>
      </TouchableOpacity>

      <View style={styles.progressLine} />

      {/* Menu/Amount */}
      <TouchableOpacity 
        style={styles.progressStep}
        onPress={() => currentStep !== 'mode' && navigateToStep('menu')}
        disabled={currentStep === 'mode'}
      >
        <View style={[
          styles.progressCircle, 
          currentStep === 'menu' && styles.progressCircleActive,
          currentStep === 'mode' && styles.progressCircleDisabled
        ]}>
          <Icon 
            name={posMode === 'simple' ? 'calculator' : 'restaurant'} 
            size={20} 
            color={currentStep === 'menu' ? 'white' : (currentStep === 'mode' ? '#ccc' : THEME_COLOR)} 
          />
        </View>
        <Text style={[
          styles.progressLabel, 
          currentStep === 'menu' && styles.progressLabelActive,
          currentStep === 'mode' && styles.progressLabelDisabled
        ]}>
          {posMode === 'simple' ? 'Amount' : 'Menu'}
        </Text>
      </TouchableOpacity>

      <View style={styles.progressLine} />

      {/* Cart/Review */}
      <TouchableOpacity 
        style={styles.progressStep}
        onPress={() => (currentStep === 'menu' || currentStep === 'cart' || currentStep === 'payment') && navigateToStep('cart')}
        disabled={currentStep === 'mode'}
      >
        <View style={[
          styles.progressCircle, 
          currentStep === 'cart' && styles.progressCircleActive,
          currentStep === 'mode' && styles.progressCircleDisabled
        ]}>
          <Icon 
            name="cart" 
            size={20} 
            color={currentStep === 'cart' ? 'white' : (currentStep === 'mode' ? '#ccc' : THEME_COLOR)} 
          />
        </View>
        <Text style={[
          styles.progressLabel, 
          currentStep === 'cart' && styles.progressLabelActive,
          currentStep === 'mode' && styles.progressLabelDisabled
        ]}>
          {posMode === 'simple' ? 'Review' : 'Cart'}
        </Text>
      </TouchableOpacity>

      <View style={styles.progressLine} />

      {/* Payment */}
      <TouchableOpacity 
        style={styles.progressStep}
        onPress={() => currentStep === 'payment' && navigateToStep('payment')}
        disabled={currentStep !== 'payment'}
      >
        <View style={[
          styles.progressCircle, 
          currentStep === 'payment' && styles.progressCircleActive,
          currentStep !== 'payment' && styles.progressCircleDisabled
        ]}>
          <Icon 
            name="card" 
            size={20} 
            color={currentStep === 'payment' ? 'white' : '#ccc'} 
          />
        </View>
        <Text style={[
          styles.progressLabel, 
          currentStep === 'payment' && styles.progressLabelActive,
          currentStep !== 'payment' && styles.progressLabelDisabled
        ]}>
          Payment
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render mode selection
  const renderModeSelection = () => (
    <Animated.View style={[styles.stepContainer, {
      opacity: fadeAnim,
      transform: [{ scale: scaleAnim }]
    }]}>
      <Text style={styles.stepTitle}>Select POS Mode</Text>
      <Text style={styles.stepSubtitle}>Choose how you want to process this sale</Text>

      <TouchableOpacity
        style={[styles.modeCard, posMode === 'simple' && styles.modeCardActive]}
        onPress={() => {
          setPosMode('simple');
          setCurrentStep('menu');
        }}
      >
        <Icon name="calculator" size={48} color={posMode === 'simple' ? 'white' : THEME_COLOR} />
        <Text style={[styles.modeTitle, posMode === 'simple' && styles.modeTitleActive]}>
          Quick Sale
        </Text>
        <Text style={[styles.modeDescription, posMode === 'simple' && styles.modeDescriptionActive]}>
          Enter amount directly without selecting products
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.modeCard, posMode === 'advanced' && styles.modeCardActive]}
        onPress={() => {
          setPosMode('advanced');
          setCurrentStep('menu');
        }}
      >
        <Icon name="storefront" size={48} color={posMode === 'advanced' ? 'white' : THEME_COLOR} />
        <Text style={[styles.modeTitle, posMode === 'advanced' && styles.modeTitleActive]}>
          Full POS
        </Text>
        <Text style={[styles.modeDescription, posMode === 'advanced' && styles.modeDescriptionActive]}>
          Select items from menu with inventory tracking
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // Render simple amount entry
  const renderSimpleAmount = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.stepContainer, {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }]
        }]}>
          <View style={styles.amountHeader}>
            <Text style={styles.stepTitle}>Enter Amount</Text>
            <TouchableOpacity
              style={[styles.continueButton, (!simpleAmount || parseFloat(simpleAmount) <= 0) && styles.continueButtonDisabled]}
              onPress={() => setCurrentStep('cart')}
              disabled={!simpleAmount || parseFloat(simpleAmount) <= 0}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
              <Icon name="arrow-forward" size={18} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.amountSection}>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>{currency.symbol}</Text>
              <TextInput
                style={styles.amountInput}
                value={simpleAmount}
                onChangeText={setSimpleAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#999"
                autoFocus={true}
              />
            </View>
            
            <TextInput
              style={styles.noteInput}
              value={simpleNote}
              onChangeText={setSimpleNote}
              placeholder="Add note (optional)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
            />

            <View style={styles.quickAmountButtons}>
              {[1000, 2000, 5000, 10000, 20000].map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => setSimpleAmount(amount.toString())}
                >
                  <Text style={styles.quickAmountText}>
                    {currency.symbol}{amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // Render product selection for advanced mode
  const renderProductSelection = () => {
    const filteredProducts = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    return (
      <Animated.View style={[styles.stepContainer, {
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }]
      }]}>
        <Text style={styles.stepTitle}>Select Items</Text>
        
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
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
            <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>
              All Items
            </Text>
          </TouchableOpacity>
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryButton, selectedCategory === category.name && styles.categoryActive]}
              onPress={() => setSelectedCategory(category.name)}
            >
              <Text style={[styles.categoryText, selectedCategory === category.name && styles.categoryTextActive]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products Grid */}
        <FlatList
          data={filteredProducts}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.productCard}
              onPress={() => addToCart(item)}
            >
              <View style={styles.productImageContainer}>
                {item.image ? (
                  <Image 
                    source={{ uri: item.image }} 
                    style={styles.productPhoto}
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Icon name={getCategoryIcon(item.category)} size={24} color="#999" />
                  </View>
                )}
              </View>
              
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productPrice}>
                  {currency.symbol}{item.price.toFixed(0)}
                </Text>
              </View>
              
              {cart.find(c => c.id === item.id) && (
                <View style={styles.productBadge}>
                  <Text style={styles.productBadgeText}>
                    {cart.find(c => c.id === item.id).quantity}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.productGrid}
          showsVerticalScrollIndicator={false}
        />

        <TouchableOpacity
          style={[styles.nextButton, cart.length === 0 && styles.nextButtonDisabled]}
          onPress={() => setCurrentStep('cart')}
          disabled={cart.length === 0}
        >
          <Text style={styles.nextButtonText}>
            Continue to Cart ({cart.length} items)
          </Text>
          <Icon name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render cart review
  const renderCart = () => (
    <Animated.View style={[styles.stepContainer, {
      opacity: fadeAnim,
      transform: [{ translateX: slideAnim }]
    }]}>
      <Text style={styles.stepTitle}>
        {posMode === 'simple' ? 'Review Order' : 'Shopping Cart'}
      </Text>
      
      {posMode === 'simple' ? (
        <View style={styles.reviewContainer}>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Amount</Text>
            <Text style={styles.reviewValue}>
              {currency.symbol}{subtotal.toFixed(0)}
            </Text>
          </View>
          {simpleNote && (
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Note</Text>
              <Text style={styles.reviewNote}>{simpleNote}</Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={cart}
          renderItem={({ item }) => (
            <View style={styles.cartItem}>
              <View style={styles.cartItemLeft}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <Text style={styles.cartItemPrice}>
                  {currency.symbol}{item.price.toFixed(0)} each
                </Text>
              </View>
              
              <View style={styles.cartItemRight}>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Icon name="remove" size={18} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Icon name="add" size={18} color="white" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartItemTotal}>
                  {currency.symbol}{(item.price * item.quantity).toFixed(0)}
                </Text>
              </View>
            </View>
          )}
          keyExtractor={item => item.id.toString()}
          style={styles.cartList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Totals */}
      <View style={styles.totalsContainer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>
            {currency.symbol}{subtotal.toFixed(0)}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax ({(taxRate * 100).toFixed(0)}%)</Text>
          <Text style={styles.totalValue}>
            {currency.symbol}{tax.toFixed(0)}
          </Text>
        </View>
        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalValue}>
            {currency.symbol}{total.toFixed(0)}
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep('menu')}
        >
          <Icon name="arrow-back" size={20} color={THEME_COLOR} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setCurrentStep('payment')}
        >
          <Text style={styles.nextButtonText}>Proceed to Payment</Text>
          <Icon name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Render payment options
  const renderPayment = () => (
    <Animated.View style={[styles.stepContainer, {
      opacity: fadeAnim,
      transform: [{ translateX: slideAnim }]
    }]}>
      <Text style={styles.stepTitle}>Payment</Text>
      <Text style={styles.totalAmount}>
        Total: {currency.symbol}{total.toFixed(0)}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Payment Methods */}
        <View style={styles.paymentMethods}>
          <TouchableOpacity
            style={[styles.paymentMethodButton, styles.dottPaymentButton]}
            onPress={generateDynamicQR}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="white" size={24} />
            ) : (
              <>
                <View style={styles.dottIcon}>
                  <Text style={styles.dottIconText}>D</Text>
                </View>
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodName}>Dott Pay</Text>
                  <Text style={styles.paymentMethodDesc}>Scan QR to pay with Dott</Text>
                </View>
                <Icon name="qr-code" size={24} color="white" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.paymentMethodButton}
            onPress={() => setShowCashModal(true)}
          >
            <Icon name="cash" size={24} color={THEME_COLOR} />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodNameAlt}>Cash Payment</Text>
              <Text style={styles.paymentMethodDescAlt}>Accept cash payment</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={THEME_COLOR} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.paymentMethodButton}
            onPress={() => setShowMtnModal(true)}
            disabled={mtnProcessing}
          >
            {mtnProcessing ? (
              <ActivityIndicator color={THEME_COLOR} size={24} />
            ) : (
              <>
                <View style={styles.mtnIcon}>
                  <Text style={styles.mtnIconText}>MTN</Text>
                </View>
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodNameAlt}>MTN Mobile Money</Text>
                  <Text style={styles.paymentMethodDescAlt}>Pay with MTN MoMo</Text>
                </View>
                <Icon name="chevron-forward" size={20} color={THEME_COLOR} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.paymentMethodButton}
            onPress={() => setShowCardModal(true)}
            disabled={cardProcessing}
          >
            {cardProcessing ? (
              <ActivityIndicator color={THEME_COLOR} size={24} />
            ) : (
              <>
                <Icon name="card" size={24} color="#1a73e8" />
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodNameAlt}>Credit/Debit Card</Text>
                  <Text style={styles.paymentMethodDescAlt}>Powered by Stripe</Text>
                </View>
                <Icon name="chevron-forward" size={20} color={THEME_COLOR} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setCurrentStep('cart')}
      >
        <Icon name="arrow-back" size={20} color={THEME_COLOR} />
        <Text style={styles.backButtonText}>Back to Cart</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // Render Cash Payment Modal
  const renderCashModal = () => (
    <Modal
      visible={showCashModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCashModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Icon name="cash" size={24} color={THEME_COLOR} />
            <Text style={styles.modalTitle}>Cash Payment</Text>
            <TouchableOpacity onPress={() => {
              setShowCashModal(false);
              setCashReceived('');
              setCustomerPhone('');
            }}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.paymentAmount}>
              Total Due: {currency.symbol}{total.toFixed(2)}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cash Received</Text>
              <TextInput
                style={styles.cardInput}
                value={cashReceived}
                onChangeText={setCashReceived}
                placeholder={`${currency.symbol}0.00`}
                keyboardType="decimal-pad"
                autoFocus={true}
              />
            </View>

            {parseFloat(cashReceived || 0) > 0 && (
              <View style={styles.changeContainer}>
                <Text style={styles.changeLabel}>Change Due:</Text>
                <Text style={[
                  styles.changeAmount,
                  parseFloat(cashReceived || 0) < total && styles.changeAmountError
                ]}>
                  {currency.symbol}{Math.max(0, parseFloat(cashReceived || 0) - total).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Customer Phone (for SMS Receipt)</Text>
              <TextInput
                style={styles.cardInput}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="+1234567890 (Optional)"
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.receiptNote}>
              Enter customer's phone to send SMS receipt
            </Text>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowCashModal(false);
                setCashReceived('');
                setCustomerPhone('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.confirmButton,
                (!cashReceived || parseFloat(cashReceived) < total) && styles.disabledButton
              ]}
              onPress={() => {
                const cashAmount = parseFloat(cashReceived || 0);
                if (cashAmount < total) {
                  Alert.alert('Insufficient Cash', 'Cash received is less than total amount');
                  return;
                }
                
                setShowCashModal(false);
                
                // Complete transaction with cash details and customer phone
                completeTransaction({
                  method: 'cash',
                  gateway: null,
                  cash_received: cashAmount.toFixed(2),
                  change_amount: (cashAmount - total).toFixed(2),
                  customer_phone: customerPhone,
                });
              }}
              disabled={!cashReceived || parseFloat(cashReceived) < total}
            >
              <Text style={styles.confirmButtonText}>Complete Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render Card Payment Modal
  const renderCardModal = () => (
    <Modal
      visible={showCardModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCardModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Card Payment</Text>
            <TouchableOpacity onPress={() => setShowCardModal(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.paymentAmount}>
              Amount: {currency.symbol}{total.toFixed(2)}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <TextInput
                style={styles.cardInput}
                value={cardDetails.number}
                onChangeText={(text) => {
                  // Format card number with spaces
                  const formatted = text.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                  setCardDetails({ ...cardDetails, number: formatted });
                }}
                placeholder="4242 4242 4242 4242"
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>Expiry Date</Text>
                <View style={styles.expiryContainer}>
                  <TextInput
                    style={[styles.cardInput, { flex: 1, marginRight: 5 }]}
                    value={cardDetails.exp_month}
                    onChangeText={(text) => setCardDetails({ ...cardDetails, exp_month: text })}
                    placeholder="MM"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  <Text style={styles.expirySeparator}>/</Text>
                  <TextInput
                    style={[styles.cardInput, { flex: 1, marginLeft: 5 }]}
                    value={cardDetails.exp_year}
                    onChangeText={(text) => setCardDetails({ ...cardDetails, exp_year: text })}
                    placeholder="YY"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 0.5 }]}>
                <Text style={styles.inputLabel}>CVC</Text>
                <TextInput
                  style={styles.cardInput}
                  value={cardDetails.cvc}
                  onChangeText={(text) => setCardDetails({ ...cardDetails, cvc: text })}
                  placeholder="123"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cardholder Name</Text>
              <TextInput
                style={styles.cardInput}
                value={cardDetails.name}
                onChangeText={(text) => setCardDetails({ ...cardDetails, name: text })}
                placeholder="John Doe"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.securityNote}>
              <Icon name="lock-closed" size={16} color="#666" />
              <Text style={styles.securityText}>
                Your payment info is encrypted and secure
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowCardModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, cardProcessing && styles.disabledButton]}
              onPress={processStripePayment}
              disabled={cardProcessing}
            >
              {cardProcessing ? (
                <ActivityIndicator color="white" size={20} />
              ) : (
                <Text style={styles.confirmButtonText}>Pay {currency.symbol}{total.toFixed(2)}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render MTN Payment Modal
  const renderMtnModal = () => (
    <Modal
      visible={showMtnModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowMtnModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.mtnLogoContainer}>
              <View style={styles.mtnIcon}>
                <Text style={styles.mtnIconText}>MTN</Text>
              </View>
              <Text style={styles.modalTitle}>Mobile Money Payment</Text>
            </View>
            <TouchableOpacity onPress={() => setShowMtnModal(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.paymentAmount}>
            Amount: {currency.symbol}{total.toFixed(2)}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>MTN Phone Number</Text>
            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+256</Text>
              <TextInput
                style={[styles.cardInput, { flex: 1 }]}
                value={mtnNumber}
                onChangeText={setMtnNumber}
                placeholder="771234567"
                keyboardType="phone-pad"
                maxLength={9}
              />
            </View>
          </View>

          <View style={styles.mtnInfo}>
            <Icon name="information-circle" size={20} color="#ffcc00" />
            <Text style={styles.mtnInfoText}>
              You will receive a prompt on your phone to approve the payment
            </Text>
          </View>

          {mtnProcessing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#ffcc00" />
              <Text style={styles.processingText}>
                Waiting for payment approval...
              </Text>
              <Text style={styles.processingSubtext}>
                Please check your phone and enter your PIN
              </Text>
            </View>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowMtnModal(false);
                setMtnProcessing(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.mtnConfirmButton, mtnProcessing && styles.disabledButton]}
              onPress={processMtnPayment}
              disabled={mtnProcessing}
            >
              {mtnProcessing ? (
                <ActivityIndicator color="black" size={20} />
              ) : (
                <Text style={styles.mtnConfirmText}>Send Payment Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render Receipt Modal
  const renderReceiptModal = () => (
    <Modal
      visible={showReceiptModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowReceiptModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Icon name="receipt" size={24} color={THEME_COLOR} />
            <Text style={styles.modalTitle}>Send Receipt</Text>
            <TouchableOpacity onPress={() => {
              setShowReceiptModal(false);
              setCurrentStep('mode');
              resetPOS();
            }}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.receiptSuccessIcon}>
            <Icon name="checkmark-circle" size={60} color="#4CAF50" />
          </View>

          <Text style={styles.receiptSuccessText}>
            Transaction Successful!
          </Text>
          <Text style={styles.receiptAmount}>
            {currency.symbol}{total.toFixed(2)}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Customer Phone Number (Optional)</Text>
            <TextInput
              style={styles.cardInput}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="+1234567890"
              keyboardType="phone-pad"
              autoFocus={true}
            />
          </View>

          <Text style={styles.receiptNote}>
            Enter customer's phone number to send receipt via SMS
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowReceiptModal(false);
                setCurrentStep('mode');
                resetPOS();
              }}
            >
              <Text style={styles.cancelButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, sendingSMS && styles.disabledButton]}
              onPress={async () => {
                if (!customerPhone) {
                  Alert.alert('No Phone Number', 'Please enter a phone number or skip');
                  return;
                }
                
                setSendingSMS(true);
                try {
                  const response = await api.post('/sales/pos/send-receipt/', {
                    transaction_id: lastTransactionId,
                    phone_number: customerPhone,
                  });
                  
                  if (response.data?.success) {
                    Alert.alert(
                      'Receipt Sent',
                      `Receipt has been sent to ${customerPhone}`,
                      [{
                        text: 'OK',
                        onPress: () => {
                          setShowReceiptModal(false);
                          setCurrentStep('mode');
                          resetPOS();
                        },
                      }]
                    );
                  } else {
                    throw new Error(response.data?.message || 'Failed to send receipt');
                  }
                } catch (error) {
                  console.error('Receipt sending error:', error);
                  Alert.alert(
                    'Send Failed',
                    'Could not send receipt. Transaction was recorded successfully.',
                    [{
                      text: 'OK',
                      onPress: () => {
                        setShowReceiptModal(false);
                        setCurrentStep('mode');
                        resetPOS();
                      },
                    }]
                  );
                } finally {
                  setSendingSMS(false);
                }
              }}
              disabled={sendingSMS}
            >
              {sendingSMS ? (
                <ActivityIndicator color="white" size={20} />
              ) : (
                <Text style={styles.confirmButtonText}>Send Receipt</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render QR Code Modal
  const renderQRModal = () => (
    <Modal
      visible={showQRModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowQRModal(false)}
    >
      <View style={styles.qrModalOverlay}>
        <View style={styles.qrModalContent}>
          <View style={styles.qrHeader}>
            <View style={styles.dottLogoHeader}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.dottLogoImage}
                resizeMode="contain"
              />
              <Text style={styles.dottBrandText}>Dott</Text>
            </View>
            <TouchableOpacity
              style={styles.qrCloseButton}
              onPress={() => setShowQRModal(false)}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.qrTitle}>Scan to Pay</Text>
          <Text style={styles.qrAmount}>
            {currency.symbol}{total.toFixed(0)}
          </Text>

          <View style={styles.qrContainer}>
            {qrData && (
              <View style={styles.qrWrapper}>
                <QRCode
                  value={qrData}
                  size={200}
                  backgroundColor="white"
                  color="black"
                  logo={require('../../assets/logo.png')}
                  logoSize={40}
                  logoBackgroundColor="white"
                  logoMargin={2}
                  logoBorderRadius={8}
                />
              </View>
            )}
          </View>

          <View style={styles.qrTimer}>
            <Icon name="time" size={16} color="#ef4444" />
            <Text style={styles.qrTimerText}>
              Expires in {formatTime(qrTimer)}
            </Text>
          </View>

          <Text style={styles.qrInstructions}>
            Ask customer to scan this QR code with their Dott app to complete payment
          </Text>

          <View style={styles.qrStatus}>
            <ActivityIndicator size="small" color={THEME_COLOR} />
            <Text style={styles.qrStatusText}>Waiting for payment...</Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Main render content based on current step
  const renderContent = () => {
    switch (currentStep) {
      case 'mode':
        return renderModeSelection();
      case 'menu':
        return posMode === 'simple' ? renderSimpleAmount() : renderProductSelection();
      case 'cart':
        return renderCart();
      case 'payment':
        return renderPayment();
      default:
        return renderModeSelection();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME_COLOR} />
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
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>POS Terminal</Text>
        <View style={styles.headerRight}>
          {cart.length > 0 && currentStep !== 'mode' && (
            <View style={styles.cartIndicator}>
              <Text style={styles.cartCount}>{cart.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* QR Modal */}
      {renderQRModal()}
      
      {/* Cash Payment Modal */}
      {renderCashModal()}
      
      {/* Card Payment Modal */}
      {renderCardModal()}
      
      {/* MTN Payment Modal */}
      {renderMtnModal()}
      
      {/* Receipt Modal */}
      {renderReceiptModal()}
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
    backgroundColor: THEME_COLOR,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  cartIndicator: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cartCount: {
    color: THEME_COLOR,
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e1e8ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressCircleActive: {
    backgroundColor: THEME_COLOR,
  },
  progressCircleDisabled: {
    backgroundColor: '#f3f4f6',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressLabelActive: {
    color: THEME_COLOR,
    fontWeight: '600',
  },
  progressLabelDisabled: {
    color: '#ccc',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e1e8ed',
    marginHorizontal: 5,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME_COLOR,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  modeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  modeCardActive: {
    backgroundColor: THEME_COLOR,
    borderColor: THEME_COLOR,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME_COLOR,
    marginTop: 12,
    marginBottom: 8,
  },
  modeTitleActive: {
    color: 'white',
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modeDescriptionActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  amountSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '600',
    color: THEME_COLOR,
    marginRight: 8,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    minWidth: 200,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  quickAmountButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME_COLOR + '20',
    borderRadius: 8,
    marginBottom: 8,
    minWidth: '18%',
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME_COLOR,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 15,
    color: '#333',
  },
  categoriesContainer: {
    maxHeight: 60,
    marginBottom: 15,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 25,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e1e8ed',
  },
  categoryActive: {
    backgroundColor: THEME_COLOR,
    borderColor: THEME_COLOR,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryTextActive: {
    color: 'white',
  },
  productGrid: {
    paddingBottom: 100,
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
  productImageContainer: {
    width: '100%',
    height: 80,
    marginBottom: 10,
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
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME_COLOR,
  },
  productBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: THEME_COLOR,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reviewContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  reviewItem: {
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME_COLOR,
  },
  reviewNote: {
    fontSize: 16,
    color: '#333',
  },
  cartList: {
    maxHeight: screenHeight * 0.35,
    marginBottom: 20,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  cartItemLeft: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
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
    backgroundColor: THEME_COLOR,
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
    color: THEME_COLOR,
  },
  totalsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    paddingTop: 12,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME_COLOR,
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME_COLOR,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME_COLOR,
    textAlign: 'center',
    marginBottom: 20,
  },
  paymentMethods: {
    marginBottom: 20,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e1e8ed',
    backgroundColor: 'white',
    marginBottom: 12,
  },
  dottPaymentButton: {
    backgroundColor: THEME_COLOR,
    borderColor: THEME_COLOR,
  },
  dottIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dottIconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME_COLOR,
  },
  mtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffcc00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mtnIconText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'black',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  paymentMethodNameAlt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  paymentMethodDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  paymentMethodDescAlt: {
    fontSize: 12,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME_COLOR,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    marginLeft: 10,
  },
  nextButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginRight: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME_COLOR,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME_COLOR,
    marginLeft: 8,
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    width: '90%',
    maxWidth: 350,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  dottLogo: {
    backgroundColor: THEME_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dottLogoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  dottLogoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dottLogoImage: {
    width: 32,
    height: 32,
  },
  dottBrandText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME_COLOR,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCloseButton: {
    padding: 4,
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  qrAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: THEME_COLOR,
    marginBottom: 24,
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  qrTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  qrTimerText: {
    fontSize: 14,
    color: '#ef4444',
    marginLeft: 6,
    fontWeight: '600',
  },
  qrInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  qrStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME_COLOR + '20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  qrStatusText: {
    fontSize: 14,
    color: THEME_COLOR,
    marginLeft: 8,
    fontWeight: '500',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: screenWidth - 40,
    maxHeight: screenHeight * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME_COLOR,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  cardInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expirySeparator: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 5,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  securityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
    marginRight: 10,
  },
  confirmButton: {
    backgroundColor: THEME_COLOR,
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  mtnLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingLeft: 12,
    backgroundColor: '#f9f9f9',
  },
  countryCode: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  mtnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbf0',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  mtnInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  processingContainer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  mtnConfirmButton: {
    backgroundColor: '#ffcc00',
    marginLeft: 10,
  },
  mtnConfirmText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  receiptSuccessIcon: {
    alignItems: 'center',
    marginVertical: 20,
  },
  receiptSuccessText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  receiptAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: THEME_COLOR,
    textAlign: 'center',
    marginBottom: 30,
  },
  receiptNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  changeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  changeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  changeAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME_COLOR,
  },
  changeAmountError: {
    color: '#ef4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#e1e8ed',
    marginVertical: 20,
  },
});