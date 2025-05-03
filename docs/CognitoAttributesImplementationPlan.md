# CognitoAttributes Implementation Plan

This document outlines the strategy for implementing the CognitoAttributes utility across the codebase to standardize Cognito attribute access and prevent issues related to inconsistent attribute naming and casing.

## Problem Statement

Our application has experienced bugs due to inconsistent Cognito attribute naming patterns, particularly:

1. Inconsistent casing in attribute names (e.g., `custom:tenant_id` vs. `custom:tenant_ID`)
2. Multiple fallback patterns spread across the codebase
3. Duplicate code for handling attribute access and validation
4. No standardized way to generate derived values (e.g., user initials)

## Implementation Strategy

We'll implement the CognitoAttributes utility in phases, targeting the most critical areas first:

### Phase 1: Core Authentication & Session Management

#### 1.1 Update `useSession.js`

This file is the primary source of Cognito attributes for many components.

```javascript
// Before
export const getUserAttributesFromCognito = async () => {
  try {
    // Check cache
    const cachedAttributes = getCacheValue('user_attributes');
    if (cachedAttributes) {
      return cachedAttributes;
    }
    
    // Get from Cognito
    const { Auth } = await import('aws-amplify');
    const currentAuthUser = await Auth.currentAuthenticatedUser();
    const attributes = currentAuthUser.attributes || {};
    
    // Cache and return
    setCacheValue('user_attributes', attributes);
    return attributes;
  } catch (error) {
    console.error('Error fetching user attributes:', error);
    return {};
  }
};

// After
import CognitoAttributes from '@/utils/CognitoAttributes';

export const getUserAttributesFromCognito = async () => {
  try {
    // Check cache
    const cachedAttributes = getCacheValue('user_attributes');
    if (cachedAttributes) {
      return cachedAttributes;
    }
    
    // Get from Cognito
    const { Auth } = await import('aws-amplify');
    const currentAuthUser = await Auth.currentAuthenticatedUser();
    const attributes = currentAuthUser.attributes || {};
    
    // Apply standardized attribute access
    const standardizedAttributes = {
      // Include original attributes for backward compatibility
      ...attributes,
      
      // Add normalized attributes with correct casing
      [CognitoAttributes.SUB]: CognitoAttributes.getValue(attributes, CognitoAttributes.SUB),
      [CognitoAttributes.EMAIL]: CognitoAttributes.getValue(attributes, CognitoAttributes.EMAIL),
      [CognitoAttributes.GIVEN_NAME]: CognitoAttributes.getValue(attributes, CognitoAttributes.GIVEN_NAME),
      [CognitoAttributes.FAMILY_NAME]: CognitoAttributes.getValue(attributes, CognitoAttributes.FAMILY_NAME),
      
      // Custom attributes
      [CognitoAttributes.TENANT_ID]: CognitoAttributes.getTenantId(attributes),
      [CognitoAttributes.BUSINESS_NAME]: CognitoAttributes.getBusinessName(attributes),
      [CognitoAttributes.BUSINESS_ID]: CognitoAttributes.getValue(attributes, CognitoAttributes.BUSINESS_ID),
      [CognitoAttributes.USER_ROLE]: CognitoAttributes.getUserRole(attributes),
      // Add other attributes as needed
    };
    
    // Add derived properties
    standardizedAttributes.userInitials = CognitoAttributes.getUserInitials(attributes);
    standardizedAttributes.isAdmin = CognitoAttributes.isAdmin(attributes);
    
    // Cache and return
    setCacheValue('user_attributes', standardizedAttributes);
    return standardizedAttributes;
  } catch (error) {
    console.error('Error fetching user attributes:', error);
    return {};
  }
};
```

#### 1.2 Update `SignInForm.js`

This component has numerous direct attribute accesses with inconsistent casing.

```javascript
// Before
const onboardingStatus = (userAttributes['custom:onboarding'] || '').toLowerCase();
const setupDone = (userAttributes['custom:setupdone'] || '').toLowerCase() === 'true';

// After
import CognitoAttributes from '@/utils/CognitoAttributes';

const onboardingStatus = (CognitoAttributes.getValue(userAttributes, CognitoAttributes.ONBOARDING, '') || '').toLowerCase();
const setupDone = (CognitoAttributes.getValue(userAttributes, CognitoAttributes.SETUP_DONE, '') || '').toLowerCase() === 'true';
```

### Phase 2: Fix Known Problem Areas

#### 2.1 Update `DashAppBar.js`

This component had issues with missing business name and user initials.

```javascript
// Before
const attributeTenantId = attributes['custom:tenant_ID'] || attributes['custom:businessid'];
const businessName = attributes['custom:businessname'] || attributes['custom:tenant_name'] || 'Unknown Business';
const firstName = attributes['given_name'] || '';
const lastName = attributes['family_name'] || '';
const initials = firstName && lastName 
  ? `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`
  : (firstName.charAt(0).toUpperCase() || lastName.charAt(0).toUpperCase() || 'U');

// After
import CognitoAttributes from '@/utils/CognitoAttributes';

const attributeTenantId = CognitoAttributes.getTenantId(attributes);
const businessName = CognitoAttributes.getBusinessName(attributes) || 'Unknown Business';
const initials = CognitoAttributes.getUserInitials(attributes);
```

#### 2.2 Update `tenantUtils.js`

This file handles tenant ID management with inconsistent attribute access patterns.

```javascript
// Before
const tenantIdFromCognito = attributes['custom:tenant_ID'] ||
  attributes['custom:tenant_id'] ||
  attributes['custom:businessid'];

// After
import CognitoAttributes from '@/utils/CognitoAttributes';

const tenantIdFromCognito = CognitoAttributes.getTenantId(attributes);
```

### Phase 3: Broader Codebase

#### 3.1 Update `UserProfileContext.js`

This context manages user profiles.

```javascript
// Before
const tenantId = findAttr('custom:tenant_ID') || findAttr('custom:businessid');
const businessName = findAttr('custom:businessname') || findAttr('custom:tenant_name') || findAttr('business_name') || findAttr('businessName');

// After
import CognitoAttributes from '@/utils/CognitoAttributes';

const tenantId = CognitoAttributes.getTenantId(attributes);
const businessName = CognitoAttributes.getBusinessName(attributes);
```

#### 3.2 Update `TenantContext.js`

This context manages tenant-related information.

```javascript
// Before
if (decoded['custom:tenant_id']) {
  tokenTenantId = decoded['custom:tenant_id'];
} else if (decoded['custom:tenantId']) {
  tokenTenantId = decoded['custom:tenantId'];
} else if (decoded['custom:businessid']) {
  tokenTenantId = decoded['custom:businessid'];
}

// After
import CognitoAttributes from '@/utils/CognitoAttributes';

tokenTenantId = CognitoAttributes.getTenantId(decoded);
```

#### 3.3 Update `onboardingUtils.js`

This file manages attributes during the onboarding process.

```javascript
// Before
const updateAttributes = {
  'custom:businessid': businessId,
  'custom:businessname': businessName,
  'custom:businesstype': businessType,
  'custom:businesssubtypes': businessSubtypes,
  'custom:businesscountry': country,
  'custom:businessstate': businessState,
};

// After
import CognitoAttributes from '@/utils/CognitoAttributes';

const updateAttributes = {
  [CognitoAttributes.BUSINESS_ID]: businessId,
  [CognitoAttributes.BUSINESS_NAME]: businessName,
  [CognitoAttributes.BUSINESS_TYPE]: businessType,
  [CognitoAttributes.BUSINESS_SUBTYPES]: businessSubtypes,
  [CognitoAttributes.BUSINESS_COUNTRY]: country,
  [CognitoAttributes.BUSINESS_STATE]: businessState,
};

// Validate before updating
const validation = CognitoAttributes.validateAttributes(updateAttributes);
if (!validation.valid) {
  console.error('Invalid attributes:', validation.results);
  // Handle validation errors
}
```

### Phase 4: Create Utility Functions

#### 4.1 Update Attribute Update Functions

```javascript
// Before
export async function updateUserAttributes(attributes) {
  try {
    const { Auth } = await import('aws-amplify');
    await Auth.updateUserAttributes(user, attributes);
    return true;
  } catch (error) {
    console.error('Error updating user attributes:', error);
    return false;
  }
}

// After
import CognitoAttributes from '@/utils/CognitoAttributes';

export async function updateUserAttributes(attributeUpdates) {
  try {
    // Validate attributes before updating
    const validation = CognitoAttributes.validateAttributes(attributeUpdates);
    if (!validation.valid) {
      console.error('Invalid attributes:', validation.results);
      return false;
    }
    
    // Create properly formatted update object
    const updateObj = CognitoAttributes.createUpdateObject(attributeUpdates);
    
    const { Auth } = await import('aws-amplify');
    await Auth.updateUserAttributes(user, updateObj);
    return true;
  } catch (error) {
    console.error('Error updating user attributes:', error);
    return false;
  }
}
```

#### 4.2 Create Helper Functions

```javascript
// Add to useProfile.js or similar hooks
import CognitoAttributes from '@/utils/CognitoAttributes';

export function useUserInitials(attributes) {
  return CognitoAttributes.getUserInitials(attributes);
}

export function useBusinessName(attributes) {
  return CognitoAttributes.getBusinessName(attributes);
}

export function useTenantId(attributes) {
  return CognitoAttributes.getTenantId(attributes);
}
```

## Validation & Testing

1. Create unit tests for the CognitoAttributes utility
2. Test each phase thoroughly before proceeding to the next
3. Focus on the dashboard rendering issues after updating DashAppBar.js
4. Verify that tenant IDs are correctly retrieved after updates

## Rollout Plan

1. Deploy changes to the development environment
2. Test thoroughly, especially the dashboard loading and DashAppBar components
3. Create a monitoring plan to track any regressions
4. Deploy to production in phases

## Linting & Enforcement

Consider adding ESLint rules to prevent direct attribute access:

```javascript
// .eslintrc.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: "MemberExpression[property.value=/^custom:/]",
      message: "Direct access to Cognito attributes is not allowed. Use the CognitoAttributes utility instead."
    }
  ]
}
```

## Documentation

1. Update all relevant documentation to reference the CognitoAttributes utility
2. Add inline comments in key files explaining the standardization
3. Create examples for new developers

## Timeline

- Phase 1: 1-2 days
- Phase 2: 2-3 days
- Phase 3: 3-5 days
- Phase 4: 2-3 days
- Testing & validation: 2-3 days

Total estimated time: 2-3 weeks 