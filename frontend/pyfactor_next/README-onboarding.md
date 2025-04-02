# Onboarding Attribute Naming Conventions

This document outlines the standardized naming conventions for onboarding-related attributes in the application.

## Purpose

We've standardized attribute naming across the codebase to ensure consistency between:
- Cognito user attributes
- Cookies
- LocalStorage
- Component state

This standardization helps prevent issues where different parts of the application use different attribute names or different status values, leading to bugs in the onboarding flow.

## Constants

All constants are defined in `/src/constants/onboarding.js` and should be imported and used consistently throughout the application:

```javascript
import { 
  COGNITO_ATTRIBUTES,
  COOKIE_NAMES, 
  STORAGE_KEYS,
  ONBOARDING_STATUS,
  ONBOARDING_STEPS
} from '@/constants/onboarding';
```

## Attribute Names

### Cognito Attributes
Use these when updating user attributes in Cognito:

```javascript
const userAttributes = {
  [COGNITO_ATTRIBUTES.ONBOARDING_STATUS]: ONBOARDING_STATUS.COMPLETE,
  [COGNITO_ATTRIBUTES.SETUP_COMPLETED]: 'TRUE',
  [COGNITO_ATTRIBUTES.BUSINESS_NAME]: businessName
};

await updateUserAttributes({ userAttributes });
```

### Cookie Names
Use these when setting or getting cookies:

```javascript
document.cookie = `${COOKIE_NAMES.ONBOARDING_STATUS}=${ONBOARDING_STATUS.COMPLETE}; path=/`;
document.cookie = `${COOKIE_NAMES.SETUP_COMPLETED}=true; path=/`;

const cookieValue = getCookie(COOKIE_NAMES.ONBOARDING_STATUS);
```

### LocalStorage Keys
Use these for LocalStorage operations:

```javascript
localStorage.setItem(STORAGE_KEYS.ONBOARDING_STATUS, ONBOARDING_STATUS.COMPLETE);
const value = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETED);
```

## Status Values

Use standardized status values from the `ONBOARDING_STATUS` object:

```javascript
// Check if onboarding is complete
if (status === ONBOARDING_STATUS.COMPLETE) {
  // ...
}

// Check for specific onboarding stage
if (status === ONBOARDING_STATUS.BUSINESS_INFO_COMPLETED) {
  // ...
}
```

## Onboarding Steps

For URL paths and routing, use the `ONBOARDING_STEPS` constants:

```javascript
// Determine next step
const nextStep = ONBOARDING_STEPS.SUBSCRIPTION;
router.push(`/onboarding/${nextStep}`);

// Check current step
if (pathname.includes(ONBOARDING_STEPS.BUSINESS_INFO)) {
  // ...
}
```

## Best Practices

1. **Always use constants** - Never hardcode attribute names or status values
2. **Use consistent checking** - Check all sources (Cognito, cookies, localStorage) when determining onboarding status
3. **Document deviations** - If you must deviate from these conventions, document the reason clearly
4. **Update all sources** - When updating status, set it in all relevant places (Cognito, cookies, localStorage)

## Debugging Onboarding Status

When debugging onboarding issues:

1. Check all three sources for consistent values:
   - Cognito attributes - via `fetchUserAttributes()`
   - Cookies - via `document.cookie`
   - LocalStorage - via `localStorage`

2. Remember that any source indicating completion is considered valid (OR logic)

3. Set cookies as a fallback mechanism even if Cognito updates fail 