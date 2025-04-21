# TenantRecoveryWrapper

## Overview
The `TenantRecoveryWrapper` component provides a recovery mechanism for when API calls fail or network connectivity issues occur. It wraps critical parts of the application and ensures continuity of service when network disruptions happen.

## Recent Fixes

### Fixed HTTPS Configuration (2023-07-XX)
The application was failing to run properly with HTTPS, showing only HTTP in the server logs despite HTTPS configuration. This was fixed by:

1. Adding explicit `server` configuration in `next.config.js`
2. Properly configuring the HTTPS certificates
3. Removing invalid `rejectUnauthorized` property that was causing warnings
4. Adding debug logging to verify HTTPS settings are properly applied

### Fixed Infinite Rendering Loop (2023-07-XX)
The component was experiencing a "Maximum update depth exceeded" error due to an infinite rendering loop. This was caused by:

1. The `useEffect` hook using the entire `recovery` object as a dependency
2. The `recovery` object being recreated on each render 
3. The effect then triggering state updates via `setCognitoStatus` which caused re-renders
4. This cycle continued indefinitely, causing the error

**Solution:**
1. Added `useCallback` to memoize the `triggerRecoveryIfNeeded` function
2. Updated the dependency arrays in all `useEffect` hooks to include only stable dependencies
3. Replaced inline recovery triggering code with the memoized function

## Component Logic

### Main Functionalities
- Periodically checks Cognito reliability every 5 seconds
- Listens for network offline/online events to trigger recovery
- Provides debug panel toggled by Ctrl+Shift+D keyboard shortcut
- Shows a banner when recovery mode is active

### Recovery Process
The component works with the `useTenantRecovery` hook to:
1. Detect when Cognito or network connectivity is unreliable
2. Trigger recovery mode by fetching tenant ID from fallback mechanisms
3. Optionally redirect to the recovery dashboard
4. Show visual indicators of recovery status

## Implementation Details

### Dependencies
- `useTenantRecovery`: Hook managing tenant recovery logic
- `isCognitoUnreliable`: Function to check Cognito service reliability
- `logger`: Utility for consistent logging

### State Management
- `showDebug`: Controls visibility of the debug panel
- `cognitoStatus`: Tracks Cognito service reliability 

### Best Practices Implemented
- Uses stable dependency arrays in `useEffect` hooks
- Memoizes callback functions with `useCallback`
- Cleans up event listeners and timeouts in effect cleanup functions
- Server-side rendering safe with `typeof window` checks

## Usage

```jsx
// Basic usage
<TenantRecoveryWrapper>
  <YourComponent />
</TenantRecoveryWrapper>

// With specific tenant ID and debug visibility
<TenantRecoveryWrapper 
  pathTenantId="tenant-uuid"
  showRecoveryState={true}
>
  <YourComponent />
</TenantRecoveryWrapper>
``` 