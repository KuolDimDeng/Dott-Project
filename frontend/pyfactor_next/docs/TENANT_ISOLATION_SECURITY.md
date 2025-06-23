# Tenant Isolation Security Implementation

## Overview
This document describes the industry-standard multi-tenant security implementation for the Dott application.

## Architecture

### Backend-First Security Model
All tenant isolation is handled exclusively on the backend. The frontend never determines or validates tenant access.

```
Frontend → API Request (no tenant ID) → Backend → Validates User → Applies Tenant Filter → Returns Data
```

### Key Principles

1. **Single Source of Truth**: The backend user session is the only source of tenant information
2. **Zero Trust Frontend**: Never trust tenant IDs from the frontend
3. **Automatic Filtering**: All queries are automatically filtered by tenant
4. **Defense in Depth**: Multiple layers of security

## Implementation Details

### Frontend (Next.js)

#### API Calls
```javascript
// ✅ CORRECT - No tenant ID needed
const customers = await customerApi.getAll();

// ❌ INCORRECT - Never send tenant ID from frontend
const customers = await customerApi.getAll({ tenant_id: tenantId });
```

#### Proxy Routes
```javascript
// /api/crm/customers/route.js
export async function GET(request) {
  const sidCookie = cookieStore.get('sid');
  
  // Simply forward to backend with session
  const response = await fetch(`${API_URL}/api/crm/customers/`, {
    headers: {
      'Authorization': `Session ${sidCookie.value}`,
    },
  });
  
  return NextResponse.json(await response.json());
}
```

### Backend (Django)

#### Secure ViewSet
```python
class SecureCustomerViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Automatically filter by authenticated user's tenant
        return Customer.objects.filter(tenant_id=self.request.user.tenant_id)
    
    def perform_create(self, serializer):
        # Automatically set tenant from user
        serializer.save(tenant_id=self.request.user.tenant_id)
```

#### Middleware Stack
1. **Authentication Middleware**: Validates session and sets request.user
2. **Tenant Context Middleware**: Sets database session context
3. **RLS Middleware**: Enforces row-level security at database level

### Database (PostgreSQL)

#### Row-Level Security
```sql
-- Enable RLS on tables
ALTER TABLE crm_customer ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY tenant_isolation ON crm_customer
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

## Security Layers

### Layer 1: Application Level
- Django ORM filters by tenant
- ViewSets validate user-tenant relationship
- No cross-tenant data access possible

### Layer 2: Database Level
- PostgreSQL RLS policies
- Automatic filtering even for raw SQL
- Protection against ORM bypass

### Layer 3: API Gateway
- Session validation
- Rate limiting
- Request logging

## Common Vulnerabilities Prevented

1. **Tenant ID Manipulation**: Frontend cannot specify which tenant to access
2. **Direct Object Reference**: IDs alone cannot access other tenants' data
3. **SQL Injection**: RLS protects even if ORM is bypassed
4. **Session Hijacking**: Session fingerprinting and validation

## Best Practices

### DO ✅
- Let backend determine tenant from session
- Use ViewSets with automatic filtering
- Log all data access for audit trails
- Validate user-tenant relationships

### DON'T ❌
- Send tenant IDs from frontend
- Trust any client-provided tenant information
- Bypass ORM without RLS protection
- Store tenant IDs in localStorage/cookies

## Migration Guide

### From Frontend Tenant ID to Backend-Only

1. **Update API Calls**
   ```javascript
   // Before
   const data = await api.get(`/customers?tenant_id=${tenantId}`);
   
   // After
   const data = await api.get('/customers');
   ```

2. **Update Backend Views**
   ```python
   # Before
   def get_queryset(self):
       tenant_id = self.request.query_params.get('tenant_id')
       return Customer.objects.filter(tenant_id=tenant_id)
   
   # After
   def get_queryset(self):
       return Customer.objects.filter(tenant_id=self.request.user.tenant_id)
   ```

3. **Remove Frontend Tenant Logic**
   - Delete `getSecureTenantId()` calls
   - Remove tenant ID from API parameters
   - Clean up localStorage/cookie tenant storage

## Testing

### Security Test Cases
1. **Cross-Tenant Access**: Verify users cannot access other tenants' data
2. **Missing Tenant**: Ensure graceful handling when user has no tenant
3. **Direct API Access**: Test that bypassing frontend still enforces isolation
4. **SQL Injection**: Verify RLS protects against injection attacks

### Test Implementation
```python
def test_tenant_isolation(self):
    # Create two users in different tenants
    user1 = User.objects.create(email='user1@test.com', tenant_id=tenant1.id)
    user2 = User.objects.create(email='user2@test.com', tenant_id=tenant2.id)
    
    # Create customer for tenant1
    customer = Customer.objects.create(
        name='Test Customer',
        tenant_id=tenant1.id
    )
    
    # Authenticate as user2
    self.client.force_authenticate(user=user2)
    
    # Try to access tenant1's customer
    response = self.client.get(f'/api/customers/{customer.id}/')
    
    # Should return 404, not 403 (don't reveal existence)
    self.assertEqual(response.status_code, 404)
```

## Monitoring

### Key Metrics
- Failed tenant access attempts
- Cross-tenant access patterns
- Unusual data access volumes
- Session anomalies

### Logging
```python
logger.info(f"User {user.email} accessed {model} for tenant {tenant_id}")
logger.warning(f"Unauthorized access attempt by {user.email} for tenant {tenant_id}")
```

## Compliance

This implementation helps meet:
- **SOC 2 Type II**: Logical access controls
- **ISO 27001**: Access control policy
- **GDPR**: Data isolation and protection
- **HIPAA**: Minimum necessary access

## Conclusion

By implementing backend-only tenant isolation, we achieve:
- 🔒 **Enhanced Security**: No client-side manipulation possible
- 🚀 **Better Performance**: Automatic query optimization
- 🛡️ **Compliance Ready**: Meets industry standards
- 🔍 **Full Audit Trail**: All access is logged
- 💪 **Maintainable**: Single source of truth

Remember: **The backend is the gatekeeper, the frontend is just the messenger.**