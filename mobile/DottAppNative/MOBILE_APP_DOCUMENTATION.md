# DottAppNative - React Native Mobile Application
*Version 1.0.0 - January 2025*

## Quick Start Guide

### Prerequisites
- Node.js 18+ and npm/yarn
- Xcode 14+ (for iOS development)
- Android Studio (for Android development)
- CocoaPods (iOS: `sudo gem install cocoapods`)

### Installation
```bash
# Install dependencies
npm install

# iOS specific
cd ios && pod install && cd ..

# Start Metro bundler
npx react-native start --reset-cache

# Run on iOS
npx react-native run-ios

# Run on Android
npx react-native run-android
```

---

## Core Features

### 1. Business Management
- **POS Terminal**: Complete point-of-sale system with multi-payment support
- **Menu Management**: Add/edit/delete menu items with photos and pricing
- **Staff Management**: Employee/staff CRUD operations with status tracking
- **Transaction History**: View all sales, invoices, and payments
- **Receipt System**: Generate, view, and send receipts (Email/SMS/WhatsApp)

### 2. Restaurant-Specific Features
- Custom menu for restaurant businesses
- "Staff" terminology instead of "Employees"
- Hidden features: Timesheets, Expenses, Invoices, Reports, Banking
- Menu item management with categories
- Real-time stock tracking

### 3. Multi-Currency Support
- 170+ currencies supported
- User-preferred currency display
- Automatic country-based currency detection
- South Sudan (SSP), Kenya (KES), Nigeria (NGN) focus

### 4. Offline Capabilities
- Local data caching with AsyncStorage
- Sync queue for failed operations
- Automatic retry on reconnection
- Conflict resolution strategies

---

## Architecture Overview

### State Management
```
App.tsx
  └── AuthProvider (Authentication)
      └── BusinessProvider (Business data)
          └── MenuProvider (Menu items)
              └── CurrencyProvider (Currency settings)
                  └── CartProvider (Shopping cart)
```

### API Integration
- Base URL: `https://dott-api-staging.onrender.com/api`
- Authentication: Session-based with `Session {session_id}` header
- Timeout: 30 seconds
- Retry logic for failed requests

### Navigation Structure
```
MainNavigator
  ├── TabNavigator
  │   ├── Call
  │   ├── Discover (Marketplace)
  │   ├── Purchases
  │   ├── Business (if has_business)
  │   └── Account
  └── StackNavigator (Business Screens)
      ├── POS
      ├── MenuManagement
      ├── Employees/Staff
      ├── Transactions
      ├── TransactionDetail
      ├── Receipt
      └── ... other screens
```

---

## Key Components

### BusinessMenuScreen
- 3-column grid layout
- Dynamic menu based on business type
- Real-time online/offline status
- Reduced header (10% height reduction)
- Business type display under name

### POSScreen
- Product selection from menu
- Cart management
- Multiple payment methods (Cash, Card, Mobile Money)
- Real-time total calculation
- Receipt generation on completion

### TransactionsScreen
- Combined view of all transaction types
- Search and filter functionality
- Transaction type filters (Payments, Refunds, Payouts)
- Direct navigation to receipts
- Pull-to-refresh

### ReceiptScreen
- Professional receipt layout
- Business branding
- Send via Email/SMS/WhatsApp
- Print to PDF
- Share functionality

---

## Context Providers

### AuthContext
```javascript
// Available functions
login(email, password)
logout()
refreshSession()

// State
user: { id, email, name, role, has_business }
isAuthenticated: boolean
isLoading: boolean
sessionId: string
```

### BusinessContext
```javascript
// Functions
getMenuItems() // Returns filtered menu for business type
toggleOnlineStatus()
fetchBusinessFeatures()

// State
businessData: { businessName, businessType, isOnline }
dynamicMenuItems: [] // From API
```

### MenuContext
```javascript
// Functions
addMenuItem(item)
updateMenuItem(id, updates)
deleteMenuItem(id)
toggleItemAvailability(id)
retrySyncFailedItems()

// State
menuItems: []
syncStatus: 'synced' | 'syncing' | 'error' | 'offline'
failedSyncs: []
```

### CurrencyContext
```javascript
// Functions
updateCurrency(newCurrency)
refreshCurrency()
formatAmount(amount)

// State
currency: { code, name, symbol }
isLoading: boolean
```

---

## API Endpoints Used

### Authentication
- `POST /auth/session-v2/` - Login
- `DELETE /auth/session-v2/` - Logout
- `GET /users/me/` - Get user profile with currency

### Menu Management
- `GET /menu/items/` - List menu items
- `POST /menu/items/` - Create menu item
- `PATCH /menu/items/{id}/` - Update item
- `DELETE /menu/items/{id}/` - Delete item

### POS & Transactions
- `POST /pos/transactions/complete-sale/` - Complete POS sale
- `GET /finance/transactions/` - List transactions
- `GET /sales/invoices/` - List invoices
- `GET /payments/transactions/` - List payments

### Receipts
- `POST /receipts/generate-pdf/` - Generate PDF receipt
- `POST /receipts/send-email/` - Send via email
- `POST /receipts/send-sms/` - Send via SMS
- `POST /receipts/send-whatsapp/` - Send via WhatsApp

### Business Features
- `GET /users/business-features/` - Get feature flags
- `GET /marketplace/business/status/` - Business status
- `PATCH /marketplace/business/status/` - Update status

---

## Styling Guidelines

### Color Palette
```javascript
const colors = {
  primary: '#2563eb',      // Blue
  success: '#10b981',      // Green
  warning: '#f59e0b',      // Yellow
  error: '#ef4444',        // Red
  background: '#f8f9fa',   // Light gray
  card: '#ffffff',         // White
  text: '#1a1a1a',        // Dark gray
  textSecondary: '#6b7280' // Medium gray
};
```

### Component Structure
```javascript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
});
```

---

## Error Handling

### Global Error Boundary
```javascript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
    // Log to error tracking service
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorScreen />;
    }
    return this.props.children;
  }
}
```

### API Error Handling
```javascript
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      AsyncStorage.clear();
      navigation.navigate('Auth');
    }
    return Promise.reject(error);
  }
);
```

---

## Performance Optimization

### Image Optimization
```javascript
// Resize images before upload
const resizedImage = await ImageResizer.createResizedImage(
  uri,
  800,  // maxWidth
  800,  // maxHeight
  'JPEG',
  80    // quality
);
```

### List Optimization
```javascript
<FlatList
  data={items}
  keyExtractor={item => item.id}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
  initialNumToRender={10}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

### Memoization
```javascript
const MemoizedComponent = React.memo(Component, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id;
});

const memoizedValue = useMemo(() => 
  expensiveCalculation(data), [data]
);
```

---

## Testing

### Manual Testing Checklist
- [ ] Login/Logout flow
- [ ] Business type detection
- [ ] Menu filtering for restaurants
- [ ] Currency display
- [ ] POS transaction flow
- [ ] Receipt generation
- [ ] Offline mode
- [ ] Sync after reconnection
- [ ] Error states
- [ ] Empty states

### Debug Tools
```javascript
// Enable debug logs
if (__DEV__) {
  console.log('Debug:', data);
}

// React DevTools
// Shake device or Cmd+D (iOS) / Cmd+M (Android)

// Network inspection
XMLHttpRequest = GLOBAL.originalXMLHttpRequest 
  ? GLOBAL.originalXMLHttpRequest 
  : GLOBAL.XMLHttpRequest;
```

---

## Deployment

### iOS Release
1. Update version in `ios/DottAppNative/Info.plist`
2. Set build configuration to Release
3. Archive in Xcode: Product > Archive
4. Upload to App Store Connect

### Android Release
1. Update version in `android/app/build.gradle`
2. Generate signed APK/AAB:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
3. Upload to Google Play Console

### Code Signing
- iOS: Certificates in Xcode
- Android: Keystore file in `android/app/`

---

## Troubleshooting

### Common Issues

**Metro Bundler Issues:**
```bash
npx react-native start --reset-cache
```

**iOS Build Failures:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod cache clean --all
pod install
```

**Android Build Failures:**
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

**State Not Updating:**
- Check Context Provider wrapping
- Verify AsyncStorage keys
- Clear app data and restart

**API Calls Failing:**
- Check network connectivity
- Verify session token
- Check API endpoint URLs
- Review CORS settings

---

## Environment Variables

### Development
```javascript
API_BASE_URL=http://localhost:8000/api
```

### Staging
```javascript
API_BASE_URL=https://dott-api-staging.onrender.com/api
```

### Production
```javascript
API_BASE_URL=https://api.dottapps.com/api
```

---

## Contributing

### Code Style
- Use functional components with hooks
- Implement proper error boundaries
- Add loading states for async operations
- Include empty states for lists
- Comment complex logic
- Use TypeScript for new components

### Git Workflow
```bash
# Feature branch
git checkout -b feature/new-feature
git add .
git commit -m "feat: description"
git push origin feature/new-feature

# Create PR to staging
# After testing, merge to main
```

---

## Resources

- [React Native Docs](https://reactnative.dev/docs)
- [React Navigation](https://reactnavigation.org/docs)
- [Async Storage](https://react-native-async-storage.github.io/async-storage/docs)
- [Vector Icons Directory](https://oblador.github.io/react-native-vector-icons/)

---

*For complete project documentation, see `/MOBILE_APP_BLUEPRINT.md`*