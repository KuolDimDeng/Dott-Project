# Country Testing Plan - UI Changes

## Overview

This document outlines how to test the country adaptation system you've implemented. You now have country selectors in both Business and Consumer modes that will show completely different UI configurations for each country.

## ✅ What's Been Implemented

### Country Selectors Added:
1. **Consumer Mode (MarketplaceScreen)**: Country selector in the header next to "Discover"
2. **Business Mode (BusinessMenuScreen)**: Country selector in the location row
3. **Both modes include**: South Sudan, Kenya, Uganda, Tanzania, Nigeria, Ghana, Rwanda, USA, UK

### Features to Test:
- Payment method priority changes
- Currency symbol changes  
- Delivery vehicle availability
- UI adaptation by country

## 🧪 Testing Scenarios

### Test 1: South Sudan (Default) 
**Expected UI:**
- **Payments**: Cash → QR → MTN → Card (Cash is #1)
- **Currency**: SSP symbols 
- **Delivery**: Motorcycle, Bicycle, Car, **Tuk-Tuk** (unique to South Sudan)
- **Flag**: 🇸🇸

**Test Steps:**
1. Open Consumer mode → Marketplace screen
2. Tap country selector (should show "South Sudan" with flag)
3. Check payment options in any checkout flow
4. Check delivery options
5. Check price displays (should show SSP)

### Test 2: Kenya Switch
**Expected UI Changes:**
- **Payments**: **M-Pesa** → Cash → Card → Airtel (M-Pesa is #1)
- **Currency**: KSh symbols
- **Delivery**: Motorcycle, Car, Bicycle, Van (NO tuk-tuk)
- **Flag**: 🇰🇪

**Test Steps:**
1. In header, tap country selector → Select "Kenya"
2. Should see instant notification "Country Changed - Switched to Kenya for testing"
3. Check payment methods - M-Pesa should be first
4. Check currency displays - should show KSh 
5. Check delivery options - no tuk-tuk available

### Test 3: USA Switch (Complete UI Change)
**Expected UI Changes:**
- **Payments**: **Card** → Bank Transfer → Cash (Card-first Western model)
- **Currency**: $ symbols  
- **Delivery**: Car, Van, Truck, Bicycle (No motorcycle/tuk-tuk)
- **Flag**: 🇺🇸

**Test Steps:**
1. Select "United States" from dropdown
2. Notice complete payment priority change
3. Currency should switch to $ symbols
4. Delivery should focus on cars/trucks

### Test 4: UK Switch
**Expected UI Changes:**
- **Payments**: Card → Bank Transfer → Cash
- **Currency**: £ symbols
- **Delivery**: Car, Van, Bicycle, Motorcycle
- **Flag**: 🇬🇧

**Test Steps:**
1. Select "United Kingdom" 
2. Currency should show £ symbols
3. Payment methods similar to USA but with slight differences

### Test 5: Business Mode Testing
**Test Both Modes:**
1. Switch to Business mode → BusinessMenuScreen
2. In location row, tap country selector
3. Test same countries as above
4. Verify changes affect business currency displays
5. Check if POS payment options adapt

## 🔍 What to Look For

### Payment Method Changes:
- **African Countries**: Mobile money first (M-Pesa, MTN Money)
- **Western Countries**: Card payments first
- **South Sudan**: Cash first (unique priority)

### Currency Display Changes:
- **South Sudan**: SSP symbols
- **Kenya**: KSh symbols  
- **USA**: $ symbols
- **UK**: £ symbols

### Delivery Options:
- **Tuk-Tuk**: Only available in South Sudan
- **Motorcycle**: Available in African countries, limited in Western
- **Trucks**: More common in USA/larger countries

### UI Elements:
- Flag emojis should change
- Country names should update
- Test mode banner should appear
- Quick notifications on country change

## 🚀 Testing Workflow

### Step-by-Step Testing:

1. **Start with Default (South Sudan)**
   - Verify SSP currency, Cash-first payments, Tuk-tuk delivery

2. **Switch to Kenya**  
   - Verify M-Pesa first, KSh currency, no tuk-tuk

3. **Switch to USA**
   - Verify Card-first, $ currency, Car/truck focus

4. **Switch Back to South Sudan**
   - Verify return to original settings
   - Check that tuk-tuk is back

5. **Test Business Mode**
   - Repeat above tests in Business dashboard
   - Verify location shows country name

6. **Test Integration**
   - Go through checkout flows with different countries
   - Test payment method selection
   - Test delivery vehicle selection

## 🛠 Integration Requirements

### To Fully Enable This System:

1. **Add CountryProvider to App.js:**
```javascript
import { CountryProvider } from './src/context/CountryContext';

export default function App() {
  return (
    <CountryProvider>
      {/* Your existing app */}
    </CountryProvider>
  );
}
```

2. **Update Existing Components:**
   - Replace hardcoded `$` with `formatPrice()` from `useCountry()`
   - Use payment/vehicle selectors from country system
   - Update currency displays throughout app

3. **Test Real Payments:**
   - Verify payment methods work with country priorities
   - Test currency calculations
   - Verify delivery integrations

## 📊 Expected Results Summary

| Country | Primary Payment | Currency | Unique Delivery | Flag |
|---------|----------------|----------|-----------------|------|
| South Sudan | Cash | SSP | Tuk-Tuk | 🇸🇸 |
| Kenya | M-Pesa | KSh | - | 🇰🇪 |
| Uganda | MTN Money | USh | - | 🇺🇬 |
| Tanzania | Tigo Cash | TSh | - | 🇹🇿 |
| Nigeria | Bank Transfer | ₦ | Truck | 🇳🇬 |
| Ghana | MTN Money | GH₵ | - | 🇬🇭 |
| Rwanda | MTN Money | RF | - | 🇷🇼 |
| USA | Card | $ | Truck | 🇺🇸 |
| UK | Card | £ | - | 🇬🇧 |

## 🔧 Production Considerations

### Current Status: Testing Mode
- `testMode={true}` enables instant switching
- Shows testing banners and quick notifications  
- Includes USA/UK for comprehensive testing

### For Production:
- Set `testMode={false}` for confirmation dialogs
- Remove or limit test countries as needed
- Add proper country detection
- Integrate with backend country settings

## 🎯 Success Criteria

✅ **Complete Success When:**
1. Country selector works in both Consumer and Business modes
2. Switching countries immediately updates payment priorities
3. Currency symbols change correctly
4. Delivery options adapt (tuk-tuk appears/disappears)
5. Visual indicators (flags, names) update
6. Payment and delivery selection modals show country-specific options
7. All 9 test countries work correctly
8. Switching back to original country restores settings

This system demonstrates how your app will look and behave when deployed in different countries, giving you a real preview of the user experience across all your target markets!