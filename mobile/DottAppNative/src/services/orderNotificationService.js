import { Vibration, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

class OrderNotificationService {
  constructor() {
    this.orderCheckInterval = null;
    this.lastOrderIds = new Set();
    this.newOrderCallbacks = [];
    this.unreadOrderCount = 0;
  }

  // Start polling for new orders
  startOrderPolling(businessId, interval = 10000) {
    // Clear any existing interval
    this.stopOrderPolling();
    
    // Initial check
    this.checkForNewOrders(businessId);
    
    // Set up polling interval (every 10 seconds by default)
    this.orderCheckInterval = setInterval(() => {
      this.checkForNewOrders(businessId);
    }, interval);
  }

  stopOrderPolling() {
    if (this.orderCheckInterval) {
      clearInterval(this.orderCheckInterval);
      this.orderCheckInterval = null;
    }
  }

  async checkForNewOrders(businessId) {
    try {
      // Fetch latest orders from API
      const response = await api.get('/business-orders/', {
        params: {
          status: 'pending',
          business_id: businessId,
          limit: 20,
        }
      });
      
      const orders = response.data.results || response.data || [];
      const currentOrderIds = new Set(orders.map(order => order.id));
      
      // Find new orders
      const newOrders = orders.filter(order => !this.lastOrderIds.has(order.id));
      
      // Update unread count
      const unreadOrders = orders.filter(order => !order.viewed_by_business);
      this.unreadOrderCount = unreadOrders.length;
      
      // Notify about new orders
      if (newOrders.length > 0) {
        console.log(`🔔 ${newOrders.length} new orders detected!`);
        
        for (const order of newOrders) {
          this.notifyNewOrder(order);
        }
        
        // Trigger callbacks
        this.notifyCallbacks(newOrders, this.unreadOrderCount);
      }
      
      // Update last order IDs
      this.lastOrderIds = currentOrderIds;
      
      // Store in AsyncStorage for persistence
      await AsyncStorage.setItem('lastOrderIds', JSON.stringify(Array.from(currentOrderIds)));
      
    } catch (error) {
      console.error('Error checking for new orders:', error);
    }
  }

  notifyNewOrder(order) {
    // Vibrate device
    this.vibrateDevice();
    
    // Show alert notification (fallback for push notifications)
    this.showOrderAlert(order);
  }

  vibrateDevice() {
    // Vibrate pattern: [wait, vibrate, wait, vibrate]
    Vibration.vibrate([0, 500, 200, 500]);
  }

  showOrderAlert(order) {
    const title = '🎉 New Order!';
    const message = `Order #${order.id} from ${order.customer_name || 'Customer'}`;
    const total = order.total ? `\nTotal: $${order.total.toFixed(2)}` : '';
    
    Alert.alert(
      title,
      message + total,
      [
        {
          text: 'View Order',
          onPress: () => {
            // This will be handled by the callback
            console.log('View order pressed');
          }
        },
        {
          text: 'Later',
          style: 'cancel'
        }
      ],
      { cancelable: true }
    );
  }

  // Subscribe to new order events
  subscribeToNewOrders(callback) {
    this.newOrderCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.newOrderCallbacks.indexOf(callback);
      if (index > -1) {
        this.newOrderCallbacks.splice(index, 1);
      }
    };
  }

  notifyCallbacks(newOrders, unreadCount) {
    this.newOrderCallbacks.forEach(callback => {
      try {
        callback(newOrders, unreadCount);
      } catch (error) {
        console.error('Error in order notification callback:', error);
      }
    });
  }

  // Mark order as viewed
  async markOrderAsViewed(orderId) {
    try {
      await api.patch(`/business-orders/${orderId}/`, {
        viewed_by_business: true,
      });
      
      // Update unread count
      this.unreadOrderCount = Math.max(0, this.unreadOrderCount - 1);
      
    } catch (error) {
      console.error('Error marking order as viewed:', error);
    }
  }

  // Mark all orders as viewed
  async markAllOrdersAsViewed() {
    try {
      await api.post('/business-orders/mark-all-viewed/');
      
      this.unreadOrderCount = 0;
      
    } catch (error) {
      console.error('Error marking all orders as viewed:', error);
    }
  }

  // Get current unread count
  getUnreadCount() {
    return this.unreadOrderCount;
  }

  // Test notification (for debugging)
  testNotification() {
    const testOrder = {
      id: 'TEST123',
      customer_name: 'Test Customer',
      total: 45.99,
      items: [
        { name: 'Burger', quantity: 2 },
        { name: 'Fries', quantity: 1 },
        { name: 'Coke', quantity: 2 },
      ],
    };
    
    this.notifyNewOrder(testOrder);
  }
}

export default new OrderNotificationService();