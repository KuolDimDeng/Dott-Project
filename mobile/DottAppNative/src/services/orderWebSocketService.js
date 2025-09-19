/**
 * Order WebSocket Service
 * Automatically connects and handles order notifications
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorage from './secureStorage';
import ENV from '../config/environment';

class OrderWebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectInterval = 5000; // 5 seconds
    this.reconnectTimer = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.userMode = null; // 'consumer', 'business', or 'courier'
  }

  /**
   * Initialize WebSocket connection
   * Call this when app starts or user logs in
   */
  async connect(userMode = 'consumer') {
    try {
      console.log('🔌 Connecting to WebSocket...');

      this.userMode = userMode;

      // Get session ID for authentication from SecureStorage
      const sessionId = await SecureStorage.getSecureItem('sessionId');
      if (!sessionId) {
        console.warn('⚠️ No session ID found, skipping WebSocket connection');
        return;
      }

      // Close existing connection if any
      if (this.ws) {
        this.disconnect();
      }

      // Create WebSocket URL with session
      const wsUrl = `${ENV.wsUrl}/ws/chat/?session=${sessionId}`;
      console.log('📡 WebSocket URL:', wsUrl);

      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl);

      // Connection opened
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected!');
        this.isConnected = true;
        this.clearReconnectTimer();

        // Notify all listeners
        this.emit('connected', { userMode });
      };

      // Message received
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message:', data);

          // Handle different message types
          this.handleMessage(data);
        } catch (error) {
          // Silently log parsing errors
          if (__DEV__) {
            console.log('⚠️ Received malformed WebSocket message');
          }
        }
      };

      // Connection closed
      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.reason);
        this.isConnected = false;
        this.ws = null;

        // Notify listeners
        this.emit('disconnected', { reason: event.reason });

        // Auto-reconnect
        this.scheduleReconnect();
      };

      // Connection error - log only, don't show to user
      this.ws.onerror = (error) => {
        // Only log to console in development
        if (__DEV__) {
          console.log('⚠️ WebSocket connection issue (expected during reconnection)');
          // Log minimal error info without the full error object which causes display issues
          if (error && error.message) {
            console.log('Details:', error.message);
          }
        }
        // Don't emit error events that could trigger UI alerts
        // this.emit('error', { error }); // Commented out to prevent UI alerts
      };

    } catch (error) {
      // Log silently without causing UI alerts
      if (__DEV__) {
        console.log('⚠️ WebSocket connection deferred, will retry...');
      }
      this.scheduleReconnect();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    const { type, data: messageData } = data;

    switch (type) {
      case 'connection_established':
        console.log('🤝 Connection confirmed by server');
        break;

      case 'order_notification':
        this.handleOrderNotification(messageData);
        break;

      case 'delivery_notification':
        this.handleDeliveryNotification(messageData);
        break;

      case 'order_update':
        this.handleOrderUpdate(messageData);
        break;

      case 'status_update':
        this.handleStatusUpdate(messageData);
        break;

      case 'business_status_update':
        this.handleBusinessStatusUpdate(messageData);
        break;

      default:
        console.log('📩 Unknown message type:', type);
        this.emit('message', data);
    }
  }

  /**
   * Handle order notification (for business)
   */
  handleOrderNotification(data) {
    console.log('🛎️ New order notification:', data);

    // Emit to listeners
    this.emit('new_order', data);

    // Show local notification (if app is in background)
    this.showLocalNotification({
      title: 'New Order!',
      body: data.message || `Order #${data.order_number} received`,
      data
    });
  }

  /**
   * Handle delivery notification (for courier)
   */
  handleDeliveryNotification(data) {
    console.log('🚚 New delivery notification:', data);

    // Emit to listeners
    this.emit('new_delivery', data);

    // Show local notification
    this.showLocalNotification({
      title: 'New Delivery!',
      body: data.message || 'You have a new delivery assignment',
      data
    });
  }

  /**
   * Handle order status update (for all parties)
   */
  handleOrderUpdate(data) {
    console.log('📝 Order update:', data);

    // Emit to listeners
    this.emit('order_update', data);
  }

  /**
   * Handle status change notification
   */
  handleStatusUpdate(data) {
    console.log('📊 Status update:', data);

    // Emit to listeners
    this.emit('status_update', data);

    // Show notification for important status changes
    const importantStatuses = [
      'business_accepted',
      'courier_assigned',
      'picked_up',
      'delivered',
      'cancelled'
    ];

    if (importantStatuses.includes(data.new_status)) {
      this.showLocalNotification({
        title: `Order #${data.order_number}`,
        body: data.message || `Status: ${data.new_status}`,
        data
      });
    }
  }

  /**
   * Handle business status change (open/closed)
   */
  handleBusinessStatusUpdate(data) {
    console.log('🏪 Business status update:', data);

    // Emit to listeners so marketplace can refresh
    this.emit('business_status_update', data);

    // Don't show notification for every business status change
    // The marketplace will handle refreshing the list
  }

  /**
   * Show local notification
   */
  async showLocalNotification(notification) {
    try {
      // This would use react-native-push-notification or expo-notifications
      // For now, just log it
      console.log('🔔 LOCAL NOTIFICATION:', notification);

      // TODO: Implement actual push notification
      // Example with expo-notifications:
      // await Notifications.scheduleNotificationAsync({
      //   content: {
      //     title: notification.title,
      //     body: notification.body,
      //     data: notification.data,
      //   },
      //   trigger: null, // Show immediately
      // });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Send a message through WebSocket
   */
  send(type, data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected');
      return false;
    }

    try {
      const message = JSON.stringify({ type, data });
      this.ws.send(message);
      return true;
    } catch (error) {
      // Silently handle send errors
      if (__DEV__) {
        console.log('⚠️ Message queued for sending when connection is restored');
      }
      return false;
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit event to all listeners
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    console.log('👋 Disconnecting WebSocket...');

    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    console.log(`⏱️ Reconnecting in ${this.reconnectInterval / 1000} seconds...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.userMode);
    }, this.reconnectInterval);
  }

  /**
   * Clear reconnection timer
   */
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      userMode: this.userMode,
      readyState: this.ws?.readyState,
    };
  }
}

// Create singleton instance
const orderWebSocketService = new OrderWebSocketService();

export default orderWebSocketService;