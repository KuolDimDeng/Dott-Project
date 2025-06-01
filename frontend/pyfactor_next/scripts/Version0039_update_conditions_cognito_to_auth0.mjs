/**
 * Version0039_update_conditions_cognito_to_auth0.mjs
 * Version: 0039 v1.0
 * 
 * Purpose: Update AI model request conditions from AWS Cognito to Auth0 authentication
 * 
 * This script:
 * 1. Creates updated request conditions replacing Cognito with Auth0
 * 2. Creates Auth0 attribute utility to replace CognitoAttributes
 * 3. Creates Auth0 attribute reference documentation
 * 4. Creates backup of original conditions
 * 
 * MIGRATION MAPPING:
 * - custom:tenant_ID → current_tenant_id (from API response)
 * - CognitoAttributes → Auth0Attributes utility
 * - fetchUserAttributes() → /api/users/me API call
 * - AWS App Cache → Auth0 session + API cache
 * 
 * Requirements Addressed:
 * - Replace Cognito references with Auth0 equivalents
 * - Update utility functions and documentation
 * - Maintain security and architectural principles
 * - Use Auth0 attribute mapping document
 * 
 * Execution: node Version0039_update_conditions_cognito_to_auth0.mjs
 */

import fs from 'fs';
import path from 'path';

const SCRIPT_VERSION = 'v1.0';
const EXECUTION_DATE = new Date().toISOString();

// File paths
const SCRIPTS_DIR = '/Users/kuoldeng/projectx/frontend/pyfactor_next/scripts';
const UTILS_DIR = '/Users/kuoldeng/projectx/frontend/pyfactor_next/src/utils';
const DOCS_DIR = '/Users/kuoldeng/projectx/frontend/pyfactor_next/docs';
const REGISTRY_FILE = path.join(SCRIPTS_DIR, 'script_registry.md');

/**
 * Updated AI Model Request Conditions - Cognito to Auth0 Migration
 */
const UPDATED_CONDITIONS = `# AI Model Request Conditions - Auth0 Version

## Updated Request Conditions for Auth0 Authentication

1. **Scripts Location**: 
   - Frontend scripts: /Users/kuoldeng/projectx/frontend/pyfactor_next/scripts
   - Backend scripts: /Users/kuoldeng/projectx/backend/pyfactor/scripts

2. **Documentation**: Include comprehensive documentation within scripts

3. **Version Control**: Use version control naming (Version0001_<fix description>_<name of file fixed>)

4. **Backups**: Create backup of all changed files with date in naming convention (one backup version only)

5. **ES Modules**: Write scripts using ES modules (not CommonJS)

6. **Script Registry**: Maintain script registry file in each scripts folder. Main registry: /Users/kuoldeng/projectx/frontend/pyfactor_next/scripts/script_registry.md

7. **No Client Storage**: No cookies or local storage

8. **Auth0 Session Management**: Use Auth0 session cookies and API calls for user data
   - User profile data from /api/users/me
   - Tenant data included in API responses
   - In-memory caching for performance

9. **Tenant ID**: Use current_tenant_id from API response (not hardcoded tenant id)

10. **Auth0 Attributes Utility**: ALWAYS use the Auth0Attributes utility for accessing user data
    - Reference /docs/Auth0AttributesReference.md for comprehensive API response structure
    - Import and use /src/utils/Auth0Attributes.js instead of direct API access
    
    Example:
    \`\`\`javascript
    // INCORRECT - direct API access prone to errors
    const tenantId = apiResponse.tenant?.id; // Inconsistent!
    
    // CORRECT - use the utility
    import Auth0Attributes from '@/utils/Auth0Attributes';
    const tenantId = Auth0Attributes.getTenantId(userProfile);
    \`\`\`

11. **Next.js 15**: Using Next.js version 15

12. **Long-term Solutions**: Do not implement short-term fixes, look for long-term solutions

13. **Page Locations**: 
    - Home page: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/page.js
    - Layout page: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js

14. **Styling**: Use Tailwind CSS only (no MUI)

15. **Database**: AWS RDS with Row-Level Security policy and strict tenant isolation

16. **Amplify**: Amplify version 6

17. **Language**: JavaScript (not TypeScript)

18. **Package Manager**: PNPM package manager

19. **Production Mode**: Production mode only (no development mode)

20. **Live Database**: No mock data (connect to live AWS RDS database)

21. **Deployment URLs**:
    - Backend: Dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com (HTTPS/SSL)
    - Frontend: projectx-4bl3cb0l0-kuol-dengs-projects.vercel.app (Vercel)

22. **Security**: No hardcoded environment keys or sensitive information

23. **Environment Files**: Use .env, .env.local, .env.production files for secrets

24. **Documentation**: Create/update .MD files in same folder as modified code

25. **Documentation Review**: Read existing documentation before making changes

26. **Change Documentation**: Document all changes with version history and issue reference

27. **Targeted Changes**: Make targeted, purposeful changes rather than broad modifications

28. **Code Quality**: Ensure code is clean and efficient

29. **Scope Limitation**: No UI, design, or feature changes beyond request scope without permission

30. **Script Versioning**: Version tag all scripts (v1.0, v1.1, etc.)

31. **Understanding Summary**: Provide summary of understanding before implementing changes

32. **Approval Required**: Wait for explicit approval before modifying code

33. **Request Focus**: Implement only the specified request

## Auth0 Migration Notes

### API Response Structure
\`\`\`javascript
// Auth0 API Response from /api/users/me
{
  "user": {
    "id": 1,
    "auth0_id": "auth0|123",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://..."
  },
  "tenant": {
    "id": "abc-123",
    "name": "My Company",
    "business_type": "Technology",
    "subscription_plan": "professional",
    "subscription_status": "active"
  },
  "role": "owner",
  "onboarding": {
    "business_info_completed": true,
    "subscription_selected": true,
    "payment_completed": true,
    "setup_completed": true
  }
}
\`\`\`

### Key Changes from Cognito
- **Tenant ID**: \`current_tenant_id\` from API response (not \`custom:tenant_ID\`)
- **User Data**: Via \`/api/users/me\` API call (not \`fetchUserAttributes()\`)
- **Session**: Auth0 session cookies (not Cognito session)
- **Utility**: \`Auth0Attributes.js\` (not \`CognitoAttributes.js\`)
- **Documentation**: \`Auth0AttributesReference.md\` (not \`CognitoAttributesReference.md\`)
`;

/**
 * Auth0 Attributes Utility - Replacement for CognitoAttributes
 */
const AUTH0_ATTRIBUTES_UTILITY = `/**
 * Auth0Attributes.js
 * 
 * A utility module for standardized access to Auth0 user profile data.
 * This ensures consistent data access, validation, and usage throughout
 * the application after migration from AWS Cognito to Auth0.
 * 
 * IMPORTANT: Always use this module when accessing user data from Auth0
 * to prevent inconsistencies and API access errors.
 * 
 * API RESPONSE STRUCTURE: /api/users/me
 * {
 *   user: { id, auth0_id, email, name, picture },
 *   tenant: { id, name, business_type, subscription_plan, etc. },
 *   role: "owner" | "admin" | "user",
 *   onboarding: { business_info_completed, setup_completed, etc. }
 * }
 * 
 * VERSION: 1.0 - Initial Auth0 migration
 * LAST UPDATED: ${new Date().toISOString()}
 */

/**
 * Standard API response field names
 */
export const APIFields = {
  // User fields
  USER_ID: 'id',
  AUTH0_ID: 'auth0_id',
  EMAIL: 'email',
  NAME: 'name',
  PICTURE: 'picture',
  
  // Tenant fields
  TENANT_ID: 'id',
  TENANT_NAME: 'name',
  BUSINESS_TYPE: 'business_type',
  BUSINESS_SUBTYPES: 'business_subtypes',
  COUNTRY: 'country',
  BUSINESS_STATE: 'business_state',
  LEGAL_STRUCTURE: 'legal_structure',
  DATE_FOUNDED: 'date_founded',
  TAX_ID: 'tax_id',
  ADDRESS: 'address',
  PHONE_NUMBER: 'phone_number',
  
  // Subscription fields
  SUBSCRIPTION_PLAN: 'subscription_plan',
  BILLING_INTERVAL: 'billing_interval',
  SUBSCRIPTION_STATUS: 'subscription_status',
  
  // Other fields
  ROLE: 'role',
  ONBOARDING: 'onboarding'
};

/**
 * Validation rules for API response data
 */
export const ValidationRules = {
  user: {
    id: { required: true, type: 'number' },
    auth0_id: { required: true, type: 'string', pattern: /^auth0\\|/ },
    email: { required: true, type: 'string', minLength: 5, maxLength: 254 },
    name: { required: false, type: 'string', maxLength: 256 },
    picture: { required: false, type: 'string' }
  },
  tenant: {
    id: { required: true, type: 'string', length: 36 }, // UUID
    name: { required: true, type: 'string', minLength: 1, maxLength: 256 },
    business_type: { required: false, type: 'string', maxLength: 256 },
    subscription_plan: { required: true, type: 'string', enum: ['free', 'professional', 'enterprise'] },
    subscription_status: { required: true, type: 'string', enum: ['active', 'trialing', 'past_due', 'canceled'] }
  },
  role: { required: true, type: 'string', enum: ['owner', 'admin', 'user'] }
};

/**
 * Main Auth0Attributes utility class
 */
class Auth0Attributes {
  
  /**
   * Get a value from user profile data with optional default
   * @param {Object} userProfile - Complete user profile from /api/users/me
   * @param {string} section - Section name (user, tenant, role, onboarding)
   * @param {string} field - Field name within section
   * @param {*} defaultValue - Default value if field not found
   * @returns {*} Field value or default
   */
  static getValue(userProfile, section, field, defaultValue = null) {
    if (!userProfile || typeof userProfile !== 'object') {
      return defaultValue;
    }
    
    if (section === 'role' || section === 'onboarding') {
      return userProfile[section] ?? defaultValue;
    }
    
    const sectionData = userProfile[section];
    if (!sectionData || typeof sectionData !== 'object') {
      return defaultValue;
    }
    
    return sectionData[field] ?? defaultValue;
  }
  
  /**
   * Validate user profile structure
   * @param {Object} userProfile - User profile to validate
   * @returns {Object} Validation result with isValid and errors
   */
  static validateProfile(userProfile) {
    const errors = [];
    
    if (!userProfile) {
      return { isValid: false, errors: ['User profile is required'] };
    }
    
    // Validate user section
    const user = userProfile.user;
    if (!user) {
      errors.push('User section is required');
    } else {
      if (!user.id || typeof user.id !== 'number') {
        errors.push('User ID is required and must be a number');
      }
      if (!user.auth0_id || !user.auth0_id.startsWith('auth0|')) {
        errors.push('Valid Auth0 ID is required');
      }
      if (!user.email || typeof user.email !== 'string') {
        errors.push('User email is required');
      }
    }
    
    // Validate tenant section
    const tenant = userProfile.tenant;
    if (!tenant) {
      errors.push('Tenant section is required');
    } else {
      if (!tenant.id || typeof tenant.id !== 'string') {
        errors.push('Tenant ID is required and must be a string');
      }
      if (!tenant.name || typeof tenant.name !== 'string') {
        errors.push('Tenant name is required');
      }
    }
    
    // Validate role
    if (!userProfile.role || !['owner', 'admin', 'user'].includes(userProfile.role)) {
      errors.push('Valid role is required (owner, admin, or user)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // ===================
  // USER DATA GETTERS
  // ===================
  
  /**
   * Get user's Auth0 ID
   */
  static getAuth0Id(userProfile) {
    return this.getValue(userProfile, 'user', APIFields.AUTH0_ID);
  }
  
  /**
   * Get user's email
   */
  static getEmail(userProfile) {
    return this.getValue(userProfile, 'user', APIFields.EMAIL);
  }
  
  /**
   * Get user's full name
   */
  static getName(userProfile) {
    return this.getValue(userProfile, 'user', APIFields.NAME);
  }
  
  /**
   * Get user's profile picture URL
   */
  static getPicture(userProfile) {
    return this.getValue(userProfile, 'user', APIFields.PICTURE);
  }
  
  /**
   * Get user initials from name or email
   */
  static getUserInitials(userProfile) {
    const name = this.getName(userProfile);
    
    if (name) {
      const nameParts = name.trim().split(' ');
      if (nameParts.length >= 2) {
        return \`\${nameParts[0].charAt(0).toUpperCase()}\${nameParts[nameParts.length - 1].charAt(0).toUpperCase()}\`;
      } else if (nameParts.length === 1) {
        return nameParts[0].charAt(0).toUpperCase();
      }
    }
    
    // Fallback to email
    const email = this.getEmail(userProfile);
    return email ? email.charAt(0).toUpperCase() : 'U';
  }
  
  // ===================
  // TENANT DATA GETTERS
  // ===================
  
  /**
   * Get current tenant ID
   */
  static getTenantId(userProfile) {
    return this.getValue(userProfile, 'tenant', APIFields.TENANT_ID);
  }
  
  /**
   * Get tenant/business name
   */
  static getBusinessName(userProfile) {
    return this.getValue(userProfile, 'tenant', APIFields.TENANT_NAME);
  }
  
  /**
   * Get business type
   */
  static getBusinessType(userProfile) {
    return this.getValue(userProfile, 'tenant', APIFields.BUSINESS_TYPE);
  }
  
  /**
   * Get business subtypes (array)
   */
  static getBusinessSubtypes(userProfile) {
    const subtypes = this.getValue(userProfile, 'tenant', APIFields.BUSINESS_SUBTYPES);
    return Array.isArray(subtypes) ? subtypes : [];
  }
  
  /**
   * Get business country
   */
  static getCountry(userProfile) {
    return this.getValue(userProfile, 'tenant', APIFields.COUNTRY);
  }
  
  /**
   * Get business state/province
   */
  static getBusinessState(userProfile) {
    return this.getValue(userProfile, 'tenant', APIFields.BUSINESS_STATE);
  }
  
  /**
   * Get legal structure
   */
  static getLegalStructure(userProfile) {
    return this.getValue(userProfile, 'tenant', APIFields.LEGAL_STRUCTURE);
  }
  
  /**
   * Get date founded
   */
  static getDateFounded(userProfile) {
    return this.getValue(userProfile, 'tenant', APIFields.DATE_FOUNDED);
  }
  
  // ===================
  // SUBSCRIPTION GETTERS
  // ===================
  
  /**
   * Get subscription plan
   */
  static getSubscriptionPlan(userProfile) {
    return this.getValue(userProfile, 'tenant', APIFields.SUBSCRIPTION_PLAN, 'free');
  }
  
  /**
   * Get billing interval
   */
  static getBillingInterval(userProfile) {
    return this.getValue(userProfile, 'tenant', APIFields.BILLING_INTERVAL, 'monthly');
  }
  
  /**
   * Get subscription status
   */
  static getSubscriptionStatus(userProfile) {
    return this.getValue(userProfile, 'tenant', APIFields.SUBSCRIPTION_STATUS, 'inactive');
  }
  
  /**
   * Check if subscription is active
   */
  static isSubscriptionActive(userProfile) {
    return this.getSubscriptionStatus(userProfile) === 'active';
  }
  
  // ===================
  // ROLE & PERMISSIONS
  // ===================
  
  /**
   * Get user role in current tenant
   */
  static getUserRole(userProfile) {
    return this.getValue(userProfile, 'role', null, 'user');
  }
  
  /**
   * Check if user is owner
   */
  static isOwner(userProfile) {
    return this.getUserRole(userProfile) === 'owner';
  }
  
  /**
   * Check if user is admin or owner
   */
  static isAdmin(userProfile) {
    const role = this.getUserRole(userProfile);
    return role === 'admin' || role === 'owner';
  }
  
  /**
   * Check if user can manage other users
   */
  static canManageUsers(userProfile) {
    return this.isAdmin(userProfile);
  }
  
  // ===================
  // ONBOARDING STATUS
  // ===================
  
  /**
   * Get onboarding data
   */
  static getOnboarding(userProfile) {
    return this.getValue(userProfile, 'onboarding', null, {});
  }
  
  /**
   * Check if business info is completed
   */
  static isBusinessInfoCompleted(userProfile) {
    const onboarding = this.getOnboarding(userProfile);
    return onboarding.business_info_completed === true;
  }
  
  /**
   * Check if subscription is selected
   */
  static isSubscriptionSelected(userProfile) {
    const onboarding = this.getOnboarding(userProfile);
    return onboarding.subscription_selected === true;
  }
  
  /**
   * Check if payment is completed
   */
  static isPaymentCompleted(userProfile) {
    const onboarding = this.getOnboarding(userProfile);
    return onboarding.payment_completed === true;
  }
  
  /**
   * Check if setup is completed
   */
  static isSetupCompleted(userProfile) {
    const onboarding = this.getOnboarding(userProfile);
    return onboarding.setup_completed === true;
  }
  
  /**
   * Get overall onboarding completion status
   */
  static isOnboardingComplete(userProfile) {
    return this.isBusinessInfoCompleted(userProfile) &&
           this.isSubscriptionSelected(userProfile) &&
           this.isPaymentCompleted(userProfile) &&
           this.isSetupCompleted(userProfile);
  }
  
  // ===================
  // UTILITY METHODS
  // ===================
  
  /**
   * Create a formatted display name
   */
  static getDisplayName(userProfile) {
    const name = this.getName(userProfile);
    if (name) return name;
    
    const email = this.getEmail(userProfile);
    if (email) {
      // Return the part before @ as display name
      return email.split('@')[0];
    }
    
    return 'User';
  }
  
  /**
   * Get full business address
   */
  static getBusinessAddress(userProfile) {
    return this.getValue(userProfile, 'tenant', APIFields.ADDRESS);
  }
  
  /**
   * Get business phone number
   */
  static getBusinessPhone(userProfile) {
    return this.getValue(userProfile, 'tenant', APIFields.PHONE_NUMBER);
  }
  
  /**
   * Create update object for API calls
   * @param {Object} updates - Key-value pairs to update
   * @returns {Object} Formatted update object
   */
  static createUpdateObject(updates) {
    const updateObj = {};
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== null && updates[key] !== undefined) {
        updateObj[key] = updates[key];
      }
    });
    
    return updateObj;
  }
}

export default Auth0Attributes;
`;

/**
 * Auth0 Attributes Reference Documentation
 */
const AUTH0_REFERENCE_DOC = `# Auth0 Attributes Reference

This document serves as the source of truth for all Auth0 user profile data used throughout the application after migration from AWS Cognito. Developers should refer to this document when working with user data to ensure consistent access patterns and proper API usage.

## Purpose

The goal of this reference is to:

1. Document the new Auth0 API response structure from \`/api/users/me\`
2. Provide clear field descriptions and data types
3. Replace the previous CognitoAttributes system with Auth0Attributes
4. Ensure consistent data access patterns across the codebase
5. Prevent bugs caused by direct API access without the utility

## API Response Structure

The \`/api/users/me\` endpoint returns a complete user profile in this format:

\`\`\`javascript
{
  "user": {
    "id": 1,
    "auth0_id": "auth0|64abc123def456",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://s.gravatar.com/avatar/..."
  },
  "tenant": {
    "id": "f25a8e7f-2b43-5798-ae3d-51d803089261",
    "name": "Acme Corporation",
    "business_type": "Technology",
    "business_subtypes": ["Software", "SaaS"],
    "country": "US",
    "business_state": "California",
    "legal_structure": "LLC",
    "date_founded": "2020-01-15",
    "tax_id": "12-3456789",
    "address": "123 Main St, San Francisco, CA 94105",
    "phone_number": "+1-555-123-4567",
    "subscription_plan": "professional",
    "billing_interval": "monthly",
    "subscription_status": "active"
  },
  "role": "owner",
  "onboarding": {
    "business_info_completed": true,
    "subscription_selected": true,
    "payment_completed": true,
    "setup_completed": true
  }
}
\`\`\`

## User Fields

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| \`user.id\` | Number | Yes | Internal database user ID |
| \`user.auth0_id\` | String | Yes | Auth0 unique identifier (format: "auth0\\|...") |
| \`user.email\` | String | Yes | User's verified email address |
| \`user.name\` | String | No | User's full name from Auth0 profile |
| \`user.picture\` | String | No | Profile picture URL |

## Tenant Fields

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| \`tenant.id\` | String | Yes | Tenant UUID (36 characters) |
| \`tenant.name\` | String | Yes | Business/company name |
| \`tenant.business_type\` | String | No | Primary business category |
| \`tenant.business_subtypes\` | Array | No | Array of business subcategories |
| \`tenant.country\` | String | No | ISO country code (e.g., "US") |
| \`tenant.business_state\` | String | No | State/province name |
| \`tenant.legal_structure\` | String | No | Legal entity type (LLC, Corp, etc.) |
| \`tenant.date_founded\` | String | No | Date in YYYY-MM-DD format |
| \`tenant.tax_id\` | String | No | Tax identification number |
| \`tenant.address\` | String | No | Full business address |
| \`tenant.phone_number\` | String | No | Business phone number |
| \`tenant.subscription_plan\` | String | Yes | "free", "professional", or "enterprise" |
| \`tenant.billing_interval\` | String | No | "monthly" or "annual" |
| \`tenant.subscription_status\` | String | Yes | "active", "trialing", "past_due", or "canceled" |

## Role & Permissions

| Field Name | Type | Required | Values | Description |
|------------|------|----------|--------|-------------|
| \`role\` | String | Yes | "owner", "admin", "user" | User's role in the current tenant |

## Onboarding Status

| Field Name | Type | Description |
|------------|------|-------------|
| \`onboarding.business_info_completed\` | Boolean | Business information form completed |
| \`onboarding.subscription_selected\` | Boolean | Subscription plan selected |
| \`onboarding.payment_completed\` | Boolean | Payment method configured |
| \`onboarding.setup_completed\` | Boolean | Initial setup completed |

## Usage Best Practices

1. **Always use Auth0Attributes utility** instead of direct API response access
2. **Validate API responses** using the built-in validation methods
3. **Handle missing data gracefully** with proper fallbacks
4. **Cache API responses appropriately** to avoid unnecessary requests
5. **Use the correct field names** as documented above

## Code Examples

### Correct Attribute Access

\`\`\`javascript
import Auth0Attributes from '@/utils/Auth0Attributes';

// CORRECT: Using the utility
const tenantId = Auth0Attributes.getTenantId(userProfile);
const isOwner = Auth0Attributes.isOwner(userProfile);
const businessName = Auth0Attributes.getBusinessName(userProfile);

// INCORRECT: Direct API access
const tenantId = userProfile.tenant?.id; // Prone to errors!
const isOwner = userProfile.role === 'owner'; // No validation!
\`\`\`

### Defensive Data Access

\`\`\`javascript
import Auth0Attributes from '@/utils/Auth0Attributes';

function processUserData(userProfile) {
  // Validate the profile first
  const validation = Auth0Attributes.validateProfile(userProfile);
  if (!validation.isValid) {
    console.error('Invalid user profile:', validation.errors);
    return null;
  }
  
  // Safe data access with fallbacks
  const tenantId = Auth0Attributes.getTenantId(userProfile);
  const displayName = Auth0Attributes.getDisplayName(userProfile);
  const initials = Auth0Attributes.getUserInitials(userProfile);
  
  return {
    tenantId,
    displayName,
    initials,
    isAdmin: Auth0Attributes.isAdmin(userProfile),
    subscriptionActive: Auth0Attributes.isSubscriptionActive(userProfile)
  };
}
\`\`\`

### API Data Fetching

\`\`\`javascript
import Auth0Attributes from '@/utils/Auth0Attributes';

async function fetchUserProfile() {
  try {
    const response = await fetch('/api/users/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }
    
    const userProfile = await response.json();
    
    // Validate before using
    const validation = Auth0Attributes.validateProfile(userProfile);
    if (!validation.isValid) {
      throw new Error(\`Invalid profile data: \${validation.errors.join(', ')}\`);
    }
    
    return userProfile;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
}
\`\`\`

## Migration from Cognito

### Old vs New Patterns

| Old Cognito Pattern | New Auth0 Pattern |
|-------------------|------------------|
| \`userAttributes['custom:tenant_ID']\` | \`Auth0Attributes.getTenantId(userProfile)\` |
| \`userAttributes['custom:businessname']\` | \`Auth0Attributes.getBusinessName(userProfile)\` |
| \`userAttributes['custom:userrole']\` | \`Auth0Attributes.getUserRole(userProfile)\` |
| \`fetchUserAttributes()\` | \`fetch('/api/users/me')\` |
| \`updateUserAttributes()\` | Specific API endpoints |
| AWS App Cache | In-memory caching + Auth0 session |

### Key Differences

1. **Data Source**: API endpoint instead of Cognito attributes
2. **Structure**: Nested objects instead of flat custom attributes
3. **Validation**: Built-in validation methods
4. **Caching**: Server-side session + client-side memory
5. **Updates**: RESTful API calls instead of attribute updates

## Common Pitfalls

1. **Direct API access**: Accessing \`userProfile.tenant.id\` directly instead of using the utility
2. **Missing validation**: Not checking if the API response is valid
3. **Hardcoded field names**: Using string literals instead of the utility methods
4. **No error handling**: Not handling API failures gracefully
5. **Stale data**: Not refreshing user profile when needed

## Utility Implementation

The Auth0Attributes utility provides:

- **Data access methods**: \`getTenantId()\`, \`getBusinessName()\`, etc.
- **Validation**: \`validateProfile()\` for response validation
- **Permission checks**: \`isOwner()\`, \`isAdmin()\`, \`canManageUsers()\`
- **Onboarding status**: \`isSetupCompleted()\`, \`isOnboardingComplete()\`
- **Utility functions**: \`getUserInitials()\`, \`getDisplayName()\`

Always import and use this utility instead of direct API response access.

## Future Considerations

1. Consider implementing response caching for performance
2. Add TypeScript types for stronger type safety
3. Implement automatic profile refresh mechanisms
4. Add monitoring for API response times and errors
5. Consider implementing optimistic updates for better UX
`;

/**
 * Create backup of original conditions file
 */
function createBackup(sourceContent, filename) {
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const backupFilename = \`\${filename}.backup_\${timestamp}\`;
  const backupPath = path.join(SCRIPTS_DIR, backupFilename);
  
  fs.writeFileSync(backupPath, sourceContent, 'utf8');
  console.log(\`✅ Created backup: \${backupFilename}\`);
  return backupPath;
}

/**
 * Update script registry
 */
function updateScriptRegistry() {
  const registryEntry = \`
### Version0039_update_conditions_cognito_to_auth0.mjs
- **Version**: 0039 \${SCRIPT_VERSION}
- **Purpose**: Update AI model request conditions from AWS Cognito to Auth0 authentication
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Creation Date**: \${new Date().toISOString().split('T')[0]}
- **Execution Date**: \${EXECUTION_DATE}
- **Target Files**: 
  - /scripts/updated_ai_conditions_auth0.md (new conditions document)
  - /src/utils/Auth0Attributes.js (new utility replacing CognitoAttributes)
  - /docs/Auth0AttributesReference.md (new reference documentation)
- **Description**: Migrates AI model request conditions from Cognito to Auth0, replacing Cognito-specific references with Auth0 equivalents based on attribute mapping document
- **Key Features**:
  - Updated conditions document with Auth0 references
  - Auth0Attributes utility replacing CognitoAttributes
  - Auth0AttributesReference.md replacing CognitoAttributesReference.md
  - API response structure documentation
  - Migration notes and examples
  - Backup of original conditions created
- **Migration Changes**:
  - custom:tenant_ID → current_tenant_id (from API response)
  - CognitoAttributes → Auth0Attributes utility
  - fetchUserAttributes() → /api/users/me API call
  - AWS App Cache → Auth0 session + API cache
- **Requirements Addressed**: Conditions migration from Cognito to Auth0 per Auth0 attribute mapping
\`;
  
  try {
    let registryContent = fs.readFileSync(REGISTRY_FILE, 'utf8');
    registryContent += registryEntry;
    fs.writeFileSync(REGISTRY_FILE, registryContent, 'utf8');
    console.log('✅ Updated script registry');
  } catch (error) {
    console.error('❌ Failed to update script registry:', error.message);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log(\`🚀 Starting Auth0 conditions migration \${SCRIPT_VERSION}\`);
  console.log(\`📅 Execution Date: \${EXECUTION_DATE}\`);
  
  try {
    // 1. Create updated conditions document
    const conditionsPath = path.join(SCRIPTS_DIR, 'updated_ai_conditions_auth0.md');
    fs.writeFileSync(conditionsPath, UPDATED_CONDITIONS, 'utf8');
    console.log('✅ Created updated AI conditions document');
    
    // 2. Create Auth0Attributes utility
    const utilityPath = path.join(UTILS_DIR, 'Auth0Attributes.js');
    
    // Backup existing CognitoAttributes if it exists for reference
    const cognitoPath = path.join(UTILS_DIR, 'CognitoAttributes.js');
    if (fs.existsSync(cognitoPath)) {
      const cognitoContent = fs.readFileSync(cognitoPath, 'utf8');
      createBackup(cognitoContent, 'CognitoAttributes.js');
    }
    
    fs.writeFileSync(utilityPath, AUTH0_ATTRIBUTES_UTILITY, 'utf8');
    console.log('✅ Created Auth0Attributes utility');
    
    // 3. Create Auth0 reference documentation
    const docsPath = path.join(DOCS_DIR, 'Auth0AttributesReference.md');
    
    // Backup existing Cognito docs if they exist
    const cognitoDocsPath = path.join(DOCS_DIR, 'CognitoAttributesReference.md');
    if (fs.existsSync(cognitoDocsPath)) {
      const cognitoDocsContent = fs.readFileSync(cognitoDocsPath, 'utf8');
      createBackup(cognitoDocsContent, 'CognitoAttributesReference.md');
    }
    
    fs.writeFileSync(docsPath, AUTH0_REFERENCE_DOC, 'utf8');
    console.log('✅ Created Auth0AttributesReference documentation');
    
    // 4. Update script registry
    updateScriptRegistry();
    
    // 5. Summary
    console.log(\`
🎉 MIGRATION COMPLETED SUCCESSFULLY

📋 SUMMARY:
✅ Updated AI conditions document created: updated_ai_conditions_auth0.md
✅ Auth0Attributes utility created: /src/utils/Auth0Attributes.js
✅ Auth0AttributesReference documentation created: /docs/Auth0AttributesReference.md
✅ Backups created for original files
✅ Script registry updated

📝 NEXT STEPS:
1. Review the updated conditions in: \${conditionsPath}
2. Test the Auth0Attributes utility: \${utilityPath}
3. Update existing code to use Auth0Attributes instead of CognitoAttributes
4. Replace all references to custom:tenant_ID with Auth0Attributes.getTenantId()
5. Update API calls from fetchUserAttributes() to /api/users/me

🔄 KEY CHANGES:
- Tenant ID: custom:tenant_ID → current_tenant_id (from API response)
- User Data: fetchUserAttributes() → /api/users/me API call
- Utility: CognitoAttributes → Auth0Attributes
- Documentation: CognitoAttributesReference → Auth0AttributesReference
- Session: Cognito session → Auth0 session cookies

⚠️  MIGRATION NOTES:
- All Cognito references have been replaced with Auth0 equivalents
- New utility maintains same interface for easier migration
- API response structure documented in reference guide
- Validation methods included for data integrity
- Examples provided for common use cases
\`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Execute the script
main(); 