# Onboarding Status Service Implementation

## Overview

This document describes the implementation of a robust onboarding status service with a clear storage hierarchy:

1. **Primary Storage: Backend Database (Django OnboardingProgress model)**
   - Single source of truth
   - Persistent, transactional, and can maintain complex state
   - Authoritative record for all onboarding state

2. **Secondary Storage: Auth0 User Attributes**
   - Quick access during authentication flows
   - Useful for making routing decisions after login without extra API calls
   - Synchronized with the database

3. **Tertiary Storage: Browser localStorage**
   - Fallback when network is unavailable
   - Performance optimization
   - Maintains state during page refreshes

## Components

### 1. Onboarding Service (`src/services/onboardingService.js`)

A dedicated service that manages onboarding status with proper hierarchical storage:

- **getOnboardingStatus()**: Retrieves status with fallbacks (Backend → Auth0 → localStorage)
- **saveOnboardingStatus()**: Saves status to all storage locations with primary focus on backend
- **isOnboardingComplete()**: Optimized check for onboarding completion
- **completeOnboardingStep()**: Marks a specific step as complete
- **resetOnboardingStatus()**: Resets status (mostly for testing)

### 2. React Hook (`src/hooks/useOnboardingStatus.js`)

A React hook for using the onboarding service in components:

- Provides status, loading state, and error handling
- Methods for fetching and updating status
- Automatic refresh when tenant changes

### 3. API Route (`src/app/api/onboarding/status/route.js`)

The backend API route for onboarding status:

- GET handler returns status from the database
- POST handler updates status in all storage locations
- Ensures synchronization between storage systems

### 4. Tenant Utilities (`src/utils/tenantUtils.js`)

Helper functions for tenant management with onboarding status support:

- **getTenantId()**: Gets tenant ID from various sources
- **storeTenantId()**: Stores tenant ID in localStorage
- **isUserOnboarded()**: Quick check if a user is onboarded

## Implementation Details

### Storage Hierarchy and Fallbacks

1. The system always attempts to use the backend database first
2. If the backend is unavailable, it falls back to Auth0 user attributes
3. If Auth0 is unavailable, it uses localStorage as a last resort
4. When writing, it attempts to update all storage locations

### Synchronization

- When reading from the backend, it updates localStorage with fresh data
- When updating status, it tries to update the backend first, then Auth0, then localStorage
- If backend update fails but Auth0 succeeds, it will retry the backend update
- Data is time-stamped to determine freshness

### Error Handling and Resilience

- Retry mechanism with exponential backoff for failed updates
- Fallback chain when primary sources are unavailable
- Detailed logging for debugging and monitoring

## Benefits

1. **Reliability**: Multiple storage locations ensure users don't lose their progress
2. **Performance**: Local caching for immediate UI response
3. **Consistency**: Clear data hierarchy with the backend as source of truth
4. **Resilience**: Continues to function during temporary network issues
5. **Maintainability**: Clean separation of concerns with dedicated components

## Usage Examples

### In a React Component

```jsx
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

function OnboardingProgress() {
  const { 
    status, 
    isLoading, 
    error, 
    updateStatus, 
    completeStep 
  } = useOnboardingStatus();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  const handleCompleteStep = async (step) => {
    await completeStep(step);
    // Show success message or navigate to next step
  };
  
  return (
    <div>
      <h2>Current progress: {status?.currentStep}</h2>
      <button onClick={() => handleCompleteStep('business_info')}>
        Complete Business Info
      </button>
    </div>
  );
}
```

### Direct Service Usage

```javascript
import onboardingService from '@/services/onboardingService';

// Check if onboarding is complete
const isComplete = await onboardingService.isOnboardingComplete(tenantId);

// Get detailed status
const status = await onboardingService.getOnboardingStatus(tenantId, {
  accessToken,
  forceFresh: true // Skip cache
});

// Save status
await onboardingService.saveOnboardingStatus(tenantId, 'subscription', {
  additionalData: {
    planId: 'pro',
    startDate: new Date().toISOString()
  }
});
```

### Tenant Utility Functions

```javascript
import { getTenantId, isUserOnboarded } from '@/utils/tenantUtils';

// Get tenant ID from various sources
const tenantId = getTenantId({
  user,
  tenant,
  params,
  router
});

// Quick check if user is onboarded
const onboarded = isUserOnboarded(user, tenantId);
```

## Implementation Notes

- The system is designed to be resilient to network failures and service disruptions
- Auth0 attributes provide a quick way to check onboarding status during the auth flow
- localStorage provides immediate UI feedback while backend requests are in progress
- All storage locations are kept in sync, with the backend as the source of truth
- The implementation includes comprehensive error handling and logging
