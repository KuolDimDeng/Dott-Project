# Country Adaptation System - Implementation Guide

## Overview

The Country Adaptation System provides a complete solution for localizing your mobile app based on user location. It adapts payment methods, delivery options, currency display, and other regional preferences while keeping core business features universal.

## Key Features

- ✅ **Payment Method Hierarchy** - Customized by country popularity
- ✅ **Delivery Vehicle Types** - Region-appropriate options (includes Tuk-Tuk for South Sudan)
- ✅ **Currency Formatting** - Local currency symbols and formatting
- ✅ **Country-Specific Configurations** - 7 African countries + extensible
- ✅ **Persistent Settings** - User preferences saved locally
- ✅ **Universal Business Features** - Core features remain consistent

## File Structure

```
src/
├── config/
│   ├── countryConfigurations.js    # Main country config
│   └── posConfigurations.js        # Existing POS config (unchanged)
├── context/
│   └── CountryContext.js           # Country state management
├── components/
│   ├── payment/
│   │   └── PaymentMethodSelector.js # Payment selection UI
│   └── delivery/
│       └── VehicleSelector.js      # Delivery vehicle selection
└── screens/
    └── settings/
        └── CountrySettingsScreen.js # Country settings screen
```

## Quick Start

### 1. Wrap Your App with CountryProvider

Update your main App.js to include the CountryProvider:

```javascript
import { CountryProvider } from './src/context/CountryContext';

export default function App() {
  return (
    <CountryProvider>
      {/* Your existing providers and navigation */}
    </CountryProvider>
  );
}
```

### 2. Use Country-Aware Components

In any component, import and use the country hook:

```javascript
import { useCountry } from '../context/CountryContext';

function MyComponent() {
  const { 
    currentCountry,     // 'SS' for South Sudan
    config,             // Full country configuration
    payments,           // Available payment methods
    vehicles,           // Available delivery vehicles
    formatPrice,        // Format prices with local currency
    changeCountry       // Change country function
  } = useCountry();

  return (
    <View>
      <Text>Current: {config.name}</Text>
      <Text>Price: {formatPrice(25.99)}</Text>
      
      {payments.map(payment => (
        <Text key={payment.id}>{payment.name}</Text>
      ))}
    </View>
  );
}
```

### 3. Currency Formatting

Replace hardcoded currency with country-aware formatting:

```javascript
// Before
<Text>${item.price.toFixed(2)}</Text>

// After
import { useCountry } from '../context/CountryContext';

function ProductCard({ item }) {
  const { formatPrice } = useCountry();
  
  return (
    <Text>{formatPrice(item.price)}</Text>
  );
}
```

### 4. Payment Method Selection

Use the PaymentMethodSelector component:

```javascript
import PaymentMethodSelector from '../components/payment/PaymentMethodSelector';

function CheckoutScreen() {
  const [showPayments, setShowPayments] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  return (
    <View>
      <TouchableOpacity onPress={() => setShowPayments(true)}>
        <Text>Select Payment Method</Text>
      </TouchableOpacity>

      <PaymentMethodSelector
        visible={showPayments}
        onClose={() => setShowPayments(false)}
        onSelectPayment={setSelectedPayment}
        selectedPaymentId={selectedPayment?.id}
      />
    </View>
  );
}
```

### 5. Delivery Vehicle Selection

Use the VehicleSelector component:

```javascript
import VehicleSelector from '../components/delivery/VehicleSelector';

function DeliveryScreen() {
  const [showVehicles, setShowVehicles] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  return (
    <View>
      <TouchableOpacity onPress={() => setShowVehicles(true)}>
        <Text>Select Delivery Method</Text>
      </TouchableOpacity>

      <VehicleSelector
        visible={showVehicles}
        onClose={() => setShowVehicles(false)}
        onSelectVehicle={setSelectedVehicle}
        selectedVehicleId={selectedVehicle?.id}
      />
    </View>
  );
}
```

## Country Configurations

### Supported Countries

- **SS (South Sudan)** - Cash, QR, MTN, Card | motorcycle, bicycle, car, tuktuk
- **KE (Kenya)** - M-Pesa, Cash, Card, Airtel | motorcycle, car, bicycle, van
- **UG (Uganda)** - MTN Money, Cash, Airtel, Card | motorcycle, bicycle, car, van
- **TZ (Tanzania)** - Tigo Cash, M-Pesa, Cash, Card | motorcycle, bicycle, car, van
- **NG (Nigeria)** - Bank Transfer, Card, Cash, MTN | motorcycle, car, bicycle, van, truck
- **GH (Ghana)** - MTN Money, Card, Cash, Airtel | motorcycle, car, bicycle, van
- **RW (Rwanda)** - MTN Money, Cash, Card, Airtel | motorcycle, bicycle, car, van

### Adding New Countries

To add a new country, update `countryConfigurations.js`:

```javascript
export const COUNTRY_CONFIGURATIONS = {
  // ... existing countries
  
  'ET': { // Ethiopia
    name: 'Ethiopia',
    currency: {
      code: 'ETB',
      symbol: 'Br',
      name: 'Ethiopian Birr'
    },
    paymentMethods: [
      PAYMENT_METHODS.CASH,
      PAYMENT_METHODS.CARD,
      PAYMENT_METHODS.MTN_MONEY
    ],
    vehicleTypes: [
      VEHICLE_TYPES.MOTORCYCLE,
      VEHICLE_TYPES.BICYCLE,
      VEHICLE_TYPES.CAR
    ],
    phoneFormat: '+251 XXX XXX XXXX',
    languages: ['am', 'en'],
    primaryLanguage: 'am',
    // ... other configuration
  }
};
```

## Utility Functions

### Check Payment Availability

```javascript
const { isPaymentAvailable, getPaymentById } = useCountry();

if (isPaymentAvailable('mpesa')) {
  const mpesa = getPaymentById('mpesa');
  console.log(`M-Pesa available: ${mpesa.name}`);
}
```

### Check Vehicle Availability

```javascript
const { isVehicleAvailable, getVehicleById } = useCountry();

if (isVehicleAvailable('tuktuk')) {
  const tuktuk = getVehicleById('tuktuk');
  console.log(`Tuk-Tuk available: ${tuktuk.name}`);
}
```

### Get Primary Payment Method

```javascript
const { getPrimaryPayment } = useCountry();
const primary = getPrimaryPayment();
console.log(`Primary payment: ${primary.name}`);
```

## Navigation Integration

Add the country settings screen to your navigation stack:

```javascript
// In your navigation stack
import CountrySettingsScreen from '../screens/settings/CountrySettingsScreen';

<Stack.Screen 
  name="CountrySettings" 
  component={CountrySettingsScreen}
  options={{ title: 'Country Settings' }}
/>
```

## Best Practices

### 1. Universal vs Country-Specific

**Keep Universal:**
- Business categories (Food, Shopping, Transport, etc.)
- Core POS features
- Menu structures
- Business tools and reports

**Make Country-Specific:**
- Payment method order and availability
- Delivery vehicle types
- Currency symbols and formatting
- Phone number formats
- Address requirements

### 2. Performance

The CountryContext automatically loads and caches country preferences. Changes are persisted using AsyncStorage.

### 3. Error Handling

Always provide fallbacks for unsupported countries:

```javascript
const { config, isPaymentAvailable } = useCountry();

// Fallback to cash if preferred payment unavailable
const paymentMethod = isPaymentAvailable('mpesa') 
  ? getPaymentById('mpesa')
  : getPaymentById('cash');
```

### 4. Testing

Test with different country configurations:

```javascript
// For testing, manually change country
const { changeCountry } = useCountry();

// Test South Sudan (tuktuk available)
await changeCountry('SS');

// Test Kenya (M-Pesa first)
await changeCountry('KE');
```

## Migration from Existing Code

### 1. Replace Hardcoded Currency

```javascript
// Before
const formatPrice = (price) => `$${price.toFixed(2)}`;

// After
const { formatPrice } = useCountry();
// formatPrice automatically uses local currency
```

### 2. Replace Static Payment Lists

```javascript
// Before
const paymentMethods = ['Cash', 'Card', 'Mobile Money'];

// After
const { payments } = useCountry();
// payments array is automatically ordered by country preference
```

### 3. Update Delivery Options

```javascript
// Before
const deliveryOptions = ['Motorcycle', 'Car', 'Bicycle'];

// After
const { vehicles } = useCountry();
// vehicles array includes country-specific options like tuktuk
```

## Implementation Status

✅ **Completed:**
- Country configuration system with 7 African countries
- Payment method hierarchy with South Sudan priority: Cash, QR, MTN, Card
- Delivery vehicle types including tuktuk for South Sudan
- Currency formatting with local symbols
- React context for state management
- UI components for payment and vehicle selection
- Country settings screen with live preview
- Persistent user preferences

⏳ **Next Steps:**
- Test integration with existing screens
- Add language localization
- Implement backend synchronization
- Add more countries as needed

## Support

The system is designed to be:
- **Extensible** - Easy to add new countries
- **Maintainable** - Clean separation of concerns
- **Performant** - Minimal re-renders and caching
- **User-Friendly** - Intuitive country switching

For questions or issues, refer to the configuration files and context implementation.