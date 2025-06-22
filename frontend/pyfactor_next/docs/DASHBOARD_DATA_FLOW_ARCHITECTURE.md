# Dashboard Data Flow Architecture

## Industry Standard Pattern for User Profile Data Display

### 1. Single Source of Truth
- **Backend Database** is the authoritative source
- All user profile data (business info, subscription, user details) stored in backend
- Frontend never stores critical business data locally

### 2. Data Models (Backend)

```python
# User Model
- id
- email
- given_name
- family_name
- subscription_plan
- onboarding_completed
- tenant_id

# Tenant Model
- id
- name (business name)
- owner_id
- created_at

# OnboardingProgress Model (temporary during onboarding)
- user_id
- business_name
- business_type
- subscription_plan
- completed_at

# Business Model
- id
- owner_id
- name
- business_type
```

### 3. Data Flow After Onboarding Completion

```
1. Payment Success
   ↓
2. Backend Updates:
   - User.subscription_plan = 'professional'
   - User.onboarding_completed = True
   - Create/Update Tenant with business_name
   - Create/Update Business record
   - Clear OnboardingProgress (or mark as completed)
   ↓
3. Session Refresh
   - Backend returns updated user + tenant data
   ↓
4. Frontend Dashboard
   - Fetches fresh session data
   - Displays user + business info
```

### 4. API Endpoints

```javascript
// Primary endpoint for dashboard data
GET /api/auth/session-v2
Response: {
  user: {
    email: "user@example.com",
    given_name: "John",
    family_name: "Doe",
    subscription_plan: "professional"
  },
  tenant: {
    id: "uuid",
    name: "DOtt" // Business name
  }
}

// Backup endpoint if session doesn't have all data
GET /api/user/profile
Response: {
  ...user fields,
  business: {
    name: "DOtt",
    type: "Administration Services"
  }
}
```

### 5. Frontend Implementation

```javascript
// DashAppBar.js
const DashAppBar = () => {
  const { session } = useSession();
  
  // Extract data from session (primary source)
  const businessName = session?.tenant?.name || session?.user?.businessName;
  const subscriptionPlan = session?.user?.subscription_plan;
  const userInitials = generateInitials(
    session?.user?.given_name,
    session?.user?.family_name,
    session?.user?.email
  );
  
  return (
    <AppBar>
      <BusinessName>{businessName}</BusinessName>
      <SubscriptionBadge plan={subscriptionPlan} />
      <UserAvatar initials={userInitials} />
    </AppBar>
  );
};
```

## Current System Gaps

1. **Session Not Refreshing**: After onboarding completion, the session needs to be refreshed to get latest data
2. **Data Not Copied**: OnboardingProgress data isn't being copied to User/Tenant models
3. **Profile API Authentication**: The profile API is failing due to session token issues

## Fixes Needed

1. **Backend**: Ensure onboarding completion copies all data to permanent models
2. **Session Refresh**: Force session refresh after payment success
3. **Fix Profile API**: Resolve SSL and authentication errors
4. **DashAppBar**: Ensure it reads from the correct session fields