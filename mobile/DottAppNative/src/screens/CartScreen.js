import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useCart } from '../context/CartContext';
import { useNavigation } from '@react-navigation/native';
import orderVerificationApi from '../services/orderVerificationApi';
import api from '../services/api';

export default function CartScreen() {
  const navigation = useNavigation();
  const { 
    cartItems, 
    cartTotal, 
    removeFromCart, 
    updateQuantity, 
    clearCart 
  } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [orderPasscodes, setOrderPasscodes] = useState(null);

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => clearCart()
        }
      ]
    );
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart');
      return;
    }
    
    setLoading(true);
    try {
      // Create order
      const orderData = {
        items: cartItems.map(item => ({
          product_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          business_id: item.businessId,
        })),
        total: cartTotal,
        delivery_type: 'delivery', // or 'pickup'
        delivery_address: 'User selected address', // TODO: Get from address selection
        payment_method: 'card', // TODO: Get from payment selection
      };
      
      const orderResponse = await api.post('/orders/create/', orderData);
      const orderId = orderResponse.data.id;
      
      // Generate passcodes for the order
      const passcodes = await orderVerificationApi.generateOrderPasscodes(orderId);
      
      // Store passcodes locally for offline access
      await orderVerificationApi.storePasscodesLocally(
        orderId,
        passcodes.pickupCode,
        passcodes.deliveryCode,
        passcodes.expiresAt
      );
      
      setOrderPasscodes({
        orderId: orderId,
        pickupCode: passcodes.pickupCode,
        deliveryCode: passcodes.deliveryCode,
        expiresAt: passcodes.expiresAt,
      });
      
      // Show passcode modal
      setShowPasscodeModal(true);
      
      // Clear cart after successful order
      clearCart();
      
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert(
        'Order Failed',
        'Unable to place your order. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPasscodeModal = () => (
    <Modal
      visible={showPasscodeModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPasscodeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.passcodeModal}>
          <View style={styles.modalHeader}>
            <Icon name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.modalTitle}>Order Placed Successfully!</Text>
          </View>
          
          <Text style={styles.modalSubtitle}>
            Save these codes - you'll need them for pickup and delivery
          </Text>
          
          <View style={styles.passcodeContainer}>
            <View style={styles.passcodeBox}>
              <Text style={styles.passcodeLabel}>PICKUP CODE</Text>
              <Text style={styles.passcodeValue}>{orderPasscodes?.pickupCode}</Text>
              <Text style={styles.passcodeHint}>Give this to the business when picking up</Text>
            </View>
            
            <View style={[styles.passcodeBox, styles.deliveryBox]}>
              <Text style={styles.passcodeLabel}>DELIVERY CODE</Text>
              <Text style={styles.passcodeValue}>{orderPasscodes?.deliveryCode}</Text>
              <Text style={styles.passcodeHint}>Give this to the courier when receiving</Text>
            </View>
          </View>
          
          <View style={styles.expiryInfo}>
            <Icon name="time-outline" size={16} color="#ef4444" />
            <Text style={styles.expiryText}>
              Codes expire in 2 hours
            </Text>
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => {
                // TODO: Implement share functionality
                Alert.alert('Share', 'Sharing passcodes...');
              }}
            >
              <Icon name="share-outline" size={20} color="#2563eb" />
              <Text style={styles.shareButtonText}>Share Codes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                setShowPasscodeModal(false);
                navigation.navigate('PurchasesScreen');
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemBusiness}>{item.businessName}</Text>
        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
      </View>
      
      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.businessId, item.quantity - 1)}
        >
          <Icon name="remove-circle-outline" size={24} color="#2563eb" />
        </TouchableOpacity>
        
        <Text style={styles.quantity}>{item.quantity}</Text>
        
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.businessId, item.quantity + 1)}
        >
          <Icon name="add-circle-outline" size={24} color="#2563eb" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => removeFromCart(item.id, item.businessId)}
        >
          <Icon name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const EmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Icon name="cart-outline" size={80} color="#9ca3af" />
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.emptyText}>Add items from the marketplace to get started</Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => navigation.navigate('Discover')}
      >
        <Text style={styles.browseButtonText}>Browse & Discover</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClearCart}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {cartItems.length === 0 ? (
        <EmptyCart />
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => `${item.businessId}-${item.id}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
          
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>${cartTotal.toFixed(2)}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.checkoutButton}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      
      {/* Passcode Modal */}
      {renderPasscodeModal()}
      
      {/* Loading Modal */}
      <Modal
        visible={loading}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Processing your order...</Text>
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
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
  },
  cartItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemInfo: {
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  itemBusiness: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    padding: 4,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  deleteButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  checkoutButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passcodeModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  passcodeContainer: {
    gap: 16,
    marginBottom: 20,
  },
  passcodeBox: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  deliveryBox: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  passcodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  passcodeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 3,
    textAlign: 'center',
    marginVertical: 8,
  },
  passcodeHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 20,
  },
  expiryText: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
});