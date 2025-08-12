# Currency Preferences Data Flow Analysis

## Overview
This document provides a comprehensive analysis of the currency preferences data flow from frontend to backend and the response back to the frontend.

## Issues Identified and Fixed

### 1. Modal Display Delay
**Problem**: The confirmation modal was delayed because it waited for the exchange rate API call to complete.
**Solution**: Show the modal immediately and fetch exchange rate data asynchronously in the background.

### 2. 301 Redirect Issues
**Problem**: Django backend returns 301 redirects for URLs without trailing slashes.
**Solution**: 
- Added trailing slashes to all API endpoint calls
- Created an optimized API route that handles redirects automatically

### 3. 524 Timeout Errors
**Problem**: Cloudflare times out waiting for backend responses due to:
- Complex middleware chain
- Multiple redirect handling
- Slow backend response times

**Solution**: 
- Created optimized API route with 10-second timeout
- Implements fallback to default values on backend failure
- Returns immediate response even if backend is slow

## Data Flow Architecture

### Frontend → Next.js API Route → Django Backend

#### 1. User Selects Currency (Frontend)
```javascript
// CurrencyPreferences.js
handleCurrencyChange(currencyCode) {
  // Show modal immediately for better UX
  setPendingCurrency(selectedCurrency);
  setShowConfirmModal(true);
  
  // Fetch exchange rate in background
  fetch('/api/currency/exchange-rate/', {...})
}
```

#### 2. Next.js API Route (Proxy)
```javascript
// /api/currency/preferences-optimized/route.js
- Handles authentication via session cookies
- Ensures trailing slashes for Django
- Implements timeout (10 seconds)
- Returns defaults on backend failure
- Follows redirects automatically
```

#### 3. Django Backend
```python
# users/api/currency_views.py
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def get_currency_preferences(request):
    # Gets user's business
    # Updates BusinessDetails model
    # Returns currency preferences
```

#### 4. Response Flow Back
```
Django → Next.js API Route → Frontend Component
```

## Performance Optimizations

### 1. Immediate UI Feedback
- Modal shows instantly without waiting for API calls
- Exchange rate loads asynchronously with loading indicator

### 2. Fallback Defaults
- If backend fails, returns sensible USD defaults
- Ensures UI never breaks due to backend issues

### 3. Reduced Timeouts
- Frontend: 30 seconds → 10 seconds
- Prevents long waits for users

### 4. Trailing Slash Handling
- All endpoints now include trailing slashes
- Prevents 301 redirects from Django

## Error Handling Chain

1. **Frontend**: Shows modal immediately, handles exchange rate errors gracefully
2. **Next.js API**: Returns defaults if backend fails, logs errors
3. **Django**: Has cache fallback disabled if Redis unavailable

## Key Files

### Frontend
- `/src/app/Settings/components/sections/CurrencyPreferences.js`
- `/src/app/api/currency/preferences-optimized/route.js`
- `/src/utils/currencyProxyHelper.js`

### Backend
- `/backend/pyfactor/users/api/currency_views.py`
- `/backend/pyfactor/users/api/currency_urls.py`
- `/backend/pyfactor/users/models.py` (BusinessDetails model)

## Monitoring & Debugging

### Frontend Logs
- Look for `[CURRENCY-FRONTEND]` prefixed logs
- Check browser console for detailed flow

### API Route Logs
- Look for `[Currency Optimized]` prefixed logs
- Shows backend URL, response status, timing

### Backend Logs
- Look for `[Currency API]` prefixed logs
- Shows user authentication, business lookup, save operations

## Common Issues & Solutions

### Issue: "Failed to load currency preferences"
**Causes**:
1. Backend service down (503)
2. Authentication failure
3. Redis cache unavailable

**Solutions**:
1. Check backend service health
2. Verify session cookies
3. Backend falls back to no-cache mode

### Issue: Modal takes long to appear
**Cause**: Waiting for exchange rate API
**Solution**: Now shows immediately with async loading

### Issue: Currency change fails silently
**Cause**: Backend timeout or error
**Solution**: Optimized route returns success with local update

## Future Improvements

1. **Client-side caching**: Cache currency list and preferences
2. **Optimistic updates**: Update UI before backend confirms
3. **Background sync**: Retry failed updates in background
4. **WebSocket updates**: Real-time currency rate updates