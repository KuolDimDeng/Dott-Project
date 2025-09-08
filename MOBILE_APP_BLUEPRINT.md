# Dott Mobile App Complete Blueprint
*Last Updated: January 2025*
*Platform: React Native 0.81.1 + Django REST Framework*

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Frontend Setup](#frontend-setup)
5. [Backend Integration](#backend-integration)
6. [Key Features Implementation](#key-features-implementation)
7. [Authentication & Security](#authentication--security)
8. [Business Logic](#business-logic)
9. [Currency & Localization](#currency--localization)
10. [Deployment & Environment](#deployment--environment)
11. [Development Workflow](#development-workflow)
12. [Troubleshooting Guide](#troubleshooting-guide)

---

## 1. Project Overview

### Application Details
- **App Name**: DottAppNative
- **Bundle ID**: com.dottappnative
- **Target Markets**: Africa (primary focus: South Sudan, Kenya, Nigeria)
- **Business Types**: Restaurants, Retail, Services, Mixed
- **Primary Features**: POS, Menu Management, Staff Management, Transactions, Marketplace

### Key Business Requirements
- Multi-currency support (170+ currencies)
- Offline-first architecture with sync capabilities
- Restaurant-specific features (menu, POS, staff)
- Mobile money integration (M-Pesa, MTN MoMo)
- Dual-mode operation (Consumer/Business)

---

## 2. Technology Stack

### Frontend (Mobile)
```json
{
  "react-native": "0.81.1",
  "react": "19.1.0",
  "typescript": "5.0.4",
  "navigation": "@react-navigation/native ^6.1.7",
  "state-management": "React Context API",
  "storage": "@react-native-async-storage/async-storage",
  "ui-components": "react-native-vector-icons",
  "animations": "React Native Animated API",
  "image-handling": "react-native-image-picker, @bam.tech/react-native-image-resizer"
}
```

### Backend (API)
```python
{
  "framework": "Django 4.2",
  "api": "Django REST Framework",
  "database": "PostgreSQL with Row-Level Security",
  "authentication": "Auth0 + Custom Session Management",
  "cache": "Redis (optional)",
  "deployment": "Render.com (staging + production)"
}
```

### Third-Party Services
- **Auth0**: Authentication (dev-cbyy63jovi6zrcos.us.auth0.com)
- **Stripe**: Payment processing with Connect
- **Twilio**: SMS notifications
- **Resend**: Email service
- **WhatsApp Business API**: Customer communication
- **Google Maps**: Geolocation services

---

## 3. Project Structure

### Frontend Structure
```
/mobile/DottAppNative/
├── App.tsx                          # Root component with providers
├── index.js                         # Entry point
├── package.json                     # Dependencies
├── ios/                            # iOS specific files
├── android/                        # Android specific files
└── src/
    ├── context/                    # State management
    │   ├── AuthContext.js         # Authentication state
    │   ├── BusinessContext.js     # Business data & menu items
    │   ├── MenuContext.js         # Restaurant menu management
    │   ├── CurrencyContext.js     # Currency preferences
    │   └── CartContext.js         # Shopping cart state
    ├── navigation/
    │   ├── MainNavigator.js       # Main app navigation
    │   └── AuthNavigator.js       # Auth flow navigation
    ├── screens/
    │   ├── business/              # Business mode screens
    │   │   ├── POSScreen.js       # Point of Sale
    │   │   ├── MenuManagementScreen.js
    │   │   ├── EmployeesScreen.js # Staff management
    │   │   ├── TransactionsScreen.js
    │   │   ├── ReceiptScreen.js
    │   │   └── TransactionDetailScreen.js
    │   ├── consumer/              # Consumer mode screens
    │   │   └── BusinessRegistrationScreen.js
    │   ├── MarketplaceScreen.js
    │   ├── BusinessMenuScreen.js  # Main business dashboard
    │   └── AccountScreen.js
    ├── components/
    │   ├── AddMenuItemModal.js    # Menu item creation
    │   └── SyncStatusIndicator.js # Sync status display
    ├── services/
    │   ├── api.js                 # Base API configuration
    │   ├── authApi.js            # Authentication endpoints
    │   ├── marketplaceApi.js     # Marketplace endpoints
    │   ├── menuApi.js            # Menu management
    │   └── businessDataApi.js    # Business operations
    └── utils/
        ├── businessTypeConfig.js  # Business type mappings
        └── categoryHierarchy.js   # Category definitions
```

### Backend Key Endpoints
```
/api/
├── auth/
│   ├── session-v2/               # Session management
│   └── users/me/                 # User profile with currency
├── menu/
│   └── items/                    # Menu CRUD operations
├── pos/
│   └── transactions/             # POS sales
├── sales/
│   ├── invoices/                # Invoice management
│   └── customers/               # Customer records
├── finance/
│   └── transactions/            # Financial transactions
├── marketplace/
│   ├── consumer/businesses/     # Business listings
│   └── business/status/         # Business status
├── users/
│   ├── me/                      # User profile
│   └── business-features/       # Feature flags
└── receipts/
    ├── generate-pdf/            # PDF generation
    ├── send-email/              # Email sending
    └── send-sms/                # SMS sending
```

---

## 4. Frontend Setup

### Initial Setup Commands
```bash
# Clone repository
git clone [repository-url]
cd projectx/mobile/DottAppNative

# Install dependencies
npm install
# or
yarn install

# iOS setup
cd ios && pod install && cd ..

# Run development server
npx react-native start --reset-cache

# Run on iOS
npx react-native run-ios

# Run on Android
npx react-native run-android
```

### Environment Configuration
```javascript
// src/services/api.js
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:8000/api',
  },
  staging: {
    baseURL: 'https://dott-api-staging.onrender.com/api',
  },
  production: {
    baseURL: 'https://api.dottapps.com/api',
  }
};
```

### Key Provider Setup (App.tsx)
```typescript
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BusinessProvider>
          <MenuProvider>
            <CurrencyProvider>
              <CartProvider>
                <AppNavigator />
              </CartProvider>
            </CurrencyProvider>
          </MenuProvider>
        </BusinessProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

---

## 5. Backend Integration

### API Configuration
```javascript
// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'https://dott-api-staging.onrender.com/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
api.interceptors.request.use(async (config) => {
  const sessionId = await AsyncStorage.getItem('sessionId');
  if (sessionId) {
    config.headers.Authorization = `Session ${sessionId}`;
  }
  return config;
});
```

### Session Management
```javascript
// src/context/AuthContext.js
const login = async (email, password) => {
  const response = await api.post('/auth/session-v2/', {
    email,
    password,
  });
  
  const { session_id, user } = response.data;
  await AsyncStorage.setItem('sessionId', session_id);
  setUser(user);
  setIsAuthenticated(true);
};
```

---

## 6. Key Features Implementation

### Restaurant Business Features

#### Menu Management
```javascript
// Business type detection and menu filtering
const isRestaurant = businessData.businessType === 'RESTAURANT_CAFE';

if (isRestaurant) {
  // Filter out non-restaurant items
  const restaurantExcludedItems = [
    'timesheet', 'timesheets', 'expenses', 
    'invoices', 'reports', 'banking'
  ];
  
  // Change "Employees" to "Staff"
  menuItems = menuItems.map(item => {
    if (item.id === 'employees') {
      return { ...item, label: 'Staff', title: 'Staff' };
    }
    return item;
  });
  
  // Add restaurant-specific items
  menuItems.push({
    id: 'menu',
    label: 'Menu',
    icon: 'list-outline',
    screen: 'MenuManagement',
  });
}
```

#### POS System
```javascript
// POS transaction structure
const transactionData = {
  items: cart.map(item => ({
    id: item.id,
    type: 'product',
    quantity: item.quantity,
    unit_price: item.price,
  })),
  currency_code: currency?.code || 'USD',
  currency_symbol: currency?.symbol || '$',
  payment_method: selectedPaymentMethod,
  customer_name: customerName || 'Walk-in Customer',
};

// Complete sale
await api.post('/pos/transactions/complete-sale/', transactionData);
```

#### Staff Management
- Full CRUD operations for staff members
- Status management (active/inactive)
- Role assignments
- Contact information management
- Animated UI with spring animations

### Transaction Management
```javascript
// Load transactions from multiple sources
const loadTransactions = async () => {
  const [financeRes, invoicesRes, paymentsRes] = await Promise.all([
    api.get('/finance/transactions/'),
    api.get('/sales/invoices/'),
    api.get('/payments/transactions/'),
  ]);
  
  // Combine and format all transaction types
  const allTransactions = [
    ...formatFinanceTransactions(financeRes.data),
    ...formatInvoiceTransactions(invoicesRes.data),
    ...formatPaymentTransactions(paymentsRes.data),
  ];
  
  // Sort by date (most recent first)
  allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
};
```

### Receipt Generation & Sending
```javascript
// Receipt generation
const generateReceiptText = () => {
  return `
    ${businessName}
    ${businessAddress}
    Tel: ${businessPhone}
    ${'='.repeat(30)}
    RECEIPT #${transaction.receiptNumber}
    Date: ${formatDate(transaction.date)}
    Customer: ${transaction.customer}
    
    ITEMS:
    ${transaction.items.map(item => 
      `${item.name} - ${item.quantity} x ${currency.symbol}${item.price}`
    ).join('\n')}
    
    TOTAL: ${currency.symbol}${transaction.amount}
    Thank you for your business!
  `;
};

// Send receipt via multiple channels
await api.post('/receipts/send-email/', {
  transaction_id: transaction.id,
  recipient_email: recipient,
  receipt_text: receiptText,
});
```

---

## 7. Authentication & Security

### Auth0 Configuration
```javascript
// Auth0 settings
const auth0Config = {
  domain: 'dev-cbyy63jovi6zrcos.us.auth0.com',
  clientId: '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF',
  scope: 'openid profile email',
};
```

### Session-Based Authentication
- Server-side sessions with Redis/PostgreSQL storage
- Single 'sid' cookie (36 bytes)
- 24-hour session duration
- AES-256-CBC encryption
- Session token in Authorization header: `Session {session_id}`

### Security Features
- Row-Level Security (RLS) in PostgreSQL
- Tenant isolation at database level
- RBAC with OWNER/ADMIN/USER roles
- Rate limiting on sensitive endpoints
- CSP headers without unsafe-inline

---

## 8. Business Logic

### Business Type Configuration
```javascript
// businessTypeConfig.js
const BUSINESS_TYPES = {
  'RESTAURANT_CAFE': {
    label: 'Restaurant & Cafe',
    features: ['menu', 'pos', 'staff', 'tables'],
    excludedMenuItems: ['timesheets', 'invoices', 'banking'],
    terminology: {
      'employees': 'Staff',
      'inventory': 'Stock',
    }
  },
  'RETAIL_STORE': {
    label: 'Retail Store',
    features: ['pos', 'inventory', 'customers'],
  },
  // ... other business types
};
```

### Dynamic Menu Items
```javascript
// All business types get these core items
const coreMenuItems = [
  { id: 'pos', label: 'POS Terminal', screen: 'POSScreen' },
  { id: 'transactions', label: 'Transactions', screen: 'Transactions' },
  { id: 'advertise', label: 'Advertise', screen: 'MarketplaceSettings' },
];

// Business-specific items added based on type
if (isRestaurant) {
  menuItems.push({ id: 'menu', label: 'Menu', screen: 'MenuManagement' });
}
```

### Offline Support & Sync
```javascript
// MenuContext sync logic
const loadMenuItems = async () => {
  try {
    // Try backend first
    const response = await menuApi.getMenuItems();
    if (response?.results) {
      setMenuItems(response.results);
      await AsyncStorage.setItem('restaurantMenuItems', JSON.stringify(response.results));
      setSyncStatus('synced');
    }
  } catch (error) {
    // Fallback to cached data
    const cached = await AsyncStorage.getItem('restaurantMenuItems');
    if (cached) {
      setMenuItems(JSON.parse(cached));
      setSyncStatus('offline');
    }
  }
};

// Retry failed syncs
const retrySyncFailedItems = async () => {
  for (const item of failedSyncs) {
    try {
      const backendItem = await menuApi.createMenuItem(item);
      // Update local state with synced item
      setMenuItems(prev => prev.map(i => 
        i.id === item.id ? { ...backendItem, synced: true } : i
      ));
      setFailedSyncs(prev => prev.filter(i => i.id !== item.id));
    } catch (error) {
      console.log('Retry failed, will try again later');
    }
  }
};
```

---

## 9. Currency & Localization

### Currency Context Implementation
```javascript
// CurrencyContext.js
const loadCurrency = async () => {
  try {
    // Load from cache first
    const cached = await AsyncStorage.getItem('user_currency');
    if (cached) {
      setCurrency(JSON.parse(cached));
    }
    
    // Fetch latest from API
    const response = await api.get('/users/me/');
    const newCurrency = {
      code: response.data.preferred_currency_code || 'USD',
      name: response.data.preferred_currency_name || 'US Dollar',
      symbol: response.data.preferred_currency_symbol || '$'
    };
    
    setCurrency(newCurrency);
    await AsyncStorage.setItem('user_currency', JSON.stringify(newCurrency));
  } catch (error) {
    // Keep cached or default currency
  }
};
```

### Backend Currency Support
```python
# users/models.py
class UserProfile(models.Model):
    preferred_currency_code = models.CharField(max_length=3, default='USD')
    preferred_currency_name = models.CharField(max_length=100, default='US Dollar')
    preferred_currency_symbol = models.CharField(max_length=10, default='$')
    
    def set_currency_by_country(self):
        """Auto-set currency based on country"""
        if self.country == 'SS':  # South Sudan
            self.preferred_currency_code = 'SSP'
            self.preferred_currency_name = 'South Sudanese Pound'
            self.preferred_currency_symbol = 'SSP'
```

### Currency Display
```javascript
// In any component
const { currency } = useCurrency();
const formatAmount = (amount) => {
  return `${currency.symbol}${amount.toFixed(2)}`;
};
```

---

## 10. Deployment & Environment

### Environment URLs
```javascript
const ENVIRONMENTS = {
  development: {
    api: 'http://localhost:8000/api',
    websocket: 'ws://localhost:8000/ws',
  },
  staging: {
    api: 'https://dott-api-staging.onrender.com/api',
    websocket: 'wss://dott-api-staging.onrender.com/ws',
  },
  production: {
    api: 'https://api.dottapps.com/api',
    websocket: 'wss://api.dottapps.com/ws',
  }
};
```

### Build Commands

#### iOS Production Build
```bash
# Clean build
cd ios
rm -rf build/
pod deintegrate
pod install

# Archive and upload
npx react-native run-ios --configuration Release
# Or use Xcode: Product > Archive
```

#### Android Production Build
```bash
cd android
./gradlew clean
./gradlew assembleRelease
# APK at: android/app/build/outputs/apk/release/app-release.apk

# For AAB (Google Play)
./gradlew bundleRelease
# AAB at: android/app/build/outputs/bundle/release/app-release.aab
```

### Backend Deployment (Render)
```yaml
# render.yaml
services:
  - type: web
    name: dott-api-staging
    env: python
    branch: staging
    buildCommand: |
      pip install -r requirements.txt
      python manage.py migrate
      python manage.py collectstatic --noinput
    startCommand: gunicorn pyfactor.wsgi:application
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: dott-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: redis
          property: connectionString
```

---

## 11. Development Workflow

### Git Branch Strategy
```bash
# Branch structure
main          # Production (never commit directly)
├── staging   # Testing environment (all changes go here first)
└── feature/* # Feature branches

# Workflow
git checkout -b feature/new-feature
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Merge to staging
git checkout staging
git merge feature/new-feature
git push origin staging

# After testing, promote to production
git checkout main
git merge staging
git push origin main
```

### Testing Checklist
- [ ] Test on both iOS and Android
- [ ] Test offline functionality
- [ ] Verify currency displays correctly
- [ ] Test all CRUD operations
- [ ] Verify sync after coming online
- [ ] Test receipt generation and sending
- [ ] Verify payment processing
- [ ] Test with different business types

### Code Style Guidelines
```javascript
// Component structure
export default function ComponentName() {
  // 1. Hooks
  const navigation = useNavigation();
  const { businessData } = useBusinessContext();
  
  // 2. State
  const [loading, setLoading] = useState(false);
  
  // 3. Effects
  useEffect(() => {
    loadData();
  }, []);
  
  // 4. Functions
  const loadData = async () => {
    // Implementation
  };
  
  // 5. Render
  return (
    <SafeAreaView style={styles.container}>
      {/* Component JSX */}
    </SafeAreaView>
  );
}

// Styles at bottom
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});
```

---

## 12. Troubleshooting Guide

### Common Issues & Solutions

#### 1. Currency Not Updating
```javascript
// Check API response
console.log('Currency API response:', response.data);

// Verify backend includes fields
// In Auth0UserProfileView.py, ensure:
response_data = {
  'preferred_currency_code': user_profile.preferred_currency_code,
  'preferred_currency_name': user_profile.preferred_currency_name,
  'preferred_currency_symbol': user_profile.preferred_currency_symbol,
}

// Clear cache and reload
await AsyncStorage.removeItem('user_currency');
await loadCurrency();
```

#### 2. Menu Items Not Syncing
```javascript
// Check sync status
console.log('Sync status:', syncStatus);
console.log('Failed syncs:', failedSyncs);

// Manual retry
await retrySyncFailedItems();

// Clear cache and reload
await AsyncStorage.removeItem('restaurantMenuItems');
await loadMenuItems();
```

#### 3. Authentication Issues
```javascript
// Check session
const sessionId = await AsyncStorage.getItem('sessionId');
console.log('Session ID:', sessionId);

// Verify API headers
api.interceptors.request.use(async (config) => {
  console.log('Request headers:', config.headers);
  return config;
});

// Force re-login
await AsyncStorage.clear();
navigation.navigate('Auth');
```

#### 4. Build Errors

**iOS Pod Issues:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod cache clean --all
pod install
```

**Android Build Issues:**
```bash
cd android
./gradlew clean
rm -rf .gradle
cd ..
npx react-native run-android
```

**Metro Bundler Issues:**
```bash
npx react-native start --reset-cache
# Or
watchman watch-del-all
rm -rf node_modules
npm install
```

#### 5. Performance Optimization
```javascript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return <View>{/* Render */}</View>;
});

// Optimize list rendering
<FlatList
  data={items}
  keyExtractor={item => item.id}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
  initialNumToRender={10}
/>

// Debounce search inputs
const debouncedSearch = useCallback(
  debounce((text) => {
    performSearch(text);
  }, 300),
  []
);
```

---

## API Response Formats

### User Profile (/users/me/)
```json
{
  "user": {
    "id": 250,
    "email": "user@example.com",
    "name": "User Name",
    "role": "OWNER",
    "has_business": true
  },
  "tenant": {
    "id": "uuid",
    "name": "Business Name"
  },
  "preferred_currency_code": "SSP",
  "preferred_currency_name": "South Sudanese Pound",
  "preferred_currency_symbol": "SSP",
  "country": "SS",
  "country_name": "South Sudan"
}
```

### Menu Item
```json
{
  "id": "uuid",
  "name": "Item Name",
  "description": "Description",
  "price": 100.00,
  "category": "main_courses",
  "available": true,
  "stock": 50,
  "photo": "url",
  "synced": true
}
```

### POS Transaction
```json
{
  "id": "POS-001",
  "items": [
    {
      "id": "item-1",
      "type": "product",
      "quantity": 2,
      "unit_price": 50.00
    }
  ],
  "total": 100.00,
  "tax_amount": 10.00,
  "subtotal": 90.00,
  "payment_method": "cash",
  "customer_name": "Walk-in Customer",
  "receipt_number": "RCP-001",
  "created_at": "2025-01-30T10:00:00Z"
}
```

---

## Monitoring & Analytics

### Error Tracking
```javascript
// Global error handler
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('Global error:', error);
  // Send to monitoring service
  if (isFatal) {
    // Log fatal errors
  }
});
```

### Performance Monitoring
```javascript
// Track screen load times
const trackScreenLoad = (screenName) => {
  const startTime = Date.now();
  return () => {
    const loadTime = Date.now() - startTime;
    console.log(`${screenName} loaded in ${loadTime}ms`);
  };
};
```

---

## Future Enhancements

### Planned Features
1. **Offline POS Mode**: Complete offline transaction capability
2. **Inventory Management**: Real-time stock tracking
3. **Customer Loyalty**: Points and rewards system
4. **Analytics Dashboard**: Sales reports and insights
5. **Multi-location Support**: Manage multiple branches
6. **Kitchen Display System**: Order management for restaurants
7. **Table Management**: Restaurant seating and reservations
8. **Delivery Integration**: Third-party delivery services

### Technical Improvements
1. **Code Splitting**: Reduce initial bundle size
2. **Image Optimization**: CDN integration
3. **Push Notifications**: FCM/APNS setup
4. **Biometric Authentication**: Face ID/Touch ID
5. **Dark Mode**: System-wide theme support
6. **Accessibility**: VoiceOver/TalkBack support

---

## Support & Resources

### Documentation Links
- React Native: https://reactnative.dev/docs
- Django REST: https://www.django-rest-framework.org/
- Auth0: https://auth0.com/docs
- Stripe: https://stripe.com/docs

### Team Contacts
- Technical Issues: Create issue at github.com/[org]/[repo]/issues
- Backend API: staging.dottapps.com
- Production: app.dottapps.com

### Debug Commands
```bash
# View logs
npx react-native log-ios
npx react-native log-android

# Check dependencies
npm ls

# Reset everything
watchman watch-del-all
rm -rf node_modules ios/Pods
npm install
cd ios && pod install
```

---

## License & Copyright
© 2025 Dott Apps. All rights reserved.

---

*This document serves as the complete blueprint for the Dott Mobile App. Keep it updated with any architectural changes or new feature implementations.*