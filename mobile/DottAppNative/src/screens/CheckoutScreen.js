import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useCart } from '../context/CartContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import orderVerificationApi from '../services/orderVerificationApi';

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();

  // State for checkout flow
  const [loading, setLoading] = useState(false);
  const [calculatingTax, setCalculatingTax] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Delivery method state
  const [deliveryMethod, setDeliveryMethod] = useState('delivery');
  const [businessDetails, setBusinessDetails] = useState(null);

  // Address state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);

  // Order summary state
  const [subtotal, setSubtotal] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [total, setTotal] = useState(0);
  const [taxJurisdiction, setTaxJurisdiction] = useState('');

  // Special instructions
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    initializeCheckout();
  }, []);

  useEffect(() => {
    calculateOrderTotal();
  }, [subtotal, taxAmount, deliveryFee, serviceFee]);

  useEffect(() => {
    // Recalculate tax when address changes
    if (selectedAddress && deliveryMethod === 'delivery') {
      calculateTax(selectedAddress);
    } else if (deliveryMethod === 'pickup') {
      // Use business location for pickup orders
      calculateTax(null, true);
    }
  }, [selectedAddress, deliveryMethod]);

  const initializeCheckout = async () => {
    setLoading(true);
    try {
      // Calculate subtotal
      const sub = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      setSubtotal(sub);

      // Load saved addresses
      await loadSavedAddresses();

      // Load business details for pickup option
      if (cartItems.length > 0) {
        await loadBusinessDetails(cartItems[0].businessId);
      }

      // Get default tax rate
      await calculateTax(null, deliveryMethod === 'pickup');

      // Calculate delivery fee based on method
      updateDeliveryFee(deliveryMethod);

    } catch (error) {
      console.error('Error initializing checkout:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedAddresses = async () => {
    try {
      // Try to load from AsyncStorage first (offline support)
      const saved = await AsyncStorage.getItem('savedAddresses');
      if (saved) {
        const addresses = JSON.parse(saved);
        setSavedAddresses(addresses);
        if (addresses.length > 0 && !selectedAddress) {
          setSelectedAddress(addresses[0]);
        }
      }

      // Load from consumer profile API
      // This gets the delivery_addresses from ConsumerProfile model
      try {
        const response = await api.get('/marketplace/consumer/profile/');
        if (response.data?.delivery_addresses && response.data.delivery_addresses.length > 0) {
          const addresses = response.data.delivery_addresses;
          setSavedAddresses(addresses);
          await AsyncStorage.setItem('savedAddresses', JSON.stringify(addresses));
          if (!selectedAddress) {
            // Set default address if exists
            const defaultAddr = addresses.find(addr => addr.isDefault) || addresses[0];
            setSelectedAddress(defaultAddr);
          }
        }
      } catch (apiError) {
        console.log('Could not load addresses from API:', apiError.message);
        // Fall back to cached addresses if API fails
      }
    } catch (error) {
      console.log('No saved addresses found:', error.message);
    }
  };

  const loadBusinessDetails = async (businessId) => {
    try {
      const response = await api.get(`/marketplace/businesses/${businessId}/`);
      setBusinessDetails(response.data);

      // Set delivery options based on business configuration
      if (response.data.delivery_options) {
        const options = response.data.delivery_options;
        if (!options.delivery && options.pickup) {
          setDeliveryMethod('pickup');
        }
      }
    } catch (error) {
      console.error('Error loading business details:', error);
    }
  };

  const calculateTax = async (address = null, useBusinessLocation = false) => {
    setCalculatingTax(true);
    try {
      let response;

      if (useBusinessLocation || !address) {
        // For PICKUP orders: Use business location from UserProfile/BusinessListing
        // The /taxes/pos/default-rate/ endpoint uses the business's registered address
        // from UserProfile (address, city, state, country fields)
        response = await api.get('/taxes/pos/default-rate/');
      } else {
        // For DELIVERY orders: Use customer's delivery address
        // Tax is calculated based on destination (where product is consumed)
        const params = {
          country: address.country || 'US',
          state: address.state || '',
          county: address.county || '',
        };
        response = await api.get('/taxes/pos/customer-rate/', { params });
      }

      if (response.data.success) {
        const rate = response.data.tax_rate || 0;
        const ratePercentage = response.data.rate_percentage || 0;
        setTaxRate(rate);
        setTaxAmount(subtotal * rate);
        setTaxJurisdiction(response.data.jurisdiction || '');

        console.log(`Tax calculated: ${ratePercentage}% for ${response.data.jurisdiction}`);
      } else {
        // No tax configured
        setTaxRate(0);
        setTaxAmount(0);
        setTaxJurisdiction('Not configured');
      }
    } catch (error) {
      console.error('Error calculating tax:', error);
      setTaxRate(0);
      setTaxAmount(0);
    } finally {
      setCalculatingTax(false);
    }
  };

  const updateDeliveryFee = (method) => {
    if (method === 'pickup') {
      setDeliveryFee(0);
    } else if (method === 'delivery') {
      // Get delivery fee from business configuration
      const fee = businessDetails?.delivery_options?.delivery_fee || 5.00;
      setDeliveryFee(fee);
    }

    // Calculate service fee (platform fee)
    const platformFeeRate = 0.025; // 2.5% platform fee
    setServiceFee(subtotal * platformFeeRate);
  };

  const calculateOrderTotal = () => {
    const newTotal = subtotal + taxAmount + deliveryFee + serviceFee;
    setTotal(newTotal);
  };

  const handleAddAddress = async () => {
    if (!newAddress.street || !newAddress.city || !newAddress.state) {
      Alert.alert('Missing Information', 'Please fill in all address fields');
      return;
    }

    const address = {
      id: Date.now().toString(),
      ...newAddress,
      isDefault: savedAddresses.length === 0,
      label: savedAddresses.length === 0 ? 'Home' : `Address ${savedAddresses.length + 1}`,
    };

    const updatedAddresses = [...savedAddresses, address];
    setSavedAddresses(updatedAddresses);
    setSelectedAddress(address);
    setShowAddressForm(false);

    // Save to AsyncStorage for offline access
    await AsyncStorage.setItem('savedAddresses', JSON.stringify(updatedAddresses));

    // Try to save to consumer profile on backend
    try {
      await api.patch('/marketplace/consumer/profile/', {
        delivery_addresses: updatedAddresses,
        default_delivery_address: address.isDefault ?
          `${address.street}, ${address.city}, ${address.state} ${address.postalCode}` : undefined
      });
      console.log('Address saved to profile');
    } catch (error) {
      console.log('Could not save address to profile, will retry later:', error.message);
      // Address is still saved locally and will work for checkout
    }

    // Reset form
    setNewAddress({
      label: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    });
  };

  const handlePlaceOrder = async () => {
    // Validation
    if (!acceptTerms) {
      Alert.alert('Terms Required', 'Please accept the terms and conditions');
      return;
    }

    if (deliveryMethod === 'delivery' && !selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address');
      return;
    }

    if (!paymentMethod) {
      Alert.alert('Payment Required', 'Please select a payment method');
      return;
    }

    setPlacingOrder(true);
    try {
      // Prepare order data
      const orderData = {
        items: cartItems.map(item => ({
          product_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          business_id: item.businessId,
        })),
        delivery_type: deliveryMethod,
        delivery_address: deliveryMethod === 'delivery' ? {
          street: selectedAddress.street,
          city: selectedAddress.city,
          state: selectedAddress.state,
          postal_code: selectedAddress.postalCode,
          country: selectedAddress.country,
        } : null,
        payment_method: paymentMethod,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        delivery_fee: deliveryFee,
        service_fee: serviceFee,
        total: total,
        special_instructions: specialInstructions,
      };

      // Create order using correct marketplace endpoint
      const orderResponse = await api.post('/marketplace/orders/', orderData);
      const orderId = orderResponse.data.id;

      // The backend now generates both pickup and delivery PINs
      // Consumer receives delivery PIN to give to courier
      const passcodes = {
        pickupCode: orderResponse.data.pickup_pin,
        deliveryCode: orderResponse.data.delivery_pin,
        consumerPin: orderResponse.data.consumer_delivery_pin, // PIN consumer gives to courier
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };

      // Store passcodes locally
      await orderVerificationApi.storePasscodesLocally(
        orderId,
        passcodes.pickupCode,
        passcodes.deliveryCode,
        passcodes.expiresAt
      );

      // Clear cart
      clearCart();

      // Navigate to order confirmation
      navigation.replace('OrderConfirmation', {
        orderId: orderId,
        orderData: orderResponse.data,
        passcodes: passcodes,
      });

    } catch (error) {
      console.error('Order placement error:', error);
      Alert.alert(
        'Order Failed',
        error.response?.data?.message || 'Unable to place your order. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const renderDeliveryMethod = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Delivery Method</Text>
      <View style={styles.deliveryOptions}>
        {businessDetails?.delivery_options?.pickup !== false && (
          <TouchableOpacity
            style={[
              styles.deliveryOption,
              deliveryMethod === 'pickup' && styles.selectedOption
            ]}
            onPress={() => {
              setDeliveryMethod('pickup');
              updateDeliveryFee('pickup');
            }}
          >
            <Icon
              name="storefront-outline"
              size={24}
              color={deliveryMethod === 'pickup' ? '#2563eb' : '#6b7280'}
            />
            <Text style={[
              styles.optionText,
              deliveryMethod === 'pickup' && styles.selectedOptionText
            ]}>
              Pickup
            </Text>
            <Text style={styles.optionSubtext}>Ready in 15-30 min</Text>
          </TouchableOpacity>
        )}

        {businessDetails?.delivery_options?.delivery !== false && (
          <TouchableOpacity
            style={[
              styles.deliveryOption,
              deliveryMethod === 'delivery' && styles.selectedOption
            ]}
            onPress={() => {
              setDeliveryMethod('delivery');
              updateDeliveryFee('delivery');
            }}
          >
            <Icon
              name="bicycle-outline"
              size={24}
              color={deliveryMethod === 'delivery' ? '#2563eb' : '#6b7280'}
            />
            <Text style={[
              styles.optionText,
              deliveryMethod === 'delivery' && styles.selectedOptionText
            ]}>
              Delivery
            </Text>
            <Text style={styles.optionSubtext}>30-45 min</Text>
          </TouchableOpacity>
        )}
      </View>

      {deliveryMethod === 'pickup' && businessDetails && (
        <View style={styles.pickupInfo}>
          <Icon name="location-outline" size={20} color="#6b7280" />
          <View style={styles.pickupAddress}>
            <Text style={styles.pickupBusinessName}>{businessDetails.business_name}</Text>
            <Text style={styles.pickupAddressText}>
              {businessDetails.address || `${businessDetails.city}, ${businessDetails.country}`}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderAddressSection = () => {
    if (deliveryMethod !== 'delivery') return null;

    const handleMapPicker = () => {
      navigation.navigate('AddressMapPicker', {
        initialLocation: selectedAddress ? {
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
        } : null,
        onLocationSelected: (location) => {
          // Create address from map selection
          const mapAddress = {
            id: Date.now().toString(),
            street: location.address || 'Pin Location',
            city: location.city || 'Juba',
            state: location.state || 'CE',
            postalCode: location.postalCode || '',
            country: location.country || 'SS',
            latitude: location.latitude,
            longitude: location.longitude,
            label: 'Map Pin',
            isMapPin: true,
          };

          // Add to addresses and select it
          const updatedAddresses = [...savedAddresses, mapAddress];
          setSavedAddresses(updatedAddresses);
          setSelectedAddress(mapAddress);

          // Save to storage
          AsyncStorage.setItem('savedAddresses', JSON.stringify(updatedAddresses));
        }
      });
    };

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressActions}>
            <TouchableOpacity onPress={handleMapPicker} style={styles.mapButton}>
              <Icon name="map-outline" size={16} color="#2563eb" />
              <Text style={styles.mapButtonText}>Map Pin</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddressForm(true)}>
              <Text style={styles.addNewText}>Add New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {savedAddresses.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {savedAddresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={[
                  styles.addressCard,
                  selectedAddress?.id === address.id && styles.selectedCard
                ]}
                onPress={() => setSelectedAddress(address)}
              >
                <View style={styles.addressCardHeader}>
                  <Icon
                    name={address.isMapPin ? "pin" : selectedAddress?.id === address.id ? "checkmark-circle" : "location-outline"}
                    size={20}
                    color={selectedAddress?.id === address.id ? "#2563eb" : "#6b7280"}
                  />
                  {address.label && (
                    <Text style={styles.addressLabel}>{address.label}</Text>
                  )}
                </View>
                <Text style={styles.addressStreet}>{address.street || address.address}</Text>
                <Text style={styles.addressCity}>
                  {address.city}, {address.state} {address.postalCode}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyAddressContainer}>
            <TouchableOpacity
              style={styles.emptyAddressCard}
              onPress={() => setShowAddressForm(true)}
            >
              <Icon name="add-circle-outline" size={24} color="#2563eb" />
              <Text style={styles.addAddressText}>Add Delivery Address</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.emptyAddressCard}
              onPress={handleMapPicker}
            >
              <Icon name="pin-outline" size={24} color="#2563eb" />
              <Text style={styles.addAddressText}>Drop Pin on Map</Text>
            </TouchableOpacity>
          </View>
        )}

        {showAddressForm && (
          <View style={styles.addressForm}>
            <View style={styles.addressFormHeader}>
              <Text style={styles.addressFormTitle}>Enter Address Manually</Text>
              <TouchableOpacity onPress={handleMapPicker}>
                <Text style={styles.useMapText}>Use Map Instead</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Label (e.g., Home, Office)"
              value={newAddress.label}
              onChangeText={(text) => setNewAddress({...newAddress, label: text})}
            />
            <TextInput
              style={styles.input}
              placeholder="Street Address"
              value={newAddress.street}
              onChangeText={(text) => setNewAddress({...newAddress, street: text})}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="City"
                value={newAddress.city}
                onChangeText={(text) => setNewAddress({...newAddress, city: text})}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="State/Province"
                value={newAddress.state}
                onChangeText={(text) => setNewAddress({...newAddress, state: text})}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="ZIP/Postal Code"
                value={newAddress.postalCode}
                onChangeText={(text) => setNewAddress({...newAddress, postalCode: text})}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Country Code"
                value={newAddress.country}
                onChangeText={(text) => setNewAddress({...newAddress, country: text})}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddressForm(false);
                  setNewAddress({
                    street: '',
                    city: '',
                    state: '',
                    postalCode: '',
                    country: 'US',
                    label: '',
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddAddress}
              >
                <Text style={styles.saveButtonText}>Save Address</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Link to manage addresses in Me section */}
        <TouchableOpacity
          style={styles.manageAddressesLink}
          onPress={() => navigation.navigate('DeliveryAddresses')}
        >
          <Icon name="settings-outline" size={16} color="#6b7280" />
          <Text style={styles.manageAddressesText}>
            Manage all addresses in Me → Delivery Addresses
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPaymentMethod = () => {
    // Determine available payment methods based on user location
    const userCountry = user?.country || businessDetails?.country || 'US';

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentOptions}>
          {/* Credit/Debit Card - Available everywhere */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'card' && styles.selectedOption
            ]}
            onPress={() => setPaymentMethod('card')}
          >
            <Icon
              name="card-outline"
              size={24}
              color={paymentMethod === 'card' ? '#2563eb' : '#6b7280'}
            />
            <Text style={[
              styles.optionText,
              paymentMethod === 'card' && styles.selectedOptionText
            ]}>
              Credit/Debit Card
            </Text>
            <Text style={styles.paymentSubtext}>Visa, Mastercard, Amex</Text>
          </TouchableOpacity>

          {/* MTN Mobile Money - Available in multiple African countries */}
          {['UG', 'GH', 'ZA', 'NG', 'CM', 'CI', 'ZM', 'RW', 'SS'].includes(userCountry) && (
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'mtn' && styles.selectedOption
              ]}
              onPress={() => setPaymentMethod('mtn')}
            >
              <View style={[styles.mtnIcon, paymentMethod === 'mtn' && styles.mtnIconSelected]}>
                <Text style={[styles.mtnIconText, paymentMethod === 'mtn' && styles.mtnIconTextSelected]}>
                  MTN
                </Text>
              </View>
              <View style={styles.paymentTextContainer}>
                <Text style={[
                  styles.optionText,
                  paymentMethod === 'mtn' && styles.selectedOptionText
                ]}>
                  MTN Mobile Money
                </Text>
                <Text style={styles.paymentSubtext}>Pay with MoMo</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* M-Pesa - Available in Kenya and other East African countries */}
          {['KE', 'TZ', 'UG', 'RW', 'ET', 'CD', 'MZ', 'EG', 'LS', 'GH'].includes(userCountry) && (
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'mpesa' && styles.selectedOption
              ]}
              onPress={() => setPaymentMethod('mpesa')}
            >
              <View style={[styles.mpesaIcon, paymentMethod === 'mpesa' && styles.mpesaIconSelected]}>
                <Text style={[styles.mpesaIconText, paymentMethod === 'mpesa' && styles.mpesaIconTextSelected]}>
                  M
                </Text>
              </View>
              <View style={styles.paymentTextContainer}>
                <Text style={[
                  styles.optionText,
                  paymentMethod === 'mpesa' && styles.selectedOptionText
                ]}>
                  M-Pesa
                </Text>
                <Text style={styles.paymentSubtext}>Safaricom Mobile Money</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Note: Cash on Delivery removed to prevent fraud */}
        </View>

        {/* Payment security note */}
        <View style={styles.securityNote}>
          <Icon name="shield-checkmark-outline" size={16} color="#059669" />
          <Text style={styles.securityNoteText}>
            All payments are secure and encrypted
          </Text>
        </View>
      </View>
    );
  };

  const renderOrderSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      <View style={styles.summaryCard}>
        {/* Items list */}
        {cartItems.map((item, index) => (
          <View key={`${item.businessId}-${item.id}`} style={styles.summaryItem}>
            <View style={styles.itemDetails}>
              <Text style={styles.itemQuantity}>{item.quantity}x</Text>
              <Text style={styles.itemName}>{item.name}</Text>
            </View>
            <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Subtotal */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
        </View>

        {/* Tax */}
        <View style={styles.summaryRow}>
          <View style={styles.taxLabelContainer}>
            <Text style={styles.summaryLabel}>Sales Tax</Text>
            {calculatingTax ? (
              <ActivityIndicator size="small" color="#2563eb" style={styles.taxLoader} />
            ) : (
              <Text style={styles.taxJurisdiction}>
                ({(taxRate * 100).toFixed(1)}% - {taxJurisdiction})
              </Text>
            )}
          </View>
          <Text style={styles.summaryValue}>
            {calculatingTax ? '...' : `$${taxAmount.toFixed(2)}`}
          </Text>
        </View>

        {/* Delivery Fee */}
        {deliveryMethod === 'delivery' && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
          </View>
        )}

        {/* Service Fee */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service Fee</Text>
          <Text style={styles.summaryValue}>${serviceFee.toFixed(2)}</Text>
        </View>

        <View style={styles.divider} />

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  const renderSpecialInstructions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Special Instructions (Optional)</Text>
      <TextInput
        style={styles.instructionsInput}
        placeholder="Add any special requests or delivery instructions..."
        value={specialInstructions}
        onChangeText={setSpecialInstructions}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
    </View>
  );

  const renderTermsAndConditions = () => (
    <View style={styles.termsContainer}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setAcceptTerms(!acceptTerms)}
      >
        <Icon
          name={acceptTerms ? "checkbox" : "square-outline"}
          size={24}
          color={acceptTerms ? "#2563eb" : "#6b7280"}
        />
        <Text style={styles.termsText}>
          I agree to the Terms of Service and understand that taxes and fees are included in the total
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Preparing checkout...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerRight}>
          <Icon name="lock-closed" size={20} color="#ffffff" />
          <Text style={styles.secureText}>Secure</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderDeliveryMethod()}
          {renderAddressSection()}
          {renderPaymentMethod()}
          {renderOrderSummary()}
          {renderSpecialInstructions()}
          {renderTermsAndConditions()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalValue}>${total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            (!acceptTerms || placingOrder) && styles.disabledButton
          ]}
          onPress={handlePlaceOrder}
          disabled={!acceptTerms || placingOrder}
        >
          {placingOrder ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Icon name="shield-checkmark" size={20} color="#ffffff" />
              <Text style={styles.placeOrderButtonText}>Place Order</Text>
            </>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#14532d',
    borderBottomWidth: 1,
    borderBottomColor: '#14532d',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secureText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    marginVertical: 8,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  addNewText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  deliveryOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  deliveryOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  selectedOption: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  selectedOptionText: {
    color: '#2563eb',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  pickupInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  pickupAddress: {
    marginLeft: 12,
    flex: 1,
  },
  pickupBusinessName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  pickupAddressText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  mapButtonText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
    marginLeft: 4,
  },
  addressCard: {
    width: 200,
    padding: 16,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  selectedCard: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    marginLeft: 6,
  },
  addressStreet: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  addressCity: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyAddressContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyAddressCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  addAddressText: {
    fontSize: 14,
    color: '#2563eb',
    marginLeft: 8,
    fontWeight: '500',
  },
  addressFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addressFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  useMapText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  manageAddressesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
  },
  manageAddressesText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  addressForm: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  paymentOptions: {
    gap: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  paymentTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  paymentSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  mtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ffcc00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mtnIconSelected: {
    backgroundColor: '#ffaa00',
  },
  mtnIconText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  mtnIconTextSelected: {
    color: '#000000',
  },
  mpesaIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#00a54f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mpesaIconSelected: {
    backgroundColor: '#008c3f',
  },
  mpesaIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  mpesaIconTextSelected: {
    color: '#ffffff',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  securityNoteText: {
    fontSize: 12,
    color: '#059669',
    marginLeft: 6,
  },
  summaryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
    minWidth: 25,
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  taxLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taxJurisdiction: {
    fontSize: 11,
    color: '#9ca3af',
    marginLeft: 6,
  },
  taxLoader: {
    marginLeft: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  instructionsInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  termsContainer: {
    padding: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  termsText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerTotalLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  footerTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeOrderButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  placeOrderButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});