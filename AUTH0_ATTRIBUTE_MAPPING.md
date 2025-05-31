# Auth0 Attribute Mapping Guide

## Cognito → Auth0 Attribute Migration Map

This document maps all Cognito custom attributes to their new Auth0/Backend equivalents.

### User Attributes

| Cognito Attribute | Auth0/Backend Field | Storage Location | Notes |
|------------------|-------------------|------------------|-------|
| `sub` | `auth0_id` | `auth0_users.auth0_id` | Auth0 unique identifier |
| `email` | `email` | `auth0_users.email` | Primary email |
| `email_verified` | `email_verified` | Auth0 profile | Handled by Auth0 |
| `name` | `name` | `auth0_users.name` | Full name |
| `picture` | `picture` | `auth0_users.picture` | Profile picture URL |
| `custom:tenant_id` | `current_tenant_id` | `auth0_users.current_tenant_id` | Active tenant |
| `custom:tenant_ID` | `current_tenant_id` | `auth0_users.current_tenant_id` | Same as above (case fix) |
| `custom:business_id` | `tenant.id` | `tenants.id` | Now using tenant ID |
| `custom:business_name` | `tenant.name` | `tenants.name` | Business name |
| `custom:user_role` | `role` | `user_tenant_roles.role` | User role in tenant |
| `custom:onboarding_status` | `onboarding_step` | `tenants.onboarding_step` | Current step |
| `custom:setup_done` | `onboarding_completed` | `tenants.onboarding_completed` | Boolean flag |
| `custom:account_status` | `subscription_status` | `tenants.subscription_status` | Active/Inactive |

### Business/Tenant Attributes

| Old Field | New Field | Model | Notes |
|-----------|-----------|-------|-------|
| `businessName` | `name` | `Tenant` | Company name |
| `businessType` | `business_type` | `Tenant` | Industry type |
| `businessSubtypes` | `business_subtypes` | `Tenant` | JSON field |
| `country` | `country` | `Tenant` | ISO country code |
| `businessState` | `business_state` | `Tenant` | State/Province |
| `legalStructure` | `legal_structure` | `Tenant` | LLC, Corp, etc |
| `dateFounded` | `date_founded` | `Tenant` | Date field |
| `taxId` | `tax_id` | `Tenant` | EIN/Tax number |
| `address` | `address` | `Tenant` | Full address |
| `phoneNumber` | `phone_number` | `Tenant` | Contact phone |

### Subscription Attributes

| Old Field | New Field | Model | Notes |
|-----------|-----------|-------|-------|
| `subscription_plan` | `subscription_plan` | `Tenant` | free/professional/enterprise |
| `subscription_interval` | `billing_interval` | `Tenant` | monthly/annual |
| `subscription_status` | `subscription_status` | `Tenant` | active/trialing/past_due |
| `stripe_customer_id` | `stripe_customer_id` | `OnboardingProgress` | Stripe reference |
| `stripe_subscription_id` | `stripe_subscription_id` | `OnboardingProgress` | Stripe reference |

### API Response Mapping

When frontend receives user data, it will be in this format:

```javascript
// Old Cognito format
{
  "attributes": {
    "sub": "123",
    "email": "user@example.com",
    "custom:tenant_id": "abc-123",
    "custom:business_name": "My Company",
    "custom:user_role": "owner"
  }
}

// New Auth0/Backend format
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

### Frontend Code Updates Required

1. **Replace Cognito attribute access:**
   ```javascript
   // Old
   const tenantId = user.attributes['custom:tenant_id'];
   
   // New
   const tenantId = userProfile.tenant?.id;
   ```

2. **Replace attribute updates:**
   ```javascript
   // Old
   await updateUserAttributes({
     userAttributes: { 'custom:tenant_id': tenantId }
   });
   
   // New
   await fetch('/api/users/update-tenant', {
     method: 'POST',
     body: JSON.stringify({ tenant_id: tenantId })
   });
   ```

3. **Check user role:**
   ```javascript
   // Old
   const isOwner = user.attributes['custom:user_role'] === 'owner';
   
   // New
   const isOwner = userProfile.role === 'owner';
   ```

### LocalStorage Migration

During transition, these keys will be removed:
- `userAttributes` → API call to `/api/users/me`
- `tenantId` → From API response
- `onboardingStatus` → From API response
- `businessInfo` → From API response

### Session Management

| Old Method | New Method | Notes |
|------------|------------|-------|
| `fetchAuthSession()` | Auth0 session cookie | Managed by Auth0 |
| `getCurrentUser()` | `/api/users/me` | Backend API call |
| `fetchUserAttributes()` | Included in user profile | Single API response |
| `updateUserAttributes()` | Specific API endpoints | RESTful updates |

## Migration Checklist

- [ ] Update all frontend components using `custom:*` attributes
- [ ] Replace localStorage reads with API calls  
- [ ] Update state management to use new data structure
- [ ] Remove Cognito-specific error handling
- [ ] Update TypeScript interfaces (if applicable)
- [ ] Test all user data access points