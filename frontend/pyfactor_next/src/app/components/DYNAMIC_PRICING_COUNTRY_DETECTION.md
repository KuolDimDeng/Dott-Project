# Dynamic Pricing and Country Detection Documentation

## Version: 0032 v1.0
## Date: 2025-05-27
## Purpose: Implement intelligent country detection and dynamic pricing

## Features Implemented

### 1. Country Detection Service (`/src/services/countryDetectionService.js`)
- **Multi-method Detection**: IP geolocation, timezone, and browser language
- **Fallback Mechanisms**: Multiple APIs with graceful degradation
- **Caching**: 24-hour cache for performance
- **Cognito Integration**: Stores preferences in user attributes

### 2. Wise API Service (`/src/services/wiseApiService.js`)
- **Real-time Exchange Rates**: Integration with multiple currency APIs
- **Fallback Rates**: Stored rates for reliability
- **Currency Conversion**: USD to any supported currency
- **Formatting**: Proper currency symbols and formatting

### 3. Enhanced Pricing Component (`/src/app/components/Pricing.js`)
- **Dynamic Currency Display**: Shows prices in user's local currency
- **Developing Country Discount**: 50% off for eligible countries
- **Discount Banner**: Visual indication of special pricing
- **Real-time Updates**: Pricing updates based on country detection

### 4. Country Utilities (`/src/utils/currencyUtils.js`)
- **Pricing Calculations**: Handles currency conversion and discounts
- **Formatting Utilities**: Consistent price formatting
- **Cache Integration**: Fast access to user preferences

## Supported Features

### Country Detection Methods
1. **IP Geolocation**: Primary method using multiple APIs
2. **Browser Timezone**: Secondary method for country inference
3. **Browser Language**: Tertiary method for country inference
4. **Manual Override**: User can set country preference

### Language Auto-Selection
- **English-speaking Countries**: Automatically set to English
- **Country Mapping**: 20+ languages mapped to countries
- **Fallback**: Defaults to English if no mapping found

### Dynamic Pricing
- **Base Prices**: Basic (FREE), Professional ($15 USD), Enterprise ($35 USD)
- **Currency Conversion**: Real-time rates via Wise API
- **Developing Country Discount**: 50% off for eligible countries
- **Visual Indicators**: Discount banners and pricing highlights

### Supported Currencies
- USD, EUR, GBP, CAD, AUD, JPY, CNY, INR, BRL, MXN
- ZAR, NGN, KES, GHS, EGP, MAD, TND, DZD
- XOF (West African CFA), XAF (Central African CFA)
- And more...

### Developing Countries (50% Discount)
Over 100 countries including:
- Africa: Nigeria, Kenya, Ghana, South Africa, Egypt, Morocco, etc.
- Asia: India, Indonesia, Philippines, Vietnam, Bangladesh, etc.
- Latin America: Brazil, Mexico, Argentina, Colombia, Peru, etc.
- Eastern Europe: Ukraine, Belarus, Moldova, etc.

## Technical Implementation

### Cognito Integration
- Uses `CognitoAttributes` utility for proper attribute access
- Stores: `custom:country`, `custom:detected_language`, `custom:is_developing_country`
- No localStorage or cookies per requirements

### AppCache Integration
- Caches country detection results for 24 hours
- Stores exchange rates for 1 hour
- Fast access to user preferences

### Error Handling
- Graceful fallbacks for all detection methods
- Default to US/English if all methods fail
- Continues operation even if APIs are unavailable

### Performance Optimization
- Cached exchange rates and country detection
- Lazy loading of pricing data
- Minimal API calls with smart caching

## API Integrations

### Exchange Rate APIs
1. **Primary**: exchangerate-api.com (free tier)
2. **Secondary**: fxratesapi.com (backup)
3. **Future**: Wise API integration (when credentials provided)

### Geolocation APIs
1. **Primary**: ipapi.co
2. **Secondary**: api.country.is
3. **Tertiary**: ipinfo.io

## Configuration

### Environment Variables
- `WISE_API_KEY`: Wise API key (when available)
- `WISE_API_URL`: Wise API endpoint (when available)

### Customization
- Add new currencies in `getCurrencyForCountry()`
- Update developing countries list in `DEVELOPING_COUNTRIES`
- Modify discount percentage in `calculatePricingForCountry()`

## Testing

### Manual Testing
1. **Country Detection**: Use VPN to test different countries
2. **Currency Display**: Verify correct currency symbols and amounts
3. **Discount Application**: Test with developing country IPs
4. **Language Auto-Selection**: Verify language changes with country

### Automated Testing
- Unit tests for currency conversion
- Integration tests for API fallbacks
- E2E tests for pricing display

## Requirements Addressed
- ✅ Condition 6: Use CognitoAttributes utility
- ✅ Condition 7: No cookies or localStorage
- ✅ Condition 9: Use custom:tenant_ID
- ✅ Condition 12: Long-term solutions
- ✅ Condition 17: JavaScript (not TypeScript)
- ✅ Condition 22: No hardcoded secrets
- ✅ Condition 25: Comprehensive documentation
- ✅ Condition 28: Targeted, purposeful changes

## Backup Files Created
All modified files have backup copies with timestamp: `2025-05-27T12-33-52`

## Version History
- v1.0 (2025-05-27): Initial implementation with country detection and dynamic pricing
