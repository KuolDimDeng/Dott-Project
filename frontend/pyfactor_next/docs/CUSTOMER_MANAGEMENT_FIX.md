# Customer Management Fix Documentation

## Issue Summary
Customer creation was failing with "No session found. Please log in again." error when clicking the create customer button.

## Root Cause
The `djangoApiClient.js` was attempting to access `document.cookie` during server-side rendering (SSR), which is not available in Node.js environment.

## Fix Applied

### Updated: `/src/utils/djangoApiClient.js`
```javascript
getSessionToken() {
  // Check if we're in the browser
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    // Server-side rendering - return null instead of throwing error
    return null;
  }
  
  // Browser environment - read from cookies
  const sessionToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('sid=') || row.startsWith('session_token='))
    ?.split('=')[1];
  
  // Rest of the method...
}
```

## Key Changes
1. Added environment detection to check if code is running in browser vs server
2. Returns `null` during SSR instead of trying to access `document.cookie`
3. Prevents the "document is not defined" error during server-side rendering

## Result
- ✅ Customer creation button now works properly
- ✅ No more "No session found" errors when clicking create
- ✅ Proper session token handling in both client and server contexts
- ✅ Compatible with Next.js SSR architecture

## Testing
The fix has been tested and confirmed to:
1. Properly detect server vs client environment
2. Handle session tokens appropriately in each context
3. Allow customer creation to work as expected

## Technical Details
- **Server-side**: Returns null, letting Next.js handle hydration
- **Client-side**: Reads session token from cookies normally
- **API calls**: Work correctly once page is hydrated in browser

The customer management feature should now work without any session-related errors.