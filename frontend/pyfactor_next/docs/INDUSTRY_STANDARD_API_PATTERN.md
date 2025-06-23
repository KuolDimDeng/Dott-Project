# Industry-Standard API Pattern for Multi-Tenant SaaS

## Overview

This document establishes the **mandatory architecture pattern** for all API endpoints in our multi-tenant SaaS application. This pattern ensures bank-grade security, tenant isolation, and industry compliance.

## Architecture Pattern

All frontend-to-backend communication MUST follow this pattern:

```
Frontend Component → Local Proxy Route → Django Backend → PostgreSQL with RLS
```

## 🔒 Security Benefits

- **Database-enforced isolation** via PostgreSQL Row-Level Security (RLS)
- **Session-based authentication** (no token exposure to frontend)
- **Backend-only tenant management** (zero frontend tenant ID handling)
- **Compliance ready**: SOC2, GDPR, PCI-DSS, HIPAA
- **Zero-trust architecture**: Database is the single source of truth

## 📋 Implementation Requirements

### 1. Frontend API Client Pattern

**✅ REQUIRED Pattern:**
```javascript
// /src/utils/apiClient.js
export const [module]Api = {
  async getAll(params = {}) {
    const response = await fetch('/api/[module]/[resource]', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
  
  async create(data, params = {}) {
    const response = await fetch('/api/[module]/[resource]', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }
    
    return response.json();
  }
  
  // ... update, delete methods follow same pattern
};
```

**❌ FORBIDDEN Patterns:**
```javascript
// NEVER do direct backend calls
const response = await fetch('https://api.dottapps.com/api/...'); // ❌

// NEVER send tenant IDs from frontend
headers: { 'X-Tenant-ID': tenantId } // ❌

// NEVER use localStorage for tenant data
localStorage.getItem('tenantId') // ❌
```

### 2. Local Proxy Route Pattern

**✅ REQUIRED Pattern:**
```javascript
// /src/app/api/[module]/[resource]/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Forward request to Django backend
    // Backend determines tenant from session and sets RLS context
    const response = await fetch(`${API_URL}/api/[module]/[resource]/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Module API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST, PUT, DELETE methods follow same pattern
```

### 3. Django Backend Pattern

**✅ REQUIRED Pattern:**
```python
# models.py
from custom_auth.models import TenantAwareModel, TenantManager

class YourModel(TenantAwareModel):
    # Your fields here
    name = models.CharField(max_length=255)
    
    # REQUIRED: Use TenantManager
    objects = TenantManager()
    all_objects = models.Manager()  # For admin/system use only
    
    class Meta:
        db_table = '[module]_[resource]'

# views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

class YourModelViewSet(viewsets.ModelViewSet):
    serializer_class = YourModelSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Simple - TenantManager handles filtering automatically
        return YourModel.objects.all()
```

**❌ FORBIDDEN Patterns:**
```python
# NEVER manually filter by tenant
queryset.filter(tenant_id=request.user.tenant_id)  # ❌

# NEVER use direct Manager
YourModel.objects.using('tenant_schema')  # ❌

# NEVER check tenant in views
if request.user.tenant_id != object.tenant_id:  # ❌
```

## 🏗️ Working Examples

### Customer Management (Reference Implementation)
- **Frontend**: Uses `customerApi` from `/utils/apiClient.js`
- **Proxy**: `/api/crm/customers/route.js`
- **Backend**: `crm.models.Customer(TenantAwareModel)` + `crm.views.CustomerViewSet`

### Supplier Management (Reference Implementation)
- **Frontend**: Uses `supplierApi` from `/utils/apiClient.js`
- **Proxy**: `/api/inventory/suppliers/route.js`
- **Backend**: `inventory.models.Supplier(TenantAwareModel)` + `inventory.views.SupplierViewSet`

## 🚀 Quick Start Checklist

When creating a new module/resource:

### Frontend Checklist
- [ ] Add `[module]Api` to `/src/utils/apiClient.js`
- [ ] Component uses `[module]Api.getAll()`, `[module]Api.create()`, etc.
- [ ] NO direct backend URLs in components
- [ ] NO tenant ID handling in frontend
- [ ] Uses `credentials: 'include'` for session cookies

### Backend Checklist
- [ ] Model extends `TenantAwareModel`
- [ ] Model uses `objects = TenantManager()`
- [ ] ViewSet extends `viewsets.ModelViewSet`
- [ ] ViewSet has `permission_classes = [IsAuthenticated]`
- [ ] Simple `get_queryset()` returns `YourModel.objects.all()`
- [ ] URLs registered in `/api/[module]/` namespace

### Proxy Route Checklist
- [ ] Created `/api/[module]/[resource]/route.js`
- [ ] Extracts `sid` cookie for authentication
- [ ] Forwards to Django with `Authorization: Session ${sidCookie.value}`
- [ ] Handles GET, POST, PUT, DELETE methods
- [ ] NO tenant ID extraction or forwarding

## 🔐 Security Validation

Every implementation MUST pass these security checks:

1. **Frontend Isolation Test**: Remove all cookies → Should get 401 Unauthorized
2. **Tenant Isolation Test**: Change user tenant → Should not see other tenant's data
3. **Direct Backend Test**: Call Django directly → Should require proper auth headers
4. **RLS Verification**: Database queries automatically filter by tenant context

## 📚 Documentation References

- **Row-Level Security**: `/docs/BACKEND_SINGLE_SOURCE_OF_TRUTH.md`
- **Session Management**: `/docs/SESSION_MANAGEMENT_V2.md`
- **Security Architecture**: `/docs/SECURITY_ENHANCEMENTS_2025.md`
- **Authentication Flow**: `/docs/AUTHENTICATION_FLOW.md`

## ⚠️ Critical Rules

### DO NOT:
- ❌ Call Django backend directly from frontend
- ❌ Send tenant IDs from frontend
- ❌ Use localStorage for tenant data
- ❌ Implement custom tenant filtering in views
- ❌ Create endpoints that bypass authentication

### ALWAYS:
- ✅ Use local proxy routes for all API calls
- ✅ Let backend determine tenant from session
- ✅ Use TenantAwareModel + TenantManager
- ✅ Follow the working customer/supplier examples
- ✅ Test tenant isolation before deploying

## 🏢 Industry Standards Met

This pattern satisfies:
- **SOC 2 Type II**: Access control and data protection
- **GDPR Article 32**: Data isolation and processing
- **PCI DSS**: Secure payment data handling
- **HIPAA**: Patient data segregation
- **ISO 27001**: Information security management

## 📞 Questions?

When in doubt:
1. **Reference**: Look at Customer or Supplier management implementations
2. **Copy**: Use the exact same pattern for your module
3. **Test**: Verify tenant isolation works properly
4. **Document**: Update this guide if you discover improvements

---

**Remember**: This architecture pattern is **non-negotiable** for security and compliance. All new modules MUST follow this pattern exactly.