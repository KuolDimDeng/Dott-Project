# Common Issues & Solutions - Troubleshooting Guide

*This document contains recurring issues and their proven solutions to prevent re-debugging.*

## 🔧 **Issue: Module Creates Successfully But Fetching Returns Empty Results**

**Symptoms:**
- POST requests work (201 Created responses)
- Objects created with correct `tenant_id` in database
- GET requests return 200 OK but empty array `[]`
- Frontend logs show "Fetched [module]: 0" despite successful creation

**Root Cause Analysis:**
1. **OnboardingMiddleware Inconsistency**: Some modules in `PROTECTED_PATHS`, others in `EXEMPT_PATHS`
2. **Authentication Flow Mismatch**: Different auth patterns between modules
3. **RLS Context Issues**: Tenant context not properly set during authentication

**Solution (Proven Fix):**
```python
# In: /backend/pyfactor/custom_auth/middleware_package/onboarding_middleware.py

# ✅ CORRECT - Add module to EXEMPT_PATHS
EXEMPT_PATHS = [
    '/api/crm/',       # Customers
    '/api/inventory/', # Suppliers, Products
    '/api/hr/',        # Employees
    # Add new modules here
]

# ❌ REMOVE from PROTECTED_PATHS
PROTECTED_PATHS = [
    '/api/accounting/',  # Only truly restricted modules
    '/api/reports/',
]
```

**Verification Steps:**
1. Check browser network tab: ensure no 403 responses
2. Verify tenant_id in created objects matches session tenant
3. Test both creation and fetching in same session
4. Check backend logs for middleware blocking messages

**Prevention:**
- Always add new modules to `EXEMPT_PATHS` initially
- Use industry-standard API pattern for all modules
- Test both create AND fetch operations during development

**Related Issues:**
- Module works in development but fails in production
- Inconsistent behavior between different resource types
- Frontend shows cached data but API returns empty

---

## 🔧 **Issue: Authentication Errors After Onboarding Changes**

**Symptoms:**
- 401 Unauthorized on previously working endpoints
- Session appears valid but backend rejects requests
- User logged in but gets permission denied

**Root Cause Analysis:**
1. **Middleware Order**: Authentication middleware running after blocking middleware
2. **Session Context**: RLS context not set during authentication process
3. **Cookie/Session Mismatch**: Frontend and backend session state out of sync

**Solution:**
1. Check middleware order in Django settings
2. Verify RLS context setting in authentication classes
3. Clear browser cookies and re-authenticate
4. Check session expiry and refresh tokens

**Prevention:**
- Test authentication flow after any middleware changes
- Use consistent session management patterns
- Monitor authentication logs for context issues

---

## 🔧 **Issue: Database Query Errors in Dashboard Middleware**

**Symptoms:**
```
ERROR: operator does not exist: information_schema.sql_identifier = uuid
LINE 4: WHERE table_schema = 'cb86762b-3...'
```

**Root Cause Analysis:**
- Dashboard middleware comparing UUID to string incorrectly
- PostgreSQL type system enforcement in schema queries

**Solution:**
1. Cast UUID to text in schema comparison queries
2. Update dashboard middleware schema detection logic
3. Consider removing legacy schema-based tenant isolation

**Prevention:**
- Use consistent data types in SQL comparisons
- Test middleware with real UUID tenant IDs
- Monitor database logs for type mismatch errors

---

## 🔧 **Issue: Django REST Framework Paginated Response Not Displaying Data**

**Symptoms:**
- API returns successful response with data (large response size in bytes)
- Frontend shows 0 items in list (e.g., "Fetched suppliers: 0")
- Network tab shows 200 OK with substantial response body
- Data creates successfully but list remains empty

**Root Cause Analysis:**
- Django REST Framework returns paginated responses by default
- Frontend expects direct array but receives object with pagination metadata
- Response structure mismatch: `{ count: X, results: [...] }` vs `[...]`
- Frontend tries to use `.length` on object, gets undefined/0

**Solution:**
```javascript
// ✅ CORRECT - Handle both paginated and direct array responses
const data = await api.getAll();
let items = [];
if (Array.isArray(data)) {
  items = data;  // Direct array response
} else if (data && Array.isArray(data.results)) {
  items = data.results;  // DRF paginated response
} else if (data && Array.isArray(data.data)) {
  items = data.data;  // Alternative format
}
setItems(items);

// ❌ INCORRECT - Assumes direct array
const data = await api.getAll();
setItems(data);  // Fails if data is paginated object
```

**Debugging Steps:**
1. Add console logs to inspect API response structure
2. Check for pagination keys: `count`, `next`, `previous`, `results`
3. Verify backend ViewSet pagination settings
4. Ensure frontend handles all possible response formats

**Prevention:**
- Always check API response structure before assuming format
- Create reusable response parser for consistent handling
- Document expected API response formats
- Consider disabling pagination for small datasets in Django

**Related Backend Configuration:**
```python
# To disable pagination for specific ViewSet
class SupplierViewSet(viewsets.ModelViewSet):
    pagination_class = None  # Returns direct array

# Or configure globally in settings.py
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': None,  # Disable pagination
}
```

---

## 📋 **Issue Reporting Template**

When documenting new issues, use this format:

```markdown
## 🔧 **Issue: [Brief Description]**

**Symptoms:**
- [What user sees/experiences]
- [Error messages or logs]
- [Specific behaviors]

**Root Cause Analysis:**
- [Technical reason for failure]
- [System component involved]
- [Why it happens]

**Solution:**
[Step-by-step fix with code examples]

**Verification Steps:**
1. [How to confirm fix works]
2. [Testing procedures]

**Prevention:**
- [How to avoid in future]
- [Best practices to follow]

**Related Issues:**
- [Similar problems or patterns]
```

---

## 📚 **Categories of Common Issues**

### Authentication & Session Management
- OnboardingMiddleware blocking issues
- Session context problems
- Token refresh failures

### Database & RLS Issues  
- Tenant isolation problems
- Query type mismatches
- Connection context errors

### API Pattern Issues
- Inconsistent endpoint behavior
- Missing proxy routes
- Frontend/backend auth mismatches

### Module Development Issues
- ViewSet implementation problems
- Manager configuration errors
- URL pattern conflicts

---

*Last Updated: 2025-06-23*
*Next Review: When new patterns emerge*