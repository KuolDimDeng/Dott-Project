# Auth0 Attributes Reference

This document serves as the source of truth for all Auth0 user profile data used throughout the application after migration from AWS Cognito.

## API Response Structure

The `/api/users/me` endpoint returns user profile data in this format:

```javascript
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
```

## Usage

Always use the Auth0Attributes utility:

```javascript
import Auth0Attributes from '@/utils/Auth0Attributes';

const tenantId = Auth0Attributes.getTenantId(userProfile);
const isOwner = Auth0Attributes.isOwner(userProfile);
const businessName = Auth0Attributes.getBusinessName(userProfile);
```

## Migration from Cognito

| Old Cognito Pattern | New Auth0 Pattern |
|-------------------|------------------|
| `userAttributes['custom:tenant_ID']` | `Auth0Attributes.getTenantId(userProfile)` |
| `userAttributes['custom:businessname']` | `Auth0Attributes.getBusinessName(userProfile)` |
| `userAttributes['custom:userrole']` | `Auth0Attributes.getUserRole(userProfile)` |
| `fetchUserAttributes()` | `fetch('/api/users/me')` |
| `CognitoAttributes` | `Auth0Attributes` |

## Key Changes

- **Tenant ID**: `custom:tenant_ID` → `Auth0Attributes.getTenantId(userProfile)`
- **User Data**: `fetchUserAttributes()` → `fetch('/api/users/me')`
- **Session**: Cognito session → Auth0 session cookies
- **Utility**: `CognitoAttributes` → `Auth0Attributes`
