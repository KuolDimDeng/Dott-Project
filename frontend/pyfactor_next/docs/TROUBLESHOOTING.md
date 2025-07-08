# Common Issues & Solutions - Troubleshooting Guide

*This document contains recurring issues and their proven solutions to prevent re-debugging.*

---

# Frontend Component Issues

## Dashboard Drawer Toggle Not Working

**Issue**: The drawer open/close hamburger icon stops working after a few clicks, and the content area doesn't expand/contract in sync with the drawer state.

**Symptoms**:
- Clicking the hamburger menu icon doesn't toggle the drawer
- Content area remains in the same position regardless of drawer state
- Console shows toggle clicks but state remains unchanged
- Drawer may start in closed state instead of open

**Root Cause**:
- Stale closure issue in React callbacks capturing initial state values
- State setter callbacks had dependencies on `uiState` values causing them to never update
- Memoization preventing re-renders when drawer state changes

**Solution**:
1. Use functional state updates for all state setters to avoid stale closures:
   ```javascript
   // Before - captures initial state value
   const setDrawerOpen = useCallback((value) => {
     if (value === uiState.drawerOpen) return; // This always sees initial value!
     updateState({ drawerOpen: value });
   }, [updateState, uiState.drawerOpen]);

   // After - uses functional update
   const setDrawerOpen = useCallback((value) => {
     updateState(prev => {
       const newValue = typeof value === 'function' ? value(prev.drawerOpen) : value;
       if (newValue === prev.drawerOpen) return prev;
       return { ...prev, drawerOpen: newValue };
     });
   }, [updateState]); // No dependency on uiState!
   ```

2. Ensure all state setters use the same pattern:
   ```javascript
   const setView = useCallback((value) => {
     updateState(prev => {
       if (value === prev.view) return prev;
       return { ...prev, view: value };
     });
   }, [updateState]);
   ```

3. Fix content area to use proper constants:
   ```javascript
   // Use iconOnlyWidth constant instead of hardcoded '60px'
   left: drawerOpen ? `${drawerWidth}px` : `${iconOnlyWidth}px`
   ```

4. Set drawer to start open by default:
   ```javascript
   drawerOpen: true, // Start with drawer open by default
   ```

**Implementation Details**:
- The issue was that callbacks were capturing the initial state value and never seeing updates
- Functional updates ensure callbacks always work with the current state
- Removed all `uiState.*` dependencies from callback dependency arrays
- This pattern must be applied to ALL state setters to prevent similar issues

**Files Changed**:
- `/src/components/Dashboard/DashboardContent.js` - Fixed all state setter callbacks
- `/src/app/dashboard/components/DashAppBar.js` - Added handleDrawerToggle to memoization
- `/src/app/dashboard/components/Drawer.js` - Added debugging attributes

---

## POS System - React Error #130 (undefined render)

**Issue**: POS System fails to open with "Error Loading POS System" and React error #130.

**Error Messages**:
```
Minified React error #130; visit https://react.dev/errors/130?args[]=undefined&args[]= 
for the full message or use the non-minified dev environment for full errors
```

**Symptoms**:
- Clicking "Sales" in Create New menu shows error boundary
- Error message appears at bottom of content page
- Console shows React error about rendering undefined

**Root Cause**:
- Headless UI Transition component incompatibility with `as={Fragment}` prop
- Missing or undefined imports (BarcodeIcon from Heroicons)
- Potential undefined logger references
- React attempting to render undefined values

**Solution**:
1. Remove `as={Fragment}` from Transition components:
   ```javascript
   // Before
   <Transition appear show={isOpen} as={Fragment}>
   
   // After
   <Transition appear show={isOpen}>
   ```

2. Create custom BarcodeIcon if missing:
   ```javascript
   const BarcodeIcon = (props) => (
     <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="..." />
     </svg>
   );
   ```

3. Add safe logger fallback:
   ```javascript
   const safeLogger = logger || { info: console.log, error: console.error };
   ```

4. Add null safety checks for all object properties:
   ```javascript
   // Use optional chaining and fallbacks
   <span>${totals?.total || '0.00'}</span>
   ```

**Related Issues**:
- Camera scanner CSP errors (doesn't affect USB scanners)
- QR scanner library dynamic import for SSR compatibility

**Files Changed**:
- `/src/app/dashboard/components/pos/POSSystem.js`

---

## POS System - Barcode Scanner Detection Feature

**Feature Added**: 2025-01-28

**Description**: Automatic detection of USB barcode scanners with visual feedback and improved UX.

**How it Works**:
1. System detects rapid keypress patterns (< 30ms between keys)
2. Shows toast notification when scanner is detected
3. Displays visual status indicator: "Scanner Ready" (green) or "Scanning..." (blue)
4. Auto-focuses search field when scanner detected
5. Shows setup instructions for users without connected scanners

**User Benefits**:
- Immediate feedback when scanner is connected
- Clear visual indicators of scanner status
- No configuration required - plug and scan
- Helpful setup instructions for new users

**Implementation Details**:
- Detection based on keypress timing analysis
- Status states: 'waiting', 'detected', 'active'
- Visual feedback with color-coded indicators
- Auto-focus enhancement for faster scanning

**Files Changed**:
- `/src/app/dashboard/components/pos/POSSystem.js`

---

## Session Cookie Persistence Issue (Authentication Loop)

**Issue**: After successful authentication, users are redirected back to signin page because session cookies aren't being set properly.

**Symptoms**:
- Login succeeds (session token created in backend)
- User is redirected to dashboard
- Middleware shows no cookies: `[Middleware] All cookies: []`
- User is immediately redirected back to signin
- Infinite authentication loop

**Root Cause**:
- Next.js API routes don't properly forward Set-Cookie headers from backend responses
- The backend Django service sets cookies in its response, but these are lost when the Next.js API route returns its own response
- Using `response.headers.append('Set-Cookie', ...)` or `cookies().set()` in the API route doesn't work reliably in production

**Solution**: Use the Session Bridge Pattern
1. **Don't set cookies in API routes** - Return session data instead
2. **Use sessionStorage** as temporary storage during redirect
3. **Session Bridge page** handles cookie setting through a form POST

**Implementation**:

1. **Consolidated Login API** (`/api/auth/consolidated-login/route.js`):
   ```javascript
   // Don't try to set cookies here
   return NextResponse.json({
     success: true,
     ...authData,
     ...sessionData,
     useSessionBridge: true,
     sessionToken: sessionData.session_token
   });
   ```

2. **EmailPasswordSignIn Component**:
   ```javascript
   if (loginResult.success && loginResult.useSessionBridge) {
     // Store session data in sessionStorage for the bridge
     const bridgeData = {
       token: loginResult.sessionToken,
       redirectUrl: redirectUrl,
       timestamp: Date.now(),
       email: loginResult.user?.email,
       tenantId: loginResult.tenant?.id
     };
     
     sessionStorage.setItem('session_bridge', JSON.stringify(bridgeData));
     router.push('/auth/session-bridge');
     return;
   }
   ```

3. **Session Bridge Page** (`/auth/session-bridge/page.js`):
   - Retrieves data from sessionStorage
   - Exchanges token via GET to `/api/auth/bridge-session`
   - Submits form POST to `/api/auth/establish-session`
   - Form POST properly sets cookies and redirects

4. **Establish Session API** (`/api/auth/establish-session/route.js`):
   ```javascript
   // Form POST handler that sets cookies and redirects
   const formData = await request.formData();
   const token = formData.get('token');
   
   const cookieStore = await cookies();
   cookieStore.set('sid', token, cookieOptions);
   cookieStore.set('session_token', token, cookieOptions);
   
   return NextResponse.redirect(new URL(redirectUrl, request.url));
   ```

**Why This Works**:
- Form POST requests handle cookies differently than API responses
- The redirect response from establish-session properly sets cookies
- Session bridge provides a clean handoff between authentication and session establishment

**Files Changed**:
- `/src/app/api/auth/consolidated-login/route.js`
- `/src/components/auth/EmailPasswordSignIn.js`
- `/src/app/auth/session-bridge/page.js`
- `/src/app/api/auth/bridge-session/route.js`
- `/src/app/api/auth/establish-session/route.js`

---

## POS System - Camera Scanner CSP Errors

**Issue**: Camera scanner shows CSP errors and "Camera not found" messages.

**Error Messages**:
```
Content-Security-Policy: The page's settings blocked a worker script (worker-src) 
at blob:https://dottapps.com/... from being executed because it violates the 
following directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval'..."

Camera access denied: Camera not found.
```

**Symptoms**:
- Camera Scanner button doesn't work
- Console shows CSP worker-src violations
- USB scanner still works fine

**Root Cause**:
- QR scanner library uses Web Workers with blob URLs
- CSP policy doesn't allow worker-src blob: URLs
- Browser security restrictions

**Solution for USB Scanners** (Recommended):
1. Use USB barcode scanners instead of camera
2. Click in the search field and scan - it acts as keyboard input
3. Scanner automatically sends Enter key after barcode
4. **NEW**: Scanner auto-detection feature added:
   - POS System now detects when a USB scanner is connected
   - Shows green "Scanner Ready" indicator when detected
   - Shows blue "Scanning..." indicator during active scans
   - Auto-focuses search field when scanner is detected
   - Displays setup instructions if no scanner detected yet

**Solution for Camera Scanner** (Requires CSP update):
1. Update next.config.js to allow blob: URLs for workers:
   ```javascript
   'worker-src': ["'self'", "blob:"],
   ```

2. Or disable camera scanner feature and use USB only

**Workaround**:
- USB scanners work without any CSP issues
- Most retail environments prefer USB scanners for speed and reliability

---

# Database Migration Issues

## Missing Multiple Columns in sales_salesorder Table

**Issue**: Creating sales orders fails with database errors for missing columns.

**Error Messages**:
```
django.db.utils.ProgrammingError: column sales_salesorder.due_date does not exist
django.db.utils.ProgrammingError: column sales_salesorder.payment_terms does not exist
django.db.utils.ProgrammingError: column "item_type" of relation "sales_salesorderitem" does not exist
```

**Symptoms**:
- Sales order creation returns 500 error
- Backend logs show missing column errors
- Multiple fields exist in Django model but not in database

**Root Cause**:
- Django SalesOrder and SalesOrderItem models have been updated with new fields
- Database migrations were not run to add the columns
- SalesOrder table missing: payment_terms, due_date, subtotal, tax_total, tax_rate, discount_percentage, shipping_cost, total, total_amount, notes, estimate_id
- SalesOrderItem table missing: item_type, product_id, service_id, item_id, description, quantity, unit_price, tax_rate, tax_amount, total

**Solution**:
1. First, resolve any migration conflicts:
   ```bash
   python manage.py makemigrations --merge
   python manage.py migrate custom_auth
   ```

2. Check migration status:
   ```bash
   python manage.py showmigrations sales
   ```

3. Apply the comprehensive migrations:
   ```bash
   python manage.py migrate sales 0005
   python manage.py migrate sales 0006
   ```

4. Verify all columns were added:
   ```bash
   python manage.py dbshell
   \d sales_salesorder
   ```

**Migration Details**:
- File 1: `/backend/pyfactor/sales/migrations/0005_add_missing_salesorder_fields.py`
  - Adds ALL missing fields to sales_salesorder table
- File 2: `/backend/pyfactor/sales/migrations/0006_add_missing_salesorderitem_fields.py`
  - Adds ALL missing fields to sales_salesorderitem table
- Both migrations use conditional SQL to safely check if columns exist before adding
- Safe to run multiple times
- Default values provided for all fields

**Fields Added**:
- `payment_terms`: VARCHAR(50), default 'net_30'
- `due_date`: DATE, default current date + 30 days
- `subtotal`: DECIMAL(19,4), default 0
- `tax_total`: DECIMAL(19,4), default 0
- `tax_rate`: DECIMAL(5,2), default 0
- `discount_percentage`: DECIMAL(5,2), default 0
- `shipping_cost`: DECIMAL(10,2), default 0
- `total`: DECIMAL(19,4), default 0
- `total_amount`: DECIMAL(19,4), default 0
- `notes`: TEXT, nullable
- `estimate_id`: UUID, nullable

**Migration Workflow (Local vs Production)**:
```bash
# 1. Generate migrations locally FIRST
python manage.py makemigrations
python manage.py makemigrations sales  # For specific app

# 2. Commit and push migration files
git add backend/pyfactor/*/migrations/
git commit -m "Add database migrations"
git push origin Dott_Main_Dev_Deploy

# 3. THEN run migrations on Render
python manage.py migrate
```

**Important**: Never run migrations on production without committing migration files locally first. This ensures version control and team synchronization.

**Prevention**:
- Always run migrations after model changes
- Check migration status before deploying
- Use `python manage.py makemigrations --check` in CI/CD
- Keep database schema in sync with Django models
- Generate migrations locally before production deployment

---

# UI/UX Issues

## Icon Standardization

**Issue**: All page titles should use professional SVG icons from Heroicons instead of emojis, matching the Settings page style.

**Symptoms**:
- Page titles use emoji icons (📦, 🛠️, 🛒, etc.)
- Inconsistent styling across pages
- Not professional appearance

**Solution**:
1. Import appropriate Heroicon:
   ```javascript
   import { IconName } from '@heroicons/react/24/outline';
   ```

2. Replace emoji with Heroicon in page title:
   ```jsx
   // Old (emoji style)
   <h1 className="text-2xl font-bold text-black mb-4">
     📦 Product Management
   </h1>
   
   // New (Heroicons style)
   <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
     <CubeIcon className="h-6 w-6 text-blue-600 mr-2" />
     Product Management
   </h1>
   ```

3. Add page description below title:
   ```jsx
   <p className="text-gray-600 text-sm mb-6">
     Brief description of page functionality...
   </p>
   ```

**Icon Style Requirements**:
- Size: `h-6 w-6` (24x24 pixels)
- Color: `text-blue-600`
- Spacing: `mr-2` (8px right margin)
- Container: `flex items-center` for alignment

**Icon Mapping Reference**: See `/docs/UI_STANDARDS.md` for complete icon mapping guide.

---

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

## 🔧 **Issue: My Account Profile Tab Not Displaying User Name and Email**

**Symptoms:**
- My Account page shows empty fields for Full Name and Email Address
- User menu dropdown displays name and email correctly
- Profile API returns data but fields remain blank
- Console shows profile data being fetched but not displayed

**Root Cause Analysis:**
1. **Data Source Mismatch**: Component was relying on API call instead of session data
2. **Field Name Variations**: Different field names across data sources (name vs first_name/last_name vs given_name/family_name)
3. **Session Data Not Used**: Unlike user menu, My Account wasn't using the useSession hook

**Solution:**
```javascript
// Import useSession hook (same as user menu)
import { useSession } from '@/hooks/useSession-v2';

// Get session data in component
const { session, loading: sessionLoading } = useSession();

// Use session data to populate profile
useEffect(() => {
  if (session?.user && !sessionLoading) {
    const sessionUser = session.user;
    setProfileData(sessionUser);
    setProfilePhoto(sessionUser.picture || sessionUser.profilePhoto);
    setLoading(false);
  } else if (!sessionLoading) {
    // Fallback to API if no session
    fetchProfileData();
  }
}, [session, sessionLoading]);

// Merge all data sources when rendering
const user = {
  ...(userData || {}),
  ...(profileData || {}),
  ...(session?.user || {})  // Session data takes priority
};

// Handle all name field variations
value={
  user.name || 
  `${user.first_name || user.firstName || user.given_name || ''} ${user.last_name || user.lastName || user.family_name || ''}`.trim() || 
  ''
}
```

**Key Changes:**
1. Added `useSession` hook to get session data directly
2. Session data used as primary source, API as fallback
3. Merged all data sources with session taking priority
4. Fixed name field to handle all field name variations

**Verification Steps:**
1. Check session contains user data: `session.user.email`, `session.user.name`
2. Verify name displays correctly with all formats
3. Email field shows session email
4. Profile loads immediately without waiting for API

**Prevention:**
- Always use useSession hook for user data (consistent with user menu)
- Handle all field name variations (name, first_name/last_name, given_name/family_name)
- Use session as primary data source, API as fallback
- Test with different user data formats

**Related Files:**
- `/src/app/Settings/components/MyAccount.modern.js`
- `/src/hooks/useSession-v2.js`
- `/src/app/dashboard/components/DashAppBar.js` (reference implementation)

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

---

# Frontend Navigation & Rendering Issues

## Menu Navigation Not Working

**Quick Fix**: If menu items aren't rendering when clicked, they're likely missing navigation event dispatching. See "Menu Pages Not Rendering Due to Missing Navigation Events" section below for the complete solution.

## Payment Pages Infinite Render Loop

**Issue**: Payment pages stuck in infinite render loop, never fully loading.

**Error Messages**:
```
[PaymentPlans] Plans loaded successfully (repeated infinitely)
NS_BINDING_ABORTED for Stripe iframe
Multiple rapid /api/metrics/session calls
```

**Symptoms**:
- Payment menu items don't render content
- Console shows components loading successfully but pages remain blank
- Session API endpoint called dozens of times per second
- Browser becomes unresponsive

**Root Cause**:
1. **Async Function Misuse**: Payment components using `getSecureTenantId()` synchronously:
   ```javascript
   // ❌ WRONG - Returns a Promise object that changes every render
   const tenantId = getSecureTenantId();
   ```
   Since `tenantId` was in the dependency array of `useCallback`, it triggered infinite re-renders.

2. **Double Navigation**: Menu items dispatching events AND calling `handlePaymentsClick`, causing view state conflicts.

**Solution**:

1. **Fix Async Tenant ID Usage**:
```javascript
// ✅ CORRECT - Properly handle async operation
const [tenantId, setTenantId] = useState(null);

useEffect(() => {
  const fetchTenantId = async () => {
    const id = await getSecureTenantId();
    setTenantId(id);
  };
  fetchTenantId();
}, []);

// Wait for tenant ID to load
if (!tenantId) {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
```

2. **Remove Duplicate Navigation Handlers** in listItems.js:
```javascript
// ❌ OLD - Double navigation
window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
if (typeof handlePaymentsClick === 'function') {
  handlePaymentsClick('payments-dashboard');
}

// ✅ NEW - Single event dispatch
window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
// The menuNavigation event handler in DashboardContent handles view updates
```

**Files Fixed**:
- All payment components (PaymentPlans.js, PaymentGateways.js, etc.)
- listItems.js navigation handlers
- Total: 10 payment component files

**Prevention**:
- Always use `useState` + `useEffect` for async operations in React
- Never put Promises in dependency arrays
- Use single navigation pattern (events OR callbacks, not both)

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

## 🔧 **Issue: Sales Order Creation - Product Selection and Backend Validation Errors**

**Symptoms:**
- When selecting a product in sales order form, dropdown shows "Select Product" instead of the selected product name
- Creating sales order fails with error: `{"items":[{"non_field_errors":["Either product or service must be specified"]}]}`
- Product is selected but not displayed correctly in the UI
- Backend rejects order creation even though items appear to be selected

**Root Cause Analysis:**
1. **UI Issue**: Select element's value binding didn't handle empty/undefined values properly
   - `value={item.item_id}` would be undefined initially, causing React controlled component issues
   - Selected value wasn't matching option values due to type/undefined mismatch
2. **Backend Issue**: Items were submitted without proper product/service IDs
   - Frontend sends `item_id` but backend expects either `product` or `service` field
   - API transformation was correct but `item_id` was empty/undefined

**Solution (Proven Fix):**
```javascript
// ✅ CORRECT - Handle empty values and add validation
// In SalesOrderManagement.js

// 1. Fix select element value binding
<select
  value={item.item_id || ''}  // Handle undefined/null values
  onChange={(e) => {
    const selectedValue = e.target.value;
    // ... handle selection
  }}
  required  // Add HTML5 validation
>
  <option value="">Select {item.type === 'product' ? 'Product' : 'Service'}</option>
  {/* options */}
</select>

// 2. Add validation before submission
const invalidItems = formData.items.filter(item => !item.item_id || item.item_id === '');
if (invalidItems.length > 0) {
  toast.error('Please select a product or service for all items');
  return;
}

// ❌ WRONG - Without proper validation
<select value={item.item_id}>  // Undefined value causes display issues
```

**Data Flow Explanation:**
1. Frontend form uses `item_id` field for both products and services
2. API proxy (`/api/sales/orders/route.js`) transforms data:
   ```javascript
   items: body.items?.map(item => ({
     item_type: item.type || 'product',
     product: item.type === 'product' ? item.item_id : null,
     service: item.type === 'service' ? item.item_id : null,
     // ... other fields
   }))
   ```
3. Backend expects either `product` or `service` field to be non-null

**Verification Steps:**
1. Select a product in the dropdown - it should show the product name
2. Try to create order without selecting items - should show validation error
3. Create order with selected items - should succeed without backend errors
4. Check console logs for selected item details during debugging

**Prevention:**
- Always use `value={field || ''}` for controlled select elements
- Add validation for required selections before form submission
- Include `required` attribute on select elements for HTML5 validation
- Test both empty and populated form states

**Related Issues:**
- Similar issues may occur in Invoice, Estimate forms with item selection
- Check all forms with product/service selection dropdowns
- Backend field name mismatches (frontend vs Django serializer expectations)

---

## 🔧 **Issue: Payment Menu Pages Not Rendering Due to Missing Navigation Events and Stripe Configuration**

**Symptoms:**
- Clicking on any Payment menu item (Dashboard, Receive Payments, etc.) does nothing
- Other menus (Sales, Inventory) work fine but Payments menu is completely broken
- Console shows navigation events firing: `[DashboardContent] Menu navigation event received: receive-payments`
- But then Stripe error occurs: `Uncaught (in promise) IntegrationError: Missing value for Stripe(): apiKey should be a string`
- Pages fail to render despite navigation working correctly

**Root Cause Analysis:**
1. **Initial Issue**: Payment menu items in `listItems.js` were missing event dispatching code that Sales/Inventory menus had
   - Only had simple `onClick` handlers without `dispatchEvent` calls
   - RenderMainContent.js listens for these events to update the view
2. **Secondary Issue**: After fixing navigation, Stripe SDK initialization fails
   - Payment components import Stripe SDK but no API key is configured
   - Error prevents component from mounting even though navigation is correct
   - Missing environment variable: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Solution:**

1. **Fix Navigation Events** (Already attempted):
```javascript
// In listItems.js - Add event dispatching to Payment menu items
onClick: (value) => {
  const navigationKey = `nav-${Date.now()}`;
  const payload = { 
    item: 'payments-dashboard', 
    navigationKey,
    originalItem: 'Dashboard'
  };
  window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
  window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
  if (typeof handlePaymentsClick === 'function') {
    handlePaymentsClick('payments-dashboard');
  }
}
```

2. **Fix Stripe Configuration** (Root cause):
```javascript
// Add to .env.local or environment variables:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51Q2htSCI76krCII8aRwtdIr6Uw8xy2eVCt3chIXwm91lqQ9v5Qh78An79dwzOucriK97TFqvsIfwgb1BSXNyyCU600V6ZpIgul

// In payment components that use Stripe:
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
```

**Verification Steps:**
1. Add Stripe publishable key to environment variables
2. Restart Next.js development server to load new env vars
3. Click on Payment menu items - they should now render
4. Check console - no more Stripe initialization errors
5. Verify payment forms can load Stripe elements

**Prevention:**
- Always check for required environment variables in components
- Add environment variable documentation to README
- Test payment flows with actual Stripe configuration
- Include error boundaries to catch initialization failures gracefully

**Related Issues:**
- Environment variables must start with `NEXT_PUBLIC_` to be available client-side
- Stripe components require initialization before rendering
- Navigation fixes alone won't help if component initialization fails

**Note:** The navigation event dispatching fix was correct and necessary, but the Stripe configuration issue was preventing the components from rendering even after navigation was fixed.

---

## 🔧 **Issue: Component Infinite Re-rendering Due to Async Function in Render**

**Symptoms:**
- Component loads successfully but keeps re-rendering infinitely
- Console shows repeated success messages (e.g., "[TransactionManagement] Transactions loaded successfully")
- Multiple rapid API calls to the same endpoints
- Browser may become unresponsive
- Page appears blank or partially rendered

**Root Cause Analysis:**
- Using async functions directly in component body without proper state management
- Common pattern: `const tenantId = getSecureTenantId();` where `getSecureTenantId()` is async
- Since async functions return Promises, the Promise object changes on every render
- If this Promise is in a useCallback dependency array, it triggers infinite re-renders

**Solution:**

1. **Convert to state variable:**
```javascript
// ❌ WRONG - Causes infinite re-renders
const tenantId = getSecureTenantId();

// ✅ CORRECT - Proper async handling
const [tenantId, setTenantId] = useState(null);

useEffect(() => {
  const fetchTenantId = async () => {
    const id = await getSecureTenantId();
    setTenantId(id);
  };
  fetchTenantId();
}, []);
```

2. **Add loading check before rendering:**
```javascript
// Wait for tenant ID to load
if (!tenantId) {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
```

**Verification Steps:**
1. Component should render once and stay stable
2. Console should show success message only once
3. No repeated API calls
4. Component displays properly

**Prevention:**
- Always use useState + useEffect for async operations
- Never call async functions directly in component body
- Check dependencies in useCallback/useMemo for Promises
- Use loading states while async data is fetched

**Related Issues:**
- Payment Pages Infinite Render Loop
- Any component using getSecureTenantId() incorrectly

---

## 🔧 **Issue: Menu Pages Not Rendering Due to Missing Navigation Events**

**Symptoms:**
- Clicking on menu items (e.g., Purchases, Banking, etc.) does nothing
- No errors in console, but pages don't render
- Other menus (e.g., Sales, Inventory) work fine
- Console might show handleClick functions being called, but UI doesn't update
- Components exist but aren't displayed when menu item is clicked

**Root Cause Analysis:**
- Menu items are missing the required event dispatching code
- Only calling the handler function (e.g., `handlePurchasesClick`) without dispatching navigation events
- `RenderMainContent.js` listens for `menuNavigation` and `navigationChange` events to update the view
- Without these events, the dashboard content area doesn't know to render the new component

**Solution:**

1. **Identify broken menu items** - Look for simple onClick handlers:
```javascript
// ❌ BROKEN - Missing event dispatching
{ label: 'Dashboard', onClick: handlePurchasesClick, value: 'dashboard' }
```

2. **Fix by adding event dispatching** - Follow the Sales menu pattern:
```javascript
// ✅ CORRECT - Includes event dispatching
{ 
  label: 'Dashboard', 
  onClick: (value) => {
    // Create navigation event
    const navigationKey = `nav-${Date.now()}`;
    const payload = { 
      item: 'purchases-dashboard',  // Component name to render
      navigationKey,
      originalItem: 'Dashboard'     // Display name
    };
    
    // Dispatch navigation events
    window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
    window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
    
    // Call the handler function
    if (typeof handlePurchasesClick === 'function') {
      handlePurchasesClick('dashboard');
    }
  }, 
  value: 'dashboard' 
}
```

3. **Component name mapping** - Ensure the `item` in payload matches the component:
   - `'purchases-dashboard'` → `PurchasesDashboard` component
   - `'vendor-management'` → `VendorManagement` component
   - `'purchase-order-management'` → `PurchaseOrderManagement` component

**Verification Steps:**
1. Click on the fixed menu item
2. Check browser console for: `[DashboardContent] Menu navigation event received: [component-name]`
3. Verify the component renders in the dashboard content area
4. Test all submenu items to ensure they work

**Prevention:**
- When adding new menu items, always copy the pattern from working menus (Sales)
- Include both event dispatching AND handler function calls
- Test new menu items immediately after adding them
- Document the component name mapping for new pages

**Related Issues:**
- Payment Menu Pages Not Rendering (same root cause)
- Any menu that only calls handler functions without events
- Dashboard content not updating despite navigation

---

## 🔧 **Issue: Plaid Bank Connection Failing with CORS Errors**

**Symptoms:**
- Plaid bank connection fails when users click "Connect with Plaid"
- Console error: `Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://api.dottapps.com/api/banking/link_token/`
- Network tab shows CORS preflight errors for banking API calls
- Tenant ID appears as `[object+Promise]` in API URLs
- Headers like `X-Data-Source` causing CORS rejections
- Bank connection form loads but connection process fails

**Root Cause Analysis:**
1. **Direct Backend Calls**: Frontend making direct HTTPS calls to Django backend
   - `fetch('https://api.dottapps.com/api/banking/link_token/')` triggers CORS
   - Browser blocks cross-origin requests for security
2. **Async Tenant ID Issue**: Not awaiting `getSecureTenantId()` function
   - `const tenantId = getSecureTenantId();` returns Promise object
   - URLs contain `[object+Promise]` instead of actual tenant ID
3. **Problematic Headers**: Custom headers like `X-Data-Source` trigger CORS preflight
   - Backend doesn't handle preflight OPTIONS requests for these headers
   - Browser blocks the actual request

**Solution:**

1. **Create Frontend API Proxy Routes** to avoid CORS:
```javascript
// /src/app/api/banking/link-token/route.js
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return Response.json({ error: 'No session found' }, { status: 401 });
    }

    const body = await request.json();
    
    // Forward to Django backend with session auth
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/banking/link_token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

2. **Fix Async Tenant ID Handling** in banking.js:
```javascript
// ❌ WRONG - Returns Promise object
const tenantId = getSecureTenantId();

// ✅ CORRECT - Properly await the Promise
const tenantId = await getSecureTenantId();
```

3. **Update API Client** to use frontend proxy:
```javascript
// ❌ OLD - Direct backend calls
createLinkToken: (payload) => bankingApiInstance.post('/link_token/', payload)

// ✅ NEW - Frontend proxy calls
createLinkToken: (payload = {}) => {
  return fetch('/api/banking/link-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  }).then(response => response.json()).then(data => ({ data }));
}
```

4. **Remove Problematic Headers**:
```javascript
// Remove these from request interceptors:
// config.headers['X-Data-Source'] = 'AWS_RDS';
// config.headers['X-Database-Only'] = 'true';
```

**Proxy Routes Created:**
- `/api/banking/link-token` - Plaid link token creation
- `/api/banking/exchange-token` - Plaid token exchange
- `/api/banking/accounts` - Bank account operations
- `/api/banking/accounts/[id]` - Specific account actions

**Verification Steps:**
1. Click "Connect with Plaid" button - should open Plaid Link
2. Check Network tab - no CORS errors
3. Check console - no `[object+Promise]` in URLs
4. Complete bank connection flow successfully
5. Verify connected accounts appear in dashboard

**Prevention:**
- Always use frontend API proxy pattern for external API calls
- Never make direct HTTPS calls to backend from frontend
- Properly await all async functions in request interceptors
- Avoid custom headers that trigger CORS preflight
- Test bank connection flow in both development and production

**Related Issues:**
- Any module making direct backend API calls will face CORS
- Authentication flows using custom headers
- Third-party integrations (Stripe, PayPal) may have similar patterns

---

## 🔧 **Issue: POS QR Code Scanner Not Finding Products**

**Symptoms:**
- Scanning QR codes with full JSON product data shows "Product not found"
- Manual typing of product name works correctly
- Scanner detects the JSON data but can't match it to products
- Error shows product details (ID, SKU, Name) but still can't find the product
- Manual button required to process scanned QR codes

**Root Cause Analysis:**
1. **API Endpoint Mismatch**: POS was fetching from `/api/products` instead of `/api/inventory/products`
2. **Fallback Data**: When API failed, system was using mock products instead of real database products
3. **JSON Processing**: Scanner wasn't automatically processing JSON QR codes
4. **Product Matching**: ID matching wasn't prioritized for JSON QR codes

**Solution:**

1. **Fix API Endpoint** in POSSystem.js:
```javascript
// ❌ OLD - Wrong endpoint
const response = await fetch('/api/products', {
  credentials: 'include',
});

// ✅ NEW - Correct inventory endpoint
const response = await fetch('/api/inventory/products', {
  credentials: 'include',
});
```

2. **Update Fallback Products** to match real database:
```javascript
const fallbackProducts = [
  {
    id: 'c1b9b1aa-f180-4591-ade3-2b884b2fe629',
    name: 'Hat',
    price: 21.00,
    sku: 'PROD-2025-0002',
    barcode: 'PROD-2025-0002',
    description: 'Hat product from database',
    stock: 12
  },
  // ... other real products
];
```

3. **Auto-Process JSON QR Codes**:
```javascript
// Auto-detect and process JSON in search field
useEffect(() => {
  if (!productSearchTerm || productSearchTerm.length < 10) return;
  
  // Check if it's JSON
  if (productSearchTerm.trim().startsWith('{') && productSearchTerm.includes('"id"')) {
    console.log('[POSSystem] Detected JSON in search field, auto-processing...');
    setScannerStatus('scanning');
    
    const timer = setTimeout(() => {
      handleProductScan(productSearchTerm);
      setProductSearchTerm('');
      
      setTimeout(() => {
        setScannerStatus(scannerDetected ? 'detected' : 'ready');
      }, 1000);
    }, 100);
    
    return () => clearTimeout(timer);
  }
}, [productSearchTerm, scannerDetected]);
```

4. **Prioritize ID Matching** for JSON QR codes:
```javascript
// First try exact ID match if we have JSON data
if (productData && productData.id) {
  product = products.find(p => String(p.id) === String(productData.id));
  if (product) {
    console.log('[POS] Found product by exact ID match:', productData.id);
  }
}
```

**Verification Steps:**
1. Scan a QR code with JSON product data
2. Product should be found and added to cart automatically
3. No manual button click required
4. Success toast shows "QR Code Scanned" with product details

**Prevention:**
- Always use correct API endpoints (`/api/inventory/products`)
- Test with real database products, not mock data
- Auto-process detected JSON without requiring user interaction
- Prioritize exact ID matches for QR codes

**Related Issues:**
- Scanner detection for JSON patterns
- API endpoint consistency
- Frontend/backend data synchronization

---

## 🔧 **Issue: Sign-In Page Infinite Redirect Loop**

**Symptoms:**
- Sign-in page rapidly redirects between `/auth/signin` and `/auth/email-signin`
- Console shows "Application error: a client-side exception has occurred"
- PostHogProvider keeps mounting/unmounting repeatedly
- Browser console shows path changes multiple times per second
- AmplifyUnified fetchAuthSession called repeatedly despite Auth0 being used
- CSP error: "Couldn't parse invalid host /api/auth/establish-session signin"

**Root Cause Analysis:**
1. **Multiple Redirect Layers**: Middleware, AuthContext, and signin page were all trying to redirect simultaneously
2. **Middleware Session Checks**: Middleware was checking for sessions on auth pages and redirecting them
3. **Missing Public Route**: `/auth/email-signin` wasn't marked as a public route in authUtils
4. **Import Errors**: djangoApiClient.js was empty, causing module import failures

**Solution:**

1. **Fix Middleware to Exclude Auth Routes**:
```javascript
// In middleware.js - Skip session checks for auth routes
if (pathname.startsWith('/auth/')) {
  console.log('[Middleware] Skipping auth route');
  return NextResponse.next();
}
```

2. **Add Email-Signin to Public Routes**:
```javascript
// In authUtils.js
const publicRoutes = [
  '/auth/signin',
  '/auth/email-signin',  // Add this
  '/auth/signup',
  // ... other public routes
];
```

3. **Fix djangoApiClient.js Import**:
```javascript
// Django API client placeholder
import { axiosInstance } from '@/lib/axiosConfig';

// Export djangoApiClient as a placeholder that uses axiosInstance
export const djangoApiClient = axiosInstance;
export const djangoApi = axiosInstance;
export default axiosInstance;
```

4. **Remove Redirect from Signin Page**:
```javascript
// Instead of redirecting, render the component directly
return <EmailPasswordSignIn />;
```

**Verification Steps:**
1. Navigate to /auth/signin - should show login form without redirecting
2. Check console - no PostHogProvider mounting/unmounting loop
3. No rapid path changes in console logs
4. Sign-in form displays and functions properly

**Prevention:**
- Don't have multiple layers trying to redirect the same routes
- Always exclude auth routes from middleware session checks
- Ensure all auth pages are marked as public routes
- Fix import errors before deployment to avoid client-side exceptions
- Test auth flows thoroughly after any routing changes

**Related Issues:**
- Client-side exceptions from missing module exports
- PostHogProvider configuration issues
- Middleware and AuthContext conflicts
- Auth0 vs Amplify configuration mismatches

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

---

## 🔧 **Issue: Regional Pricing with Exchange Rates Not Displaying for Kenya**

**Symptoms:**
- URL parameter `?country=KE` added but pricing shows US dollars only
- No 50% developing country discount applied for Kenya
- Exchange rates successfully fetched (129.24 KES per USD) but not displayed
- Backend returns US pricing despite Kenya being in developing_countries table
- Console shows "Country detected: US" even when requesting Kenya

**Root Cause Analysis:**
1. **Backend Configuration**: Django migrations for developing countries not run
   - `developing_countries` table was empty
   - Kenya discount eligibility check returned false
2. **Frontend Country Detection**: Query parameter not being properly forwarded to backend
3. **API Response Mismatch**: Backend ignoring country parameter from frontend

**Solution:**

1. **Run Backend Migrations** (Required first):
```bash
# SSH into backend container
python manage.py makemigrations --merge  # If conflicts exist
python manage.py migrate
python manage.py check_kenya_discount  # Verify Kenya is configured
```

2. **Frontend Debugging** (Already implemented):
- Added comprehensive logging with 🎯 and 💱 prefixes
- Created `/test-kenya` page for API testing
- Added temporary Kenya pricing override when mismatch detected

3. **Verification Output**:
```
✓ Kenya found in database
  - Country: Kenya (KE)
  - Income Level: lower_middle
  - Discount: 50%
  - Active: True

✓ is_eligible("KE"): True
✓ get_discount("KE"): 50%
```

**Implementation Details:**
- Backend migrations populate developing countries with 50+ countries
- Kenya classified as "lower_middle" income with 50% discount
- Exchange rates fetched from Wise API (fallback to ExchangeRate-API)
- Green text display with proper spacing for local currency

**Verification Steps:**
1. Visit `https://dottapps.com/?country=KE`
2. Check pricing shows 50% discount banner
3. Verify exchange rates display as "(KSh 1,970)*" in green
4. Test `/test-kenya` endpoint for detailed diagnostics
5. Check console for 💰 and 🎯 prefixed debug logs

**Prevention:**
- Always run migrations after adding new models or data
- Test with actual backend data, not just frontend mocks
- Use comprehensive logging during development
- Verify both discount AND exchange rate functionality

**Related Issues:**
- Django migrations not auto-running on deployment
- Frontend/backend parameter passing inconsistencies
- Exchange rate API integration patterns

**Files Changed:**
- `/src/components/pricing/GeoPricing.js` - Added debugging and override
- `/src/app/api/pricing/by-country/route.js` - Enhanced logging
- `/backend/pyfactor/onboarding/views/discount_check.py` - Backend logging
- `/backend/pyfactor/users/migrations/001*_developing_countries.py` - Data migrations

---

*Last Updated: 2025-07-08*
*Next Review: When new patterns emerge*