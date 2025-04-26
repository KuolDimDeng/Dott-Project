# Stripe Utilities Documentation

## Overview
The `stripeUtils.js` module provides utilities for handling Stripe script loading and initialization in the application. It uses AWS Amplify's cache utility for managing Stripe's loading state.

## Recent Changes (v1.0)
- Moved Stripe loading from script to utility functions
- Added script loading management
- Implemented loading state caching
- Added initialization helpers
- Added error handling

## Functions

### loadStripeScript()
Loads the Stripe script if not already loaded.
- **Returns**: Promise<void>
- **Throws**: Error if loading fails
- **Side Effects**: 
  - Adds script tag to document head
  - Updates cache with loading state

### isStripeLoaded()
Checks if Stripe script is loaded.
- **Returns**: Promise<boolean>
- **Throws**: Error if check fails

### initializeStripe(publicKey)
Initializes Stripe with the provided public key.
- **Parameters**:
  - `publicKey` (string): Stripe public key
- **Returns**: Promise<Stripe>
- **Throws**: Error if initialization fails

### clearStripeCache()
Clears the Stripe loaded state from cache.
- **Returns**: Promise<void>
- **Throws**: Error if clearing fails

## Dependencies
- aws-amplify v6
  - utils: cache
- Stripe.js v3 (loaded dynamically)

## Usage Example
```javascript
import { 
  loadStripeScript, 
  initializeStripe 
} from '@/utils/stripeUtils';

// Load Stripe script
await loadStripeScript();

// Initialize Stripe
const stripe = await initializeStripe('pk_test_your_key');

// Use Stripe instance
const elements = stripe.elements();
```

## Error Handling
All functions include proper error handling and logging. Errors are thrown with descriptive messages to aid in debugging.

## Cache Management
The module uses AWS Amplify's cache utility for storing Stripe's loading state. The cache key is prefixed to avoid conflicts.

## Security Considerations
- Script is loaded from official Stripe CDN
- Public key is required for initialization
- Loading state is cached to prevent redundant loads
- Script loading is async and non-blocking

## Performance Considerations
- Script is loaded asynchronously
- Loading state is cached to prevent redundant loads
- Script is only loaded when needed
- Initialization is deferred until script is loaded

## Browser Compatibility
- Works in all modern browsers
- Falls back gracefully if script loading fails
- Handles browser cache appropriately
- Manages script tag lifecycle 