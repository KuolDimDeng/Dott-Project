# Currency Selection Feature Documentation

## Overview
The Currency Selection feature allows users to select their preferred display currency for their business. This is a display-only feature - all transactions are still processed in USD.

## Implementation Details

### Location
- **Settings Page**: Settings → Business Tab → Currency Preferences
- **Dashboard Display**: Currency code shown in header (e.g., USD, EUR, KES)

### Features
1. **170 Global Currencies**: Hardcoded list sorted alphabetically by name
2. **Simple Dropdown**: Clean selection interface without external API calls
3. **Confirmation Modal**: Asks user to confirm currency change
4. **Immediate Update**: Dashboard header updates instantly upon confirmation
5. **Database Persistence**: Selection saved to user preferences

### Technical Implementation

#### Components Modified
- `/src/app/Settings/components/sections/CurrencyPreferences.js` - Main component
- `/src/context/CurrencyContext.js` - Global state management
- `/src/app/dashboard/components/CurrencyIndicator.js` - Dashboard display
- `/src/utils/simpleCurrencyUtils.js` - Currency utilities (new file)

#### Key Changes
- Removed all external currency API dependencies (wiseApiService)
- Removed exchange rate features
- Removed diagnostic tools and debug buttons
- Hardcoded currency list for reliability
- No third-party API calls

### User Flow
1. User navigates to Settings → Business tab
2. Finds "Currency Preferences" section
3. Selects currency from dropdown (170 options)
4. Confirmation modal appears: "Change currency from USD to EUR?"
5. User confirms
6. Currency updates immediately in dashboard
7. Selection saved to database

### API Endpoints
- `GET /api/currency/preferences/` - Load current preference
- `PUT /api/currency/preferences/` - Save new preference

### Currency List Sample
```javascript
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'KES', name: 'Kenyan Shilling' },
  // ... 166 more currencies
].sort((a, b) => a.name.localeCompare(b.name));
```

### Important Notes
- This is display currency only
- All payments still processed in USD
- No currency conversion calculations
- Simple, reliable implementation without external dependencies