# Immediate Actions for Endpoint Consolidation

## Priority 1: Fix Frontend Usage (This Week)

### 1. Update Profile Endpoint Usage
The frontend heavily uses `/api/profile/` (13+ files). Update these files:

```javascript
// OLD
const response = await fetch('/api/profile/', {...});

// NEW  
const response = await fetch('/api/auth/profile', {...});
```

**Files to update:**
- `/src/app/dashboard/components/forms/EstimateForm.js`
- `/src/app/dashboard/components/forms/CustomerDetails.js`
- `/src/services/userService.js` (uses `/api/user/profile/`)
- All other files using profile endpoints

### 2. Update Session Creation
```javascript
// OLD
const response = await fetch('/api/sessions/create/', {...});

// NEW
const response = await fetch('/api/auth/session-v2', {
  method: 'POST',
  ...
});
```

**File to update:**
- `/src/hooks/useSecureAuth.js`

### 3. Update Onboarding Completion
```javascript
// OLD
const response = await fetch('/api/onboarding/complete/', {...});

// NEW
const response = await fetch('/api/onboarding/complete-all', {...});
```

**File to update:**
- `/src/config/index.js`

## Priority 2: Apply Deprecation Decorators (Today)

Add deprecation decorators to all redundant endpoints. Example:

```python
from core.decorators import deprecated_class_view

@deprecated_class_view('/api/auth/session-v2')
class SessionCreateView(APIView):
    # ... existing code
```

## Priority 3: Create Unified Endpoints

### 1. Create `/api/auth/profile` endpoint
This should combine data from:
- User model
- Tenant model  
- Subscription info
- Business info

### 2. Enhance `/api/auth/session-v2` 
Ensure it handles all session operations:
- GET: Get current session
- POST: Create/update session
- DELETE: Invalidate session

## Monitoring

Add this to your logging configuration to track deprecated endpoint usage:

```python
LOGGING = {
    'handlers': {
        'deprecated_endpoints': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': 'deprecated_endpoints.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'core.decorators.deprecation': {
            'handlers': ['deprecated_endpoints'],
            'level': 'WARNING',
        },
    },
}
```

## Quick Wins (Can do immediately)

1. **Remove duplicate paths**: `/api/onboarding/api/onboarding/complete-all/` (nested path)
2. **Remove debug endpoints**: `/force-complete/`, `/api/diagnostic/`
3. **Consolidate similar named endpoints**: 
   - `/api/auth/register/` → `/api/auth/signup/`
   - `/api/tenants/verify-owner/` → `/api/tenants/verify/`

## Backend URL Configuration Cleanup

In your main `urls.py`, consolidate patterns:

```python
# OLD - Multiple patterns for same functionality
path('api/sessions/', include('session_manager.urls')),
path('api/session/', SessionView.as_view()),  # Remove
path('api/auth/session/', AuthSessionView.as_view()),  # Remove

# NEW - Single pattern
path('api/auth/session-v2', SessionV2View.as_view()),
```

## Testing Checklist

After making changes:
- [ ] Login flow works
- [ ] Session persistence works
- [ ] Profile data loads correctly
- [ ] Onboarding completion works
- [ ] No 404 errors in browser console
- [ ] Deprecation warnings appear in logs