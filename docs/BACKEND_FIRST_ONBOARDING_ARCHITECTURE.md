# Backend-First Onboarding Architecture

## Current Issues
1. Multiple sources of truth (cookies, sessions, database)
2. Frontend tries to manage state that should be backend-controlled
3. Session creation doesn't always reflect actual database state
4. Complex synchronization between frontend and backend

## Recommended Architecture

### 1. Single Source of Truth: Backend Database
- `OnboardingProgress` model is the ONLY source of truth
- Remove all frontend state management for onboarding status
- No more cookies for onboarding status

### 2. API Endpoints

#### GET /api/onboarding/status
```python
# Returns current onboarding status from database
{
    "needs_onboarding": false,
    "status": "complete",
    "current_step": "complete",
    "tenant_id": "xxx",
    "subscription_plan": "professional",
    "completed_steps": ["business_info", "subscription", "payment", "complete"]
}
```

#### POST /api/onboarding/complete
```python
# Marks onboarding as complete in database
# Updates OnboardingProgress.onboarding_status = 'complete'
# Returns success/failure
```

### 3. Session Creation Flow
```python
# In SessionService.create_session():
def create_session(self, user, ...):
    # ALWAYS check OnboardingProgress from database
    progress = OnboardingProgress.objects.filter(user=user).first()
    
    # Set session based on database state
    needs_onboarding = True
    if progress and (progress.onboarding_status == 'complete' or progress.setup_completed):
        needs_onboarding = False
    
    # Create session with database-derived values
    session = UserSession.objects.create(
        user=user,
        needs_onboarding=needs_onboarding,
        ...
    )
```

### 4. Frontend Flow
```javascript
// On sign-in
const { data } = await api.post('/api/auth/authenticate', credentials);

// Check onboarding status from backend
const status = await api.get('/api/onboarding/status');

// Redirect based on backend response
if (status.needs_onboarding) {
    router.push('/onboarding');
} else {
    router.push(`/tenant/${status.tenant_id}/dashboard`);
}
```

### 5. Benefits
- Single source of truth (backend database)
- No sync issues between frontend/backend
- Clear, simple flow
- Easy to debug and maintain
- Works correctly after cache clear

### 6. Implementation Steps
1. Ensure OnboardingProgress is always updated correctly
2. Remove frontend onboarding state management
3. Create simple status endpoint
4. Update session creation to always check database
5. Update frontend to always ask backend for status