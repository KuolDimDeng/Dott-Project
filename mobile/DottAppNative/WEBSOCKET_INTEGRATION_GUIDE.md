# WebSocket Integration Guide for Order Notifications

## 🎯 Quick Setup - How to Connect WebSocket

### **Option 1: AUTOMATIC Connection (Recommended)**

Add this to your main App.js or after user login:

```javascript
// In App.js or AuthContext.js after successful login:
import orderWebSocketService from './src/services/orderWebSocketService';

// For CONSUMER app:
useEffect(() => {
  if (user && isAuthenticated) {
    // Auto-connect WebSocket based on user type
    if (user.is_business) {
      orderWebSocketService.connect('business');
    } else if (user.is_courier) {
      orderWebSocketService.connect('courier');
    } else {
      orderWebSocketService.connect('consumer');
    }
  }

  // Cleanup on logout
  return () => {
    orderWebSocketService.disconnect();
  };
}, [user, isAuthenticated]);
```

### **Option 2: MANUAL Testing (For Development)**

Use these tools to manually test WebSocket connections:

#### A. Browser Console Testing
```javascript
// Open browser console at staging.dottapps.com
const ws = new WebSocket('wss://staging.dottapps.com/ws/chat/?session=YOUR_SESSION_ID');

ws.onopen = () => console.log('Connected!');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Notification:', data);
};
```

#### B. WebSocket Testing Tools
1. **Postman** (Version 10+) - Has WebSocket support
2. **wscat** - Command line tool:
   ```bash
   npm install -g wscat
   wscat -c wss://staging.dottapps.com/ws/chat/
   ```
3. **WebSocket King** - Chrome extension
4. **Simple WebSocket Client** - Chrome extension

---

## 📱 Mobile App Integration

### **For Consumer App (MarketplaceScreen.js)**
```javascript
import orderWebSocketService from '../services/orderWebSocketService';

export default function MarketplaceScreen() {
  useEffect(() => {
    // Listen for order updates
    const unsubscribe = orderWebSocketService.on('order_update', (data) => {
      console.log('Order updated:', data);
      // Update your UI
      if (data.order_id === currentOrder?.id) {
        setOrderStatus(data.status);
      }
    });

    return () => unsubscribe();
  }, []);
}
```

### **For Business Dashboard (RestaurantOrdersScreen.js)**
```javascript
import orderWebSocketService from '../services/orderWebSocketService';

export default function RestaurantOrdersScreen() {
  const [newOrderCount, setNewOrderCount] = useState(0);

  useEffect(() => {
    // Listen for new orders
    const unsubscribe = orderWebSocketService.on('new_order', (data) => {
      console.log('🛎️ NEW ORDER!', data);

      // Show notification
      Alert.alert(
        'New Order!',
        `Order #${data.order_number} - $${data.total_amount}`,
        [
          { text: 'View', onPress: () => loadActiveOrders() }
        ]
      );

      // Update counter
      setNewOrderCount(prev => prev + 1);

      // Refresh orders list
      loadActiveOrders();
    });

    return () => unsubscribe();
  }, []);
}
```

### **For Courier App (CourierDeliveriesScreen.js)**
```javascript
import orderWebSocketService from '../services/orderWebSocketService';

export default function CourierDeliveriesScreen() {
  useEffect(() => {
    // Listen for new delivery assignments
    const unsubscribe = orderWebSocketService.on('new_delivery', (data) => {
      console.log('🚚 NEW DELIVERY!', data);

      // Show notification
      Alert.alert(
        'New Delivery Assignment!',
        `Pickup from ${data.pickup_location.business_name}\nEarnings: $${data.earnings}`,
        [
          { text: 'Accept', onPress: () => acceptDelivery(data.order_id) },
          { text: 'View Details', onPress: () => viewDeliveryDetails(data) }
        ]
      );

      // Refresh deliveries list
      loadDeliveries();
    });

    return () => unsubscribe();
  }, []);
}
```

---

## 🧪 Testing the Connection

### **1. Check Connection Status**
```javascript
// Add this debug button to your screen
<Button
  title="Check WebSocket Status"
  onPress={() => {
    const status = orderWebSocketService.getStatus();
    console.log('WebSocket Status:', status);
    Alert.alert(
      'WebSocket Status',
      `Connected: ${status.isConnected}\nMode: ${status.userMode}`
    );
  }}
/>
```

### **2. Manual Test Message**
```javascript
// Send a test message
orderWebSocketService.send('ping', { test: true });
```

### **3. Monitor in Console**
The service automatically logs all WebSocket activity:
- 🔌 Connection events
- 📨 Incoming messages
- 🛎️ Order notifications
- 🚚 Delivery assignments
- ❌ Errors

---

## 🔍 Debugging

### **Common Issues:**

1. **"WebSocket not connected"**
   - Check if user is logged in
   - Verify session ID exists in AsyncStorage
   - Check network connection

2. **No notifications received**
   - Verify WebSocket is connected
   - Check user type (business/consumer/courier)
   - Ensure backend is sending to correct channel

3. **Connection keeps dropping**
   - Auto-reconnect is built-in (5 second intervals)
   - Check if session is valid
   - Look for server-side errors

### **Debug Commands in React Native Debugger:**
```javascript
// Check if WebSocket is connected
orderWebSocketService.isConnected

// Get current status
orderWebSocketService.getStatus()

// Manually reconnect
orderWebSocketService.connect('consumer')

// Check listeners
orderWebSocketService.listeners
```

---

## 🚀 Quick Test Flow

1. **Consumer places order:**
   ```javascript
   // Order placed via API
   // Business should receive WebSocket notification immediately
   ```

2. **Business accepts order:**
   ```javascript
   // Business accepts via API
   // Consumer and Courier receive notifications
   ```

3. **Monitor all parties:**
   - Consumer sees: "Order accepted!"
   - Business sees: Status update
   - Courier sees: "New delivery assignment!"

---

## 📝 Summary

**Automatic Connection:** The WebSocket service will auto-connect when:
- User logs in
- App comes to foreground
- Network reconnects

**Manual Testing:** Use browser console or WebSocket tools for debugging.

**The connection is AUTOMATIC once integrated into your app!** Just import the service and call `connect()` after login.