# Backend Requirements for Session Management V2

## Django Endpoints Needed

### 1. `/api/sessions/{session_id}/` (GET)
**Purpose**: Retrieve session by ID
**Headers**: `Authorization: SessionID {session_id}`
**Response**:
```json
{
  "email": "user@example.com",
  "tenant_id": "abc-123",
  "needs_onboarding": false,
  "onboarding_completed": true,
  "permissions": ["view_dashboard", "manage_invoices"]
}
```

### 2. `/api/auth/login/` (POST)
**Purpose**: Create new session
**Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "access_token": "existing_token"  // Optional, for migration
}
```
**Response**:
```json
{
  "session_id": "uuid-here",
  "expires_at": "2024-01-20T10:00:00Z"
}
```

### 3. `/api/sessions/{session_id}/` (DELETE)
**Purpose**: Revoke session
**Headers**: `Authorization: SessionID {session_id}`
**Response**: 204 No Content

## Django Model

```python
class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    
    # Session data
    data = models.JSONField(default=dict)
    
    # Security
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    
    # Status
    is_active = models.BooleanField(default=True)
```

## Quick Implementation

If you need a quick fix without full implementation:

```python
# In your existing session views, ensure these responses:

# For /api/sessions/current/
return JsonResponse({
    "email": user.email,
    "tenant_id": str(user.tenant.id),
    "needs_onboarding": user.needs_onboarding,
    "onboarding_completed": user.onboarding_completed,
    "permissions": list(user.get_all_permissions())
})

# For /api/sessions/create/
session = create_session(user)  # Your existing logic
return JsonResponse({
    "session_id": str(session.id),
    "expires_at": session.expires_at.isoformat()
})
```

## Testing Backend

```bash
# Create session
curl -X POST https://api.dottapps.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Get session
curl https://api.dottapps.com/api/sessions/{session_id}/ \
  -H "Authorization: SessionID {session_id}"

# Delete session
curl -X DELETE https://api.dottapps.com/api/sessions/{session_id}/ \
  -H "Authorization: SessionID {session_id}"
```

The frontend is ready to work with these endpoints!