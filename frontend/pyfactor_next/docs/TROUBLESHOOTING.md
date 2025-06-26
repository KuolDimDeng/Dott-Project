# Common Issues & Solutions - Troubleshooting Guide

*This document contains recurring issues and their proven solutions to prevent re-debugging.*

## 🔧 **Issue: Customer Dropdown Shows Email Instead of Name**

**Symptoms:**
- Customer dropdown displays email addresses only
- User wants format: "Full Name: {customer_id}" (e.g., "Kuol Deng: CUST-001")
- Affects Sales Orders, Invoices, Estimates modules
- Customer names available in data but not displayed properly

**Root Cause Analysis:**
- Dropdown rendering logic only accessing `customer.email`
- Customer data has multiple name fields: `name`, `full_name`, `customerName`, `first_name + last_name`
- No fallback logic for different customer data structures

**Solution (Proven Fix):**
```javascript
// In any management component (SalesOrderManagement.js, InvoiceManagement.js, etc.)

// ✅ CORRECT - Handle multiple name formats with fallback
{customers.map(customer => {
  const customerId = customer.customer_id || customer.customer_number || customer.id;
  const fullName = customer.name || 
                  customer.full_name || 
                  (customer.first_name && customer.last_name ? `${customer.first_name} ${customer.last_name}` : '') ||
                  customer.customerName || 
                  customer.customer_name || 
                  customer.email || 
                  'Unknown Customer';
  return (
    <option key={customer.id} value={customer.id}>
      {fullName}: {customerId}
    </option>
  );
})}

// ❌ WRONG - Only shows email
<option key={customer.id} value={customer.id}>
  {customer.email}
</option>
```

**Apply Same Fix To:**
1. **Dropdown Selection**: Customer selection in forms
2. **List Display**: Show customer name in data tables
3. **Details View**: Display full customer info in detail sections

**Files Commonly Affected:**
- `/src/app/dashboard/components/forms/SalesOrderManagement.js`
- `/src/app/dashboard/components/forms/InvoiceManagement.js`
- `/src/app/dashboard/components/forms/EstimateManagement.js`
- `/src/app/dashboard/components/forms/PaymentManagement.js`

**Prevention:**
- Create reusable `getCustomerDisplayName()` utility function
- Standardize customer data structure from backend
- Always handle multiple name field variations

---

## 🔧 **Issue: Sales Order Creation Fails with Field Errors**

**Symptoms:**
- Sales order creation returns 400 error
- Error: `{"customer":["This field is required."],"date":["This field is required."],"items":[{"description":["This field may not be blank."]}]}`
- Frontend console shows successful data but backend rejects it
- Works in development but fails in production

**Root Cause Analysis:**
- Frontend and backend use different field names for the same data
- Frontend sends `customer_id` but backend expects `customer`
- Frontend sends `order_date` but backend expects `date`
- Backend requires item `description` to not be blank
- Field mapping mismatch between frontend models and Django serializers

**Solution (Proven Fix):**
```javascript
// In: /src/app/api/sales/orders/route.js

// ✅ CORRECT - Transform frontend data to backend format
const backendData = {
  customer: body.customer_id,  // Backend expects 'customer' not 'customer_id'
  date: body.order_date,       // Backend expects 'date' not 'order_date'
  due_date: body.due_date,
  status: body.status || 'pending',
  payment_terms: body.payment_terms,
  discount: body.discount_percentage || 0,
  shipping_cost: body.shipping_cost || 0,
  tax_rate: body.tax_rate || 0,
  notes: body.notes || '',
  items: body.items?.map(item => ({
    item_type: item.type || 'product',
    product: item.type === 'product' ? item.item_id : null,
    service: item.type === 'service' ? item.item_id : null,
    description: item.description || item.name || 'Item',  // Never blank
    quantity: item.quantity || 1,
    unit_price: item.unit_price || 0
  })) || []
};

// ❌ WRONG - Sending frontend format directly to backend
body: JSON.stringify(body)  // This will fail!
```

**Also Transform Response Data:**
```javascript
// Transform backend response to frontend format
const transformedData = {
  ...data,
  customer_id: data.customer,
  order_date: data.date,
  order_number: data.order_number || data.id,
  total_amount: data.total_amount || data.totalAmount || data.total
};
```

**Field Mapping Reference:**
| Frontend Field | Backend Field | Notes |
|---------------|---------------|-------|
| customer_id | customer | UUID of customer |
| order_date | date | Date field |
| item_id | product/service | Based on item_type |
| total_amount | totalAmount/total | Multiple possible names |

**Prevention:**
- Always check Django serializer field names vs frontend field names
- Add data transformation layer in API proxy routes
- Provide default values for required fields
- Test with actual backend API, not just frontend validation

**Related Files:**
- `/src/app/api/sales/orders/route.js` - API proxy with transformations
- `/backend/pyfactor/sales/serializers_new.py` - Django serializer definitions
- `/src/app/dashboard/components/forms/SalesOrderManagement.js` - Frontend form

---

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

## 🔧 **Issue: Cognito References and Empty Supplier Dropdown in Product Management**

**Symptoms:**
- Console error: "No secure tenant ID found in Cognito" 
- Supplier dropdown appears empty despite API returning data
- Product creation/editing works but supplier selection unavailable
- Locations dropdown works but suppliers doesn't

**Root Cause Analysis:**
1. **Legacy Cognito References**: `tenantUtils.js` still importing from Amplify/Cognito instead of Auth0
2. **API Response Format**: Frontend expects direct array but Django returns paginated response:
   ```json
   {
     "count": 2,
     "results": [{"id": "...", "name": "Supplier Name"}]
   }
   ```
3. **Missing API Prefix**: Some endpoints using `/inventory/products/` instead of `/api/inventory/products/`

**Solution (Proven Fix):**

1. **Update tenantUtils.js** to use Auth0:
```javascript
// ❌ OLD - Remove Cognito imports
import { getCurrentUser } from '@/utils/amplifyUnified';

// ✅ NEW - Use Auth0 session
import { sessionManagerEnhanced } from '@/utils/sessionManager-v2-enhanced';

export const getTenantId = async () => {
  try {
    const session = await sessionManagerEnhanced.getSession();
    if (session?.user?.tenantId) {
      return session.user.tenantId;
    }
  } catch (error) {
    console.error('[tenantUtils] Error getting tenant ID from Auth0 session:', error);
  }
  // Fallback logic...
};
```

2. **Handle Django Pagination** in ProductManagement.js:
```javascript
// Handle paginated responses from Django
const data = await response.json();
let supplierList = [];
if (Array.isArray(data)) {
  supplierList = data;
} else if (data && Array.isArray(data.results)) {
  supplierList = data.results;  // Django pagination format
} else if (data && Array.isArray(data.data)) {
  supplierList = data.data;
}
setSuppliers(supplierList);
```

3. **Fix API Endpoints**:
```javascript
// ❌ OLD
const response = await fetch('/inventory/products/', {...});

// ✅ NEW
const response = await fetch('/api/inventory/products', {...});
```

**Verification Steps:**
1. Check console - no more Cognito errors
2. Verify supplier dropdown populates with data
3. Test creating product with supplier selection
4. Confirm supplier name appears in product details

**Prevention:**
- Search for any remaining Cognito/Amplify imports and replace with Auth0
- Always handle both direct array and paginated API responses
- Use consistent `/api/` prefix for all backend calls
- Test dropdowns with actual API data, not just mock data

**Related Issues:**
- Auth0 migration incomplete in some utilities
- Django REST Framework pagination not handled in frontend
- Inconsistent API endpoint patterns

---

## 🔧 **Issue: Page Titles Using Emoji Icons Instead of Professional SVG Icons**

**Symptoms:**
- Page titles display emoji icons (📦, 🛠️, 🛒, etc.)
- Inconsistent with Settings page which uses Heroicons
- User wants professional SVG icons with blue color styling
- Affects all management pages in Sales and other modules

**Root Cause Analysis:**
- Initial implementation used emoji characters for quick visual identification
- Settings page uses professional Heroicons from `@heroicons/react/24/outline`
- Inconsistent styling across different modules
- No established icon standard in documentation

**Solution (Proven Fix):**
```javascript
// ❌ OLD - Emoji style
<h1 className="text-2xl font-bold text-black mb-4">
  📦 Product Management
</h1>

// ✅ NEW - Heroicons style (matches Settings page)
import { CubeIcon } from '@heroicons/react/24/outline';

<h1 className="text-2xl font-bold text-black mb-4 flex items-center">
  <CubeIcon className="h-6 w-6 text-blue-600 mr-2" />
  Product Management
</h1>
```

**Icon Mapping Reference:**
| Page | Old Emoji | New Heroicon | Import |
|------|-----------|--------------|--------|
| Product Management | 📦 | CubeIcon | `@heroicons/react/24/outline` |
| Service Management | 🛠️ | WrenchScrewdriverIcon | `@heroicons/react/24/outline` |
| Sales Order Management | 🛒 | ShoppingCartIcon | `@heroicons/react/24/outline` |
| Customer Management | 👥 | UserGroupIcon | `@heroicons/react/24/outline` |
| Invoice Management | 📄 | DocumentTextIcon | `@heroicons/react/24/outline` |
| Estimate Management | 📋 | ClipboardDocumentListIcon | `@heroicons/react/24/outline` |

**Standard Icon Styling:**
- Size: `h-6 w-6` (24x24 pixels)
- Color: `text-blue-600` (blue-600 from Tailwind)
- Spacing: `mr-2` (8px right margin)
- Container: `flex items-center` (vertically centered)

**Prevention:**
- Always use Heroicons for page titles and navigation
- Follow Settings page pattern for consistency
- Maintain icon mapping documentation
- Use blue-600 color for all page title icons

**Related Files:**
- `/src/app/Settings/components/SettingsManagement.js` - Reference implementation
- All management pages in `/src/app/dashboard/components/forms/`

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

*Last Updated: 2025-06-24*
*Next Review: When new patterns emerge*