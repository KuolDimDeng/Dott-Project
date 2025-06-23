# Backend Troubleshooting Guide - Django/PostgreSQL Issues

*This document contains backend-specific recurring issues and their proven solutions.*

## 🔧 **Issue: OnboardingMiddleware Blocking Module Endpoints**

**Symptoms:**
- Module endpoints return 403 Forbidden
- POST requests work but GET requests fail
- Frontend logs show successful creation but zero fetched items
- Backend logs show middleware blocking messages

**Root Cause Analysis:**
- OnboardingMiddleware has inconsistent `PROTECTED_PATHS` vs `EXEMPT_PATHS`
- Some modules (like CRM) exempt, others (like inventory) protected
- Middleware designed for incomplete onboarding, but blocks completed users

**Solution (Proven Fix):**
```python
# File: /backend/pyfactor/custom_auth/middleware_package/onboarding_middleware.py

# ✅ CORRECT - Add all standard modules to EXEMPT_PATHS
EXEMPT_PATHS = [
    '/api/auth/',
    '/api/sessions/',
    '/api/onboarding/',
    '/api/crm/',        # Customers
    '/api/inventory/',  # Suppliers, Products
    '/api/hr/',         # Employees
    '/api/finance/',    # Transactions
    # Add new business modules here
]

# ❌ ONLY truly restricted modules in PROTECTED_PATHS
PROTECTED_PATHS = [
    '/api/accounting/',  # Advanced features only
    '/api/reports/',     # Analytics features only
]
```

**Verification Steps:**
1. Check Django logs for middleware blocking messages
2. Test API endpoints directly with session authentication
3. Verify EXEMPT_PATHS includes your module
4. Confirm user.onboarding_completed = True in database

**Prevention:**
- Add new business modules to EXEMPT_PATHS by default
- Only use PROTECTED_PATHS for advanced/premium features
- Test with real onboarded user accounts

---

## 🔧 **Issue: PostgreSQL UUID Type Mismatch Errors**

**Symptoms:**
```
ERROR: operator does not exist: information_schema.sql_identifier = uuid
LINE 4: WHERE table_schema = 'cb86762b-3...'
```

**Root Cause Analysis:**
- Dashboard middleware using UUID tenant_id in string context
- PostgreSQL information_schema expects text, not UUID type
- Legacy schema-based queries mixing data types

**Solution:**
```python
# Cast UUID to text in SQL queries
cursor.execute("""
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = %s AND table_name = %s
""", [str(tenant_id), table_name])  # Convert UUID to string

# Alternative: Use text casting in SQL
cursor.execute("""
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = %s::text AND table_name = %s
""", [tenant_id, table_name])
```

**Prevention:**
- Always cast UUIDs to strings for schema queries
- Use consistent data types in SQL comparisons
- Test middleware with real UUID tenant_ids

---

## 🔧 **Issue: RLS Context Not Set During Authentication**

**Symptoms:**
- User authenticated but sees no data
- Database queries return empty results
- RLS policies blocking legitimate access
- ViewSet returns `[]` despite data existing

**Root Cause Analysis:**
- Authentication middleware not setting RLS tenant context
- Database queries running without proper tenant filtering
- Session authentication missing tenant context setup

**Solution:**
```python
# In authentication classes (session_token_auth.py, auth0_authentication.py)
from custom_auth.rls import set_tenant_context

def authenticate(self, request):
    # ... existing authentication logic ...
    
    # Set RLS tenant context after successful authentication
    if hasattr(user, 'tenant_id') and user.tenant_id:
        set_tenant_context(str(user.tenant_id))
        request.tenant_id = user.tenant_id
        logger.debug(f"Set RLS context for tenant: {user.tenant_id}")
    
    return (user, token)
```

**Verification Steps:**
1. Check authentication class logs for RLS context setting
2. Verify `request.tenant_id` is set in ViewSets
3. Test database queries return tenant-filtered data
4. Monitor PostgreSQL logs for RLS policy enforcement

**Prevention:**
- Always set RLS context in authentication classes
- Use TenantManager consistently across models
- Test with multiple tenant scenarios

---

## 🔧 **Issue: ViewSet Tenant Filtering Inconsistencies**

**Symptoms:**
- Some ViewSets return all tenants' data
- Cross-tenant data exposure risk
- Inconsistent security between modules

**Root Cause Analysis:**
- ViewSets using different filtering approaches
- Some rely on TenantManager, others on manual filtering
- Inconsistent security implementation patterns

**Solution - Use Secure Pattern:**
```python
# ✅ SECURE - Use explicit tenant validation like customers
class SecureSupplierViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Explicit tenant validation
        if not hasattr(user, 'tenant_id') or not user.tenant_id:
            raise PermissionDenied("User not associated with tenant")
        
        # Explicit tenant filtering
        return Supplier.objects.filter(tenant_id=user.tenant_id)

# ❌ INSECURE - Relies only on automatic filtering
class SupplierViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Supplier.objects.all()  # Trusts TenantManager
```

**Prevention:**
- Use explicit tenant validation in all ViewSets
- Don't rely solely on TenantManager automatic filtering
- Follow customer management security pattern

---

## 🔧 **Issue: Django Session Backend Errors**

**Symptoms:**
```
TypeError: SessionDetailView.get() got an unexpected keyword argument 'session_id'
```

**Root Cause Analysis:**
- Session ViewSet URL patterns not matching method signatures
- Django REST framework expecting different parameter names
- URL routing misconfiguration

**Solution:**
```python
# Fix URL patterns to match ViewSet methods
urlpatterns = [
    path('sessions/<str:pk>/', SessionDetailView.as_view(), name='session-detail'),
    # Not: path('sessions/<str:session_id>/', ...)
]

# Or fix ViewSet method signature
class SessionDetailView(APIView):
    def get(self, request, pk):  # Use 'pk', not 'session_id'
        # ... implementation
```

**Prevention:**
- Use standard Django REST framework parameter names
- Test URL routing with different parameter types
- Follow DRF ViewSet conventions

---

## 🔧 **Issue: Database Connection Context Errors**

**Symptoms:**
- Intermittent database connection failures
- Schema context lost during requests
- Transaction isolation issues

**Root Cause Analysis:**
- Multiple database connections not sharing context
- RLS context not maintained across connection pools
- Transaction boundaries not properly managed

**Solution:**
```python
# Ensure consistent database context
from django.db import transaction, connection

@transaction.atomic
def view_function(request):
    # Set context for this transaction
    with connection.cursor() as cursor:
        cursor.execute("SET rls.tenant_id = %s", [tenant_id])
        
        # All queries in this transaction use same context
        return YourModel.objects.all()
```

**Prevention:**
- Use database transactions consistently
- Set RLS context at transaction boundaries
- Monitor connection pooling behavior

---

## 📋 **Backend Issue Reporting Template**

```markdown
## 🔧 **Issue: [Brief Description]**

**Symptoms:**
- [Django/PostgreSQL error messages]
- [API endpoint behaviors]
- [Authentication/authorization issues]

**Root Cause Analysis:**
- [Django component involved]
- [Database/ORM behavior]
- [Middleware/authentication factor]

**Solution:**
```python
# Code fix with file paths
```

**Verification Steps:**
1. [Django admin checks]
2. [Database query verification]
3. [API endpoint testing]

**Prevention:**
- [Django best practices]
- [Database configuration]
- [Testing strategies]
```

---

## 📚 **Backend Issue Categories**

### Django Framework Issues
- Middleware order and configuration
- ViewSet and DRF patterns
- URL routing and parameter binding

### PostgreSQL & Database Issues
- RLS context and tenant isolation
- Query type mismatches
- Connection pooling and transactions

### Authentication & Authorization
- Session management and context
- User/tenant association validation
- Permission and security patterns

### Multi-Tenant Architecture
- Tenant context propagation
- Data isolation verification
- Cross-tenant security prevention

---

*Last Updated: 2025-06-23*
*For Frontend Issues: See /frontend/pyfactor_next/docs/TROUBLESHOOTING.md*