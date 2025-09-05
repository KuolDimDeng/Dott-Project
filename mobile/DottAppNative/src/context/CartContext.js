import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    loadCart();
  }, []);

  // Save cart to AsyncStorage whenever it changes
  useEffect(() => {
    saveCart();
    updateCartStats();
  }, [cartItems]);

  const loadCart = async () => {
    try {
      const savedCart = await AsyncStorage.getItem('cart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const saveCart = async () => {
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const updateCartStats = () => {
    const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setCartCount(count);
    setCartTotal(total);
  };

  const addToCart = (product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => 
        item.id === product.id && item.businessId === product.businessId
      );

      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id && item.businessId === product.businessId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevItems, { 
          ...product, 
          quantity: 1,
          addedAt: new Date().toISOString()
        }];
      }
    });
  };

  const removeFromCart = (productId, businessId) => {
    setCartItems(prevItems => 
      prevItems.filter(item => !(item.id === productId && item.businessId === businessId))
    );
  };

  const updateQuantity = (productId, businessId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, businessId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === productId && item.businessId === businessId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const clearBusinessCart = (businessId) => {
    setCartItems(prevItems => 
      prevItems.filter(item => item.businessId !== businessId)
    );
  };

  const getBusinessCart = (businessId) => {
    return cartItems.filter(item => item.businessId === businessId);
  };

  const value = {
    cartItems,
    cartCount,
    cartTotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    clearBusinessCart,
    getBusinessCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};