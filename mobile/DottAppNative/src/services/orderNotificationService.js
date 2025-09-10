import PushNotification from 'react-native-push-notification';
import { Vibration, Platform } from 'react-native';
import Sound from 'react-native-sound';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

class OrderNotificationService {
  constructor() {
    this.notificationSound = null;
    this.orderCheckInterval = null;
    this.lastOrderIds = new Set();
    this.newOrderCallbacks = [];
    this.unreadOrderCount = 0;
    
    // Initialize push notifications
    this.initializePushNotifications();
    
    // Load notification sound
    this.loadNotificationSound();
  }

  initializePushNotifications() {
    PushNotification.configure({
      onNotification: function (notification) {
        console.log('ORDER NOTIFICATION:', notification);
        
        // Handle notification tap
        if (notification.userInteraction) {
          // Navigate to Orders screen when notification is tapped
          // This will be handled by the navigation service
        }
      },
      
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });
    
    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'new-orders',
          channelName: 'New Orders',
          channelDescription: 'Notifications for new customer orders',
          playSound: true,
          soundName: 'order_notification.mp3',
          importance: 5, // High importance
          vibrate: true,
          vibration: [0, 500, 200, 500], // Pattern: wait, vibrate, wait, vibrate
        },
        (created) => console.log(`Order notification channel created: ${created}`)
      );
    }
  }

  loadNotificationSound() {
    // Load custom notification sound
    Sound.setCategory('Playback');
    this.notificationSound = new Sound('order_notification.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Failed to load order notification sound', error);
        // Fallback to system sound
        this.notificationSound = new Sound('ding.mp3', Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.log('Failed to load fallback sound', error);
          }
        });
      }
    });
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
        
        // Update badge count
        this.updateBadgeCount(this.unreadOrderCount);
        
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
    // Play notification sound
    this.playNotificationSound();
    
    // Vibrate device
    this.vibrateDevice();
    
    // Show push notification
    this.showOrderNotification(order);
  }

  playNotificationSound() {
    if (this.notificationSound) {
      this.notificationSound.setVolume(1.0);
      this.notificationSound.play((success) => {
        if (!success) {
          console.log('Sound playback failed');
        }
      });
    }
  }

  vibrateDevice() {
    // Vibrate pattern: [wait, vibrate, wait, vibrate]
    Vibration.vibrate([0, 500, 200, 500]);
  }

  showOrderNotification(order) {
    const title = '🎉 New Order!';
    const message = `Order #${order.id} from ${order.customer_name || 'Customer'}`;
    const subText = order.total ? `Total: $${order.total.toFixed(2)}` : '';
    
    PushNotification.localNotification({
      channelId: 'new-orders',
      title: title,
      message: message,
      subText: subText,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      bigText: `${message}\n${order.items?.map(item => `• ${item.name} x${item.quantity}`).join('\n') || ''}`,
      color: '#10b981',
      vibrate: true,
      vibration: [0, 500, 200, 500],
      playSound: true,
      soundName: Platform.OS === 'android' ? 'order_notification.mp3' : 'default',
      number: this.unreadOrderCount,
      priority: 'high',
      importance: 'high',
      visibility: 'public',
      
      // Custom data
      data: {
        orderId: order.id,
        type: 'new_order',
      },
      
      // Actions (Android)
      actions: ['View Order', 'Dismiss'],
    });
  }

  updateBadgeCount(count) {
    // Update app badge count
    PushNotification.setApplicationIconBadgeNumber(count);
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
      this.updateBadgeCount(this.unreadOrderCount);
      
    } catch (error) {
      console.error('Error marking order as viewed:', error);
    }
  }

  // Mark all orders as viewed
  async markAllOrdersAsViewed() {
    try {
      await api.post('/business-orders/mark-all-viewed/');
      
      this.unreadOrderCount = 0;
      this.updateBadgeCount(0);
      
    } catch (error) {
      console.error('Error marking all orders as viewed:', error);
    }
  }

  // Get current unread count
  getUnreadCount() {
    return this.unreadOrderCount;
  }

  // Clear all notifications
  clearAllNotifications() {
    PushNotification.removeAllDeliveredNotifications();
    this.updateBadgeCount(0);
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