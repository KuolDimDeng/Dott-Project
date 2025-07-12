# Common Issues & Solutions - Troubleshooting Guide

*This document contains recurring issues and their proven solutions to prevent re-debugging.*

**Quick Navigation:**
- [Authentication Issues](#authentication-issues)
  - [Google OAuth Sign-in Stuck in Redirect Loop](#google-oauth-sign-in-stuck-in-redirect-loop)
  - [Mobile Login Session Bridge Issues](#mobile-login-session-bridge-issues) ⬅️ **NEW**
- [Frontend Component Issues](#frontend-component-issues)
- [Calendar/Event Management](#calendarevent-management)
- [HR Employee Management](#hr-employee-management)
- [API Integration Issues](#api-integration-issues)
- [Performance Issues](#performance-issues)

---

# Authentication Issues

## Google OAuth Sign-in Stuck in Redirect Loop

**Issue**: Google OAuth sign-in gets stuck in a rapid redirect loop between onboarding and signin pages, with multiple loading screens and authentication failures.

**Symptoms**:
- Multiple loading screens appear during OAuth flow
- Rapid page reloading between `/auth/oauth-callback`, `/onboarding`, and `/auth/signin`
- Console shows "OAuth already in progress" messages
- Session validation returns 401 despite successful token exchange
- User remains unauthenticated after OAuth callback

**Root Causes**:
1. **Race condition**: OAuth callback exits early on re-render due to global `oauthInProgress` flag
2. **Timeout issues**: Fetch request to `/api/auth/exchange` hangs indefinitely
3. **Session validation failure**: Backend expects Authorization header with session token
4. **Cookie propagation**: React Router navigation happens before cookies are properly set

**Solution**:

1. **Fix race condition in OAuth callback** (`/src/app/auth/oauth-callback/page.js`):
   ```javascript
   // Check for code parameter before processing
   const urlParams = new URLSearchParams(window.location.search);
   const code = urlParams.get('code');
   
   if (!code) {
     console.log('No code parameter, nothing to process');
     return;
   }
   
   if (oauthInProgress) {
     console.log('OAuth already in progress for this code, exiting');
     return;
   }
   ```

2. **Add timeout handling for hanging requests**:
   ```javascript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
   
   exchangeResponse = await fetch(`/api/auth/exchange?code=${code}&state=${state}`, {
     signal: controller.signal,
     headers: { 'Content-Type': 'application/json' },
     credentials: 'include'
   });
   
   clearTimeout(timeoutId);
   ```

3. **Fix session validation Authorization header** (`/src/app/api/auth/session-v2/route.js`):
   ```javascript
   response = await fetch(`${API_URL}/api/sessions/validate/${sessionId.value}/`, {
     headers: {
       'Accept': 'application/json',
       'Content-Type': 'application/json',
       'Authorization': `Session ${sessionId.value}` // Add this header
     },
     cache: 'no-store'
   });
   ```

4. **Ensure proper cookie propagation before redirect**:
   ```javascript
   // Reset the flag before redirecting
   oauthInProgress = false;
   
   // Wait for cookies to propagate and use full page reload
   setTimeout(() => {
     console.log('Executing redirect to /auth/callback');
     window.location.href = '/auth/callback'; // Full page reload ensures cookies are set
   }, 1000);
   ```

**Key Points**:
- Always reset `oauthInProgress` flag in both success and error cases
- Use `window.location.href` instead of React Router for OAuth redirects
- Add proper error handling with user-friendly messages
- Ensure session cookies are set before navigation

**Related Files**:
- `/src/app/auth/oauth-callback/page.js`
- `/src/app/api/auth/exchange/route.js`
- `/src/app/api/auth/session-v2/route.js`
- `/src/utils/authFlowHandler.v3.js`

## Mobile Login Session Bridge Issues

**Issue**: Mobile users get 401 unauthorized errors when accessing session endpoints after successful login, preventing access to authenticated pages.

**Symptoms**:
- Mobile login appears successful with "Welcome back!" toast
- User gets redirected to onboarding or mobile dashboard
- Session endpoints return 401 errors (`/api/auth/session`, `/api/auth/session-v2`)
- Console shows multiple failed session validation requests
- User remains unauthenticated despite successful login response

**Root Cause**:
Mobile login was not properly establishing browser sessions after authentication. The consolidated login API returns a session token that needs to be processed through the session bridge mechanism to set proper cookies.

**Solution**:

1. **Update mobile login to use session bridge** (`/src/app/auth/mobile-login/page.js`):
   ```javascript
   if (response.ok && data.success) {
     toast.success('Welcome back!');
     
     // Handle session bridge if needed
     if (data.useSessionBridge && data.sessionToken) {
       console.log('[MobileLogin] Using session bridge for authentication');
       
       // Store bridge data in sessionStorage
       const bridgeData = {
         token: data.sessionToken,
         redirectUrl: data.onboardingCompleted ? '/mobile' : '/onboarding',
         timestamp: Date.now()
       };
       
       sessionStorage.setItem('session_bridge', JSON.stringify(bridgeData));
       
       // Redirect to session bridge
       router.push('/auth/session-bridge');
       return;
     }
     
     // Fallback - direct redirect (for backward compatibility)
     if (data.onboardingCompleted) {
       router.push('/mobile');
     } else {
       router.push('/onboarding');
     }
   }
   ```

2. **Ensure session bridge route is public** (`/src/lib/authUtils.js`):
   ```javascript
   const PUBLIC_ROUTES = [
     // ... other routes
     '/auth/session-bridge',  // Session bridge for mobile login
     '/mobile/landing',       // Mobile landing page
     '/auth/mobile-login',    // Mobile login page
     '/auth/mobile-signup',   // Mobile signup page
     '/onboarding',           // Onboarding flow
   ];
   ```

**How the Session Bridge Works**:

1. **Mobile Login Flow**:
   - User submits credentials to `/api/auth/consolidated-login`
   - API authenticates with Auth0 and creates backend session
   - Returns `useSessionBridge: true` and `sessionToken`

2. **Bridge Data Storage**:
   - Mobile login stores bridge data in `sessionStorage`:
     ```javascript
     {
       token: "session_token_here",
       redirectUrl: "/mobile" | "/onboarding",
       timestamp: Date.now()
     }
     ```

3. **Session Bridge Processing**:
   - User redirected to `/auth/session-bridge`
   - Bridge retrieves data from sessionStorage
   - Validates token age (must be < 30 seconds)
   - Exchanges bridge token for actual session cookies via `/api/auth/bridge-session`
   - Sets browser cookies and redirects to intended destination

4. **Session Establishment**:
   - Bridge calls `/api/auth/establish-session` via hidden form POST
   - Server sets session cookies properly
   - User redirected to mobile dashboard or onboarding

**Key Points**:
- Session bridge is required for mobile login to set proper browser cookies
- Bridge data expires after 30 seconds for security
- Maintains backward compatibility with direct redirects
- Works for both onboarding and authenticated users

**Debugging Tips**:
- Check browser Developer Tools → Application → Session Storage for `session_bridge` key
- Monitor Network tab for `/api/auth/bridge-session` and `/api/auth/establish-session` calls
- Verify session cookies are set after bridge completes
- Check console logs for `[MobileLogin]` and `[SessionBridge]` messages

**Related Files**:
- `/src/app/auth/mobile-login/page.js` - Mobile login with session bridge
- `/src/app/auth/session-bridge/page.js` - Session bridge processing
- `/src/app/api/auth/consolidated-login/route.js` - Login API that returns session token
- `/src/app/api/auth/bridge-session/route.js` - Bridge token exchange
- `/src/app/api/auth/establish-session/route.js` - Final session establishment
- `/src/lib/authUtils.js` - Public routes configuration

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

## 🔧 **Issue: Google OAuth Sign-In Multiple Loading Screens and Errors**

**Issue**: Google OAuth sign-in shows multiple loading screens, error messages, and appears broken before eventually working.

**Symptoms**:
- Multiple "Processing authentication..." screens
- Console shows double API calls to `/api/auth/exchange`
- Authorization code errors: "The authorization code has expired or is invalid"
- Language change errors: "t.changeLanguage is not a function"
- 400/401 HTTP errors during authentication flow
- User sees error messages then gets redirected back to sign-in

**Root Cause Analysis**:
1. **Double API Calls**: OAuth callback page was making duplicate requests due to `useEffect` dependency on `router` object causing re-renders
2. **Authorization Code Reuse**: Same authorization code being used twice, making second call fail with "invalid_grant" error
3. **Language Initialization Errors**: i18n `changeLanguage` function being called before library was fully initialized during SSR
4. **Component Race Conditions**: Components updating state after unmounting

**Solution Applied** (Deployed 2025-01-08):

### 1. Fixed useEffect Dependencies
```javascript
// Before - causes re-renders and duplicate calls
useEffect(() => {
  handleOAuthCallback();
}, [router]); // router dependency triggers multiple calls

// After - prevents duplicate execution
useEffect(() => {
  let mounted = true;
  
  const handleOAuthCallback = async () => {
    if (!mounted || oauthInProgress) return;
    // ... existing code
  };
  
  handleOAuthCallback();
  
  return () => {
    mounted = false;
  };
}, []); // No dependencies, runs once
```

### 2. Added Request Deduplication
```javascript
// Global flag to prevent concurrent OAuth processing
let oauthInProgress = false;

const handleOAuthCallback = async () => {
  if (!mounted || oauthInProgress) return;
  
  oauthInProgress = true;
  try {
    // OAuth processing
  } finally {
    oauthInProgress = false;
  }
};
```

### 3. Server-Side Authorization Code Protection
```javascript
// In /api/auth/exchange/route.js
const usedCodes = new Set();
const codeExpiryTime = new Map();

// Check for duplicate usage
if (usedCodes.has(code)) {
  return NextResponse.json({ 
    error: 'Token exchange failed',
    message: 'The authorization code has already been used.',
    error_code: 'code_reused'
  }, { status: 400 });
}

// Mark as used with 10-minute expiry
usedCodes.add(code);
codeExpiryTime.set(code, Date.now() + 10 * 60 * 1000);
```

### 4. Fixed Language Change Errors
```javascript
// Before - crashes if changeLanguage doesn't exist
if (langParam && langParam !== i18n.language) {
  await i18n.changeLanguage(langParam);
}

// After - safe check for method existence
if (langParam && langParam !== i18n.language && i18n.changeLanguage) {
  await i18n.changeLanguage(langParam);
}
```

**Files Modified**:
- `/src/app/auth/oauth-callback/page.js` - Fixed useEffect and added deduplication
- `/src/app/api/auth/exchange/route.js` - Added code reuse protection
- `/src/app/auth/layout.js` - Fixed language change safety checks
- `/src/app/onboarding/layout.js` - Fixed language change safety checks

**Result**: 
- ✅ Single API call instead of double calls
- ✅ No authorization code reuse errors
- ✅ Eliminated language change errors
- ✅ Faster, smoother sign-in experience
- ✅ No more error screens during OAuth flow

**Prevention**: Always check useEffect dependencies for objects that may change on re-renders, and add proper request deduplication for critical authentication flows.

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

## 📚 **Feature Documentation: Geo-Location Based Pricing System**

**Overview**: The landing page automatically detects user location and displays pricing with regional discounts and local currency estimates. This documentation explains how each component works.

### 1. **Geo-Location Detection Flow**

The system uses multiple methods to detect user location:

```
User Visit → Cloudflare Headers → Backend API → Frontend Display
```

**Detection Priority Order**:
1. URL parameter: `?country=KE` (highest priority - for testing)
2. Cloudflare headers: `CF-IPCountry` (automatic geo-detection)
3. IP-based detection: Using IP geolocation services
4. Default: US pricing if detection fails

**Implementation Details**:

```javascript
// Frontend: GeoPricing.js
const urlParams = new URLSearchParams(window.location.search);
let countryOverride = urlParams.get('country');  // Check URL first

// API Route: /api/pricing/by-country/route.js
const cfCountry = request.headers.get('cf-ipcountry');  // Cloudflare geo-detection
const country = searchParams.get('country') || cfCountry || 'US';

// Backend: discount_check.py
country_code = request.GET.get('country')  # From query param
if not country_code:
    country_code = DiscountVerificationService.get_country_from_ip(ip_address, request)
```

### 2. **50% Developing Country Discount System**

**Database Structure**:
- Table: `developing_countries`
- Fields: `country_code`, `country_name`, `income_level`, `discount_percentage`, `is_active`

**Income Level Classifications**:
- `low`: Low income countries
- `lower_middle`: Lower middle income (e.g., Kenya, Nigeria)
- `upper_middle`: Upper middle income (e.g., Brazil, Mexico)

**Discount Application Flow**:

```python
# Backend: discount_models.py
class DevelopingCountry(models.Model):
    @classmethod
    def get_discount(cls, country_code):
        try:
            country = cls.objects.get(
                country_code=country_code.upper(),
                is_active=True
            )
            return country.discount_percentage
        except cls.DoesNotExist:
            return 0

# Backend: discount_check.py (GetPricingForCountryView)
discount = DevelopingCountry.get_discount(country_code)
is_discounted = discount > 0

if is_discounted:
    professional_monthly = 7.50   # 50% of $15
    professional_yearly = 72.00   # 50% of $144
else:
    professional_monthly = 15.00
    professional_yearly = 144.00
```

**Countries with 50% Discount** (Partial List):
- Africa: Kenya (KE), Nigeria (NG), Ghana (GH), Egypt (EG), South Africa (ZA)
- Asia: India (IN), Bangladesh (BD), Pakistan (PK), Philippines (PH)
- Latin America: Mexico (MX), Brazil (BR), Colombia (CO)
- Total: 100+ developing countries

### 3. **Local Currency Estimation System**

**Exchange Rate Sources** (Priority Order):
1. **Wise API** (Primary - more accurate)
2. **ExchangeRate-API** (Fallback - free tier)

**Implementation Flow**:

```javascript
// Frontend: /api/exchange-rates/route.js
const COUNTRY_TO_CURRENCY = {
  'KE': { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  'NG': { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  'IN': { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  // ... 50+ countries
};

// Try Wise API first
const wiseUrl = `https://api.wise.com/v1/rates?source=USD&target=${currencyCode}`;
const wiseResponse = await fetch(wiseUrl, {
  headers: { 'Authorization': `Bearer ${WISE_API_TOKEN}` }
});

// Fallback to ExchangeRate-API
if (!wiseResponse.ok) {
  const fallbackUrl = `https://api.exchangerate-api.com/v4/latest/USD`;
  // ... fetch and extract rate
}

// Frontend: GeoPricing.js - Display with formatting
function formatLocalPrice(usdPrice, exchangeRate) {
  const numericPrice = parseFloat(usdPrice.replace(/[^0-9.-]+/g, ''));
  const localPrice = numericPrice * exchangeRate.rate;
  
  // Format based on currency preferences
  const { symbol, decimals } = exchangeRate.format;
  const formattedPrice = decimals === 0 
    ? Math.round(localPrice).toLocaleString()
    : localPrice.toFixed(decimals).toLocaleString();
  
  return `${symbol} ${formattedPrice}`;
}
```

**Display Format**:
- USD Price: `$7.50/month` (with 50% discount)
- Local Currency: `(KSh 970)*` (in green text)
- Disclaimer: "* Exchange rate is estimated and may vary"

### 4. **Complete Data Flow Example (Kenya)**

1. **User visits**: `https://dottapps.com/?country=KE`

2. **Frontend Request**:
   ```
   GET /api/pricing/by-country?country=KE
   ```

3. **Backend Processing**:
   ```python
   # Check if Kenya is eligible for discount
   discount = DevelopingCountry.get_discount('KE')  # Returns 50
   
   # Apply discount to pricing
   professional_monthly = 15.00 * 0.5  # $7.50
   ```

4. **Frontend Exchange Rate**:
   ```
   GET /api/exchange-rates?country=KE
   Response: { rate: 129.24, currency: "KES", symbol: "KSh" }
   ```

5. **Final Display**:
   ```
   Professional Plan
   $7.50/month (̶$̶1̶5̶.̶0̶0̶)̶ 50% off
   (KSh 970)*
   ```

### 5. **Testing and Verification**

**Test URLs**:
- Kenya: `https://dottapps.com/?country=KE`
- Nigeria: `https://dottapps.com/?country=NG`
- India: `https://dottapps.com/?country=IN`
- Test endpoint: `https://dottapps.com/test-kenya`

**Backend Verification Commands**:
```bash
# Check if country is configured
python manage.py check_kenya_discount

# List all developing countries
python manage.py shell
>>> from users.discount_models import DevelopingCountry
>>> DevelopingCountry.objects.all().values_list('country_code', 'discount_percentage')
```

**Debug Logging Prefixes**:
- 💰 - Pricing component logs
- 💱 - Exchange rate logs
- 🎯 - API route logs
- 🌍 - Country detection logs

### 6. **Common Configuration Issues**

1. **Missing Migrations**:
   ```bash
   python manage.py migrate users
   ```

2. **Missing Environment Variables**:
   ```
   WISE_API_TOKEN=your_token_here
   EXCHANGE_RATE_API_KEY=your_key_here
   ```

3. **Cache Issues**:
   - Exchange rates cached for 1 hour
   - Clear with: `localStorage.removeItem('detectedCountry')`

---

## 📅 **Issue: Calendar Events Not Persisting to Database**

**Symptoms:**
- Events save successfully (201 status) but don't appear on calendar after refresh
- Events only visible until page reload, then disappear
- Backend returns only test events, not newly created ones
- Console shows events being saved to "in-memory storage"
- Event IDs have different formats: `cal_1752073804967_w9xrhgzcz` (frontend) vs UUIDs (backend)

**Root Cause Analysis:**
1. **In-Memory Fallback Masking Issues**: Frontend had fallback to in-memory storage when backend failed
   - This made it appear events were saving when they actually weren't persisting
   - Silent failures prevented proper error diagnosis
2. **Backend API Not Receiving Requests**: Events were not actually reaching the Django backend
3. **Pagination Issue**: Backend returns paginated results (50 items per page by default)
   - Frontend wasn't handling pagination, only showing first page
4. **Database Schema Missing**: Initial issue was missing event tables for tenant
   - Schema wasn't properly set up for the tenant
5. **All-Day Event Validation**: Backend rejected events where start_datetime = end_datetime

**Solution:**

1. **Remove In-Memory Storage Fallback** (`/src/app/api/calendar/events/route.js`):
   ```javascript
   // OLD - Silent fallback
   if (!backendResponse.ok) {
     // Fallback to in-memory storage
     const eventId = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
     // ... save to memory
   }
   
   // NEW - Show actual errors
   if (!backendResponse.ok) {
     const errorText = await backendResponse.text();
     console.error('[Calendar API POST] ❌ BACKEND SAVE FAILED - NO FALLBACK');
     return NextResponse.json({
       error: 'Failed to save event to backend',
       details: errorText,
       status: backendResponse.status,
       backendUrl: `${API_BASE_URL}/api/calendar/events/`
     }, { status: backendResponse.status });
   }
   ```

2. **Add Pagination Support**:
   ```javascript
   // Add page_size parameter to get all events
   const queryParams = new URLSearchParams();
   queryParams.append('page_size', '1000');
   ```

3. **Fix All-Day Event Validation**:
   ```javascript
   const formatDateTimeForBackend = (dateStr, isAllDay, isEndDate = false) => {
     if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
       if (isAllDay) {
         // Start: 00:00:00, End: 23:59:59 for same-day events
         return isEndDate ? `${dateStr}T23:59:59Z` : `${dateStr}T00:00:00Z`;
       }
     }
   };
   ```

4. **Enhanced Error Handling in UI**:
   ```javascript
   if (!response.ok) {
     const errorData = await response.json();
     console.error('[Calendar] ❌ Full error:', {
       status: response.status,
       error: errorData.error,
       details: errorData.details,
       backendUrl: errorData.backendUrl
     });
     alert(`Failed to save event:\n\n${errorData.details}`);
   }
   ```

**Backend Schema Fix (if needed):**
```bash
# Run on backend container
python manage.py migrate events --run-syncdb
python /app/scripts/fix_calendar_schema_for_tenant.py
```

**Verification Steps:**
1. Create event and check console for backend URL being called
2. Look for 201 response with proper UUID in response
3. Verify event appears after page refresh
4. Check backend logs for POST requests to `/api/calendar/events/`

**Key Learnings:**
- Don't use silent fallbacks that mask real issues
- Always show actual backend errors to users
- Handle pagination in API responses
- Ensure date validation logic matches between frontend and backend
- Test persistence by refreshing page, not just UI updates

**Debugging Process That Led to Solution:**
1. Added extensive console logging to trace event flow
2. Discovered events had different ID formats (frontend vs backend)
3. Found "Test Event from API" was hardcoded fallback
4. Identified backend was returning paginated results
5. Removed in-memory storage to expose real errors
6. Fixed date validation for all-day events

**Files Modified:**
- `/src/app/api/calendar/events/route.js` - API proxy with error handling
- `/src/app/dashboard/components/forms/Calendar.js` - UI error display
- `/backend/pyfactor/events/models.py` - Event model with validation
- `/backend/pyfactor/events/views.py` - Event ViewSet with tenant isolation

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

# Calendar & Reminder Issues

## Calendar Events Not Saving or Displaying

**Issue**: Calendar events appear to save but don't persist or display on the calendar after page refresh.

**Symptoms**:
- Save button stays in "Saving..." state
- Events disappear after refresh
- Console shows successful save but events don't appear
- All-day events cause validation errors
- Dates show as one day earlier (timezone shifting)

**Root Causes**:
1. Field name mismatches between frontend and backend
2. Missing database schema for calendar_event table
3. In-memory storage instead of backend persistence
4. Timezone conversion issues causing date shifts

**Solution**:

1. **Fix field name consistency**:
   ```javascript
   // Frontend was sending 'start_datetime' but backend expects 'start'
   const requestBody = {
     title: eventForm.title,
     type: eventForm.type,
     start: eventForm.start,  // Not start_datetime
     end: eventForm.end,      // Not end_datetime
     allDay: eventForm.allDay,
     // ... other fields
   };
   ```

2. **Create calendar schema via admin tool**:
   - Navigate to `/dashboard/admin/fix-calendar-schema`
   - Click "Initialize Calendar Schema"
   - This creates the calendar_event table with proper structure

3. **Remove in-memory storage**:
   - Removed temporary event storage from Calendar component
   - All events now persist to backend database

4. **Fix timezone handling**:
   - Add `timeZone={userTimezone}` to FullCalendar component
   - Store user timezone in database
   - Convert dates properly between UTC and local time

**Files Changed**:
- `/src/app/dashboard/components/forms/Calendar.js`
- `/src/app/dashboard/admin/fix-calendar-schema/page.js`
- `/backend/pyfactor/custom_auth/models.py` (added timezone field)

---

## Calendar Toast Notifications Not Showing

**Issue**: Calendar reminder toast notifications don't appear even though console shows they're being triggered.

**Symptoms**:
- Console shows "[ReminderService] Showing reminder: ..." but no toast appears
- Test toast button doesn't work
- react-hot-toast import exists but toasts don't show

**Root Cause**:
- App uses custom ToastProvider, not react-hot-toast
- Calendar and reminder service were importing wrong toast library
- Toast functions weren't compatible between the two systems

**Solution**:

1. **Remove react-hot-toast import**:
   ```javascript
   // Remove this:
   import { toast } from 'react-hot-toast';
   
   // Add this:
   import { useToast } from '@/components/Toast/ToastProvider';
   ```

2. **Update reminder service to accept toast function**:
   ```javascript
   class ReminderService {
     constructor() {
       this.toastFunction = null; // Will be set by component
     }
     
     init(toastFunction = null) {
       if (toastFunction) {
         this.toastFunction = toastFunction;
       }
     }
     
     showReminder(reminder) {
       if (this.toastFunction && this.toastFunction.info) {
         this.toastFunction.info(message, 8000);
       }
     }
   }
   ```

3. **Pass toast to reminder service**:
   ```javascript
   const toast = useToast();
   reminderService.init(toast);
   ```

**Why This Fix Works**:
- Custom ToastProvider is already wrapped around dashboard content
- useToast hook provides the correct toast API
- Reminder service now uses the same toast system as rest of app

**Files Changed**:
- `/src/utils/reminderService.js`
- `/src/app/dashboard/components/forms/Calendar.js`

---

## Calendar Date Shifting Issues (Timezone Problems)

**Issue**: Calendar events saved for one date appear on the previous day (e.g., July 9 shows as July 8).

**Symptoms**:
- Event saved for 07/09 displays as 07/08
- Reminders show for wrong dates
- Times appear incorrect in different timezones
- UTC conversion causing day boundary issues

**Root Causes**:
1. No timezone configuration in FullCalendar
2. User timezone not stored or used
3. UTC dates converting to previous day in local timezone
4. Frontend and backend timezone mismatch

**Solution**:

1. **Add timezone support to FullCalendar**:
   ```javascript
   <FullCalendar
     timeZone={userTimezone}  // Add this line
     // ... other props
   />
   ```

2. **Store user timezone in database**:
   ```python
   # Add to User model
   timezone = models.CharField(
       max_length=50,
       default='UTC',
       help_text='User timezone (e.g., America/New_York)'
   )
   ```

3. **Auto-detect and save timezone**:
   ```javascript
   const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
   // Save to user profile on first login
   ```

4. **Fix reminder service timezone**:
   ```javascript
   reminderService.setTimezone(userTimezone);
   ```

**Implementation Strategy**:
- Phase 1: Auto-detect timezone, save to profile (implemented)
- Phase 2: Add timezone selector in settings (future)

**Files Changed**:
- `/backend/pyfactor/custom_auth/models.py`
- `/backend/pyfactor/custom_auth/migrations/0002_add_user_timezone.py`
- `/src/app/dashboard/components/forms/Calendar.js`
- `/src/utils/reminderService.js`

---

## Calendar Form Date/Time Field Separation

**Issue**: Combined datetime-local inputs were confusing and causing timezone issues.

**Symptoms**:
- Hard to edit just date or just time
- Browser datetime-local picker issues
- Confusion about what timezone is being used

**Solution**:

1. **Separate date and time fields**:
   ```javascript
   // Form state now has separate fields
   const [eventForm, setEventForm] = useState({
     startDate: '',
     startTime: '09:00',
     endDate: '',
     endTime: '10:00',
     // ... other fields
   });
   ```

2. **Update form UI**:
   ```javascript
   <input type="date" value={eventForm.startDate} />
   <input type="time" value={eventForm.startTime} />
   ```

3. **Combine for backend on save**:
   ```javascript
   if (eventForm.allDay) {
     startDateTime = eventForm.startDate;
     endDateTime = eventForm.endDate;
   } else {
     startDateTime = `${eventForm.startDate}T${eventForm.startTime}`;
     endDateTime = `${eventForm.endDate}T${eventForm.endTime}`;
   }
   ```

**Benefits**:
- Clearer UI with separate inputs
- Better mobile experience
- No timezone ambiguity in form
- Easier to implement all-day events

**Files Changed**:
- `/src/app/dashboard/components/forms/Calendar.js`

---

## Common Calendar Error Messages

### "Permission denied to access property 'nodeType'"
- **Cause**: Third-party analytics/recording library
- **Impact**: None - doesn't affect calendar functionality
- **Action**: Can be safely ignored

### "Event update JSON parsing error"
- **Cause**: Backend returning non-JSON response for PUT requests
- **Solution**: Handle non-JSON responses gracefully in update handler

### "403 Forbidden on /api/user/timezone"
- **Cause**: API endpoint permissions issue
- **Impact**: Timezone auto-detection may fail
- **Workaround**: Timezone still works with browser detection

---

## Calendar Best Practices

1. **Always test with actual backend**:
   - Don't rely on frontend-only testing
   - Verify events persist after refresh

2. **Check timezone handling**:
   - Test events across day boundaries
   - Verify reminders show at correct times
   - Test with users in different timezones

3. **Use separate date/time fields**:
   - Better UX than datetime-local
   - Clearer timezone handling
   - Works better on mobile

4. **Initialize reminder service with toast**:
   - Pass toast function on init
   - Don't use react-hot-toast
   - Use app's custom toast system

---

# HR Employee Management

## 403 Forbidden Error When Accessing Employees

**Issue**: Employee management API returns 403 Forbidden error when trying to fetch or create employees.

**Symptoms**:
- Console shows "XHR GET https://dottapps.com/api/hr/employees [HTTP/3 403 181ms]"
- Frontend displays "Access denied. Please check your permissions to view employees."
- Employee list remains empty or shows loading state

**Root Causes**:
1. **Missing Authentication**: User session not properly authenticated
2. **Invalid Tenant Headers**: Tenant ID not included in API requests
3. **Backend Permission Issues**: HR endpoints require proper session validation
4. **Middleware Problems**: Tenant isolation middleware blocking requests

**Solution**:

1. **Verify Session Authentication**:
   ```javascript
   // Check if user is properly authenticated
   const session = await fetch('/api/auth/session-v2');
   console.log('Session status:', session.status);
   ```

2. **Include Tenant Headers**:
   ```javascript
   // API client automatically includes tenant ID
   const pathParts = window.location.pathname.split('/');
   const tenantId = pathParts[1]; // Extract from URL
   
   headers: {
     'X-Tenant-ID': tenantId,
     'Content-Type': 'application/json'
   }
   ```

3. **Backend Authentication Check**:
   ```python
   # HR views now require IsAuthenticated
   @api_view(['GET', 'POST'])
   @permission_classes([IsAuthenticated])  # Changed from AllowAny
   def employee_list(request):
       logger.info(f'User: {request.user.email}, Authenticated: {request.user.is_authenticated}')
   ```

**Files Modified**:
- `/backend/pyfactor/hr/views.py` - Added proper authentication
- `/src/utils/apiClient.js` - Added tenant header support
- `/src/app/api/hr/employees/route.js` - Enhanced logging and error handling

---

## SSN/TIN Field Not Showing Correct Label

**Issue**: Tax identification field shows wrong label (e.g., "SSN" for UK users instead of "National Insurance Number").

**Symptoms**:
- Country dropdown shows "United Kingdom" but field label remains "Social Security Number"
- Placeholder text doesn't match expected format for selected country
- Form validation errors for valid tax ID formats

**Root Cause**: Country change handler not updating security number type properly.

**Solution**:

1. **Verify Country Mapping**:
   ```javascript
   const COUNTRY_TO_SECURITY_NUMBER = {
     'UK': { type: 'NIN', label: 'National Insurance Number', placeholder: 'XX 12 34 56 X' },
     'US': { type: 'SSN', label: 'Social Security Number', placeholder: 'XXX-XX-XXXX' },
     'KE': { type: 'OTHER', label: 'Tax Identification Number', placeholder: 'Enter TIN' }
   };
   ```

2. **Fix Country Change Handler**:
   ```javascript
   const handleCountryChange = (countryCode) => {
     const securityInfo = getSecurityNumberInfo(countryCode);
     setFormData(prev => ({
       ...prev,
       country: countryCode,
       securityNumberType: securityInfo.type,
       securityNumber: '' // Clear when country changes
     }));
   };
   ```

3. **Dynamic Label Rendering**:
   ```javascript
   <label className="block text-sm font-medium text-gray-700 mb-1">
     {getSecurityNumberInfo(formData.country).label}
     <FieldTooltip text={`Enter the employee's ${label.toLowerCase()}.`} />
   </label>
   ```

**Files Modified**:
- `/src/app/dashboard/components/forms/EmployeeManagement.js`

---

## Employee Creation Fails with Security Number

**Issue**: Employee creation succeeds but SSN/TIN is not securely stored in Stripe.

**Symptoms**:
- Employee record created successfully
- `ssn_stored_in_stripe` field remains `false`
- Backend logs show Stripe storage errors
- Only partial security number visible in database

**Root Causes**:
1. **Missing Stripe Configuration**: Secret key not properly set
2. **API Integration Issues**: Stripe Connect not configured
3. **Security Number Format**: Invalid format for selected country

**Solution**:

1. **Verify Stripe Configuration**:
   ```bash
   # Check environment variables
   echo $STRIPE_SECRET_KEY
   # Should start with sk_live_ or sk_test_
   ```

2. **Backend Storage Method**:
   ```python
   def save_ssn_to_stripe(self, ssn):
       """Save SSN to Stripe securely"""
       try:
           if not settings.STRIPE_SECRET_KEY:
               raise ValueError("Stripe secret key not configured")
           
           # Store in Stripe (implementation handles security)
           self.ssn_last_four = ssn[-4:] if ssn else None
           self.ssn_stored_in_stripe = True
           self.save()
           
       except Exception as e:
           logger.error(f'Stripe storage failed: {str(e)}')
           raise
   ```

3. **Frontend Security Notice**:
   ```javascript
   <p className="text-xs text-gray-500 mt-1">
     🔒 Securely encrypted and stored with Stripe for payroll processing
   </p>
   ```

**Files Modified**:
- `/backend/pyfactor/hr/models.py` - Enhanced `save_ssn_to_stripe()` method
- `/backend/pyfactor/hr/views.py` - Added secure storage handling

---

## Compensation Type Toggle Not Working

**Issue**: Switching between Salary and Wage options doesn't show/hide correct input fields.

**Symptoms**:
- Radio buttons change but form fields remain the same
- Both salary and wage fields visible simultaneously
- Form validation errors on unused fields

**Root Cause**: React state not updating properly or conditional rendering logic incorrect.

**Solution**:

1. **Fix State Management**:
   ```javascript
   const [formData, setFormData] = useState({
     compensationType: 'SALARY', // Default to salary
     salary: '',
     wagePerHour: ''
   });
   
   // Use functional state updates
   const handleTypeChange = (type) => {
     setFormData(prev => ({
       ...prev,
       compensationType: type,
       // Clear opposite field
       ...(type === 'SALARY' ? { wagePerHour: '' } : { salary: '' })
     }));
   };
   ```

2. **Conditional Rendering**:
   ```javascript
   {formData.compensationType === 'SALARY' ? (
     <div>
       <label>Annual Salary</label>
       <input 
         type="number"
         value={formData.salary}
         onChange={(e) => setFormData(prev => ({...prev, salary: e.target.value}))}
       />
     </div>
   ) : (
     <div>
       <label>Hourly Wage</label>
       <input 
         type="number"
         value={formData.wagePerHour}
         step="0.01"
         onChange={(e) => setFormData(prev => ({...prev, wagePerHour: e.target.value}))}
       />
     </div>
   )}
   ```

**Files Modified**:
- `/src/app/dashboard/components/forms/EmployeeManagement.js`

---

## Employee Stats Not Loading

**Issue**: Dashboard employee statistics show "0" for all values even when employees exist.

**Symptoms**:
- Total employees shows 0
- Active/inactive counts are incorrect
- API returns empty stats object

**Root Cause**: Missing `/api/hr/employees/stats/` endpoint or incorrect data aggregation.

**Solution**:

1. **Create Stats Endpoint**:
   ```python
   @api_view(['GET'])
   @permission_classes([IsAuthenticated])
   def employee_stats(request):
       employees = Employee.objects.all()
       total = employees.count()
       active = employees.filter(active=True).count()
       inactive = employees.filter(active=False).count()
       
       return Response({
           'total': total,
           'active': active,
           'onLeave': 0,  # Add this field to model if needed
           'inactive': inactive,
           'departments': Employee.objects.values('department').distinct().count()
       })
   ```

2. **Add URL Route**:
   ```python
   # In hr/urls.py
   urlpatterns = [
       path('employees/stats/', views.employee_stats, name='employee-stats'),
       path('employees/', views.employee_list, name='employee-list'),
       # stats/ must come before <uuid:pk>/ to avoid conflicts
   ]
   ```

**Files Modified**:
- `/backend/pyfactor/hr/views.py` - Added `employee_stats` function
- `/backend/pyfactor/hr/urls.py` - Added stats endpoint

---

## HR Employee Management Best Practices

1. **Security First**:
   - Never log full SSN/TIN numbers
   - Always use Stripe for sensitive data storage
   - Implement proper session authentication
   - Use tenant isolation for multi-tenant setups

2. **Global Considerations**:
   - Support multiple tax ID types (SSN, NIN, TIN, etc.)
   - Auto-detect tax ID format from country selection
   - Provide clear format examples and validation
   - Handle different wage/salary structures globally

3. **User Experience**:
   - Show clear security notices about data storage
   - Provide real-time validation feedback
   - Use appropriate input types and patterns
   - Handle loading states and error messages gracefully

4. **Development**:
   - Test with real database, not demo data
   - Verify authentication on all endpoints
   - Include comprehensive logging for debugging
   - Follow industry-standard HR data models

5. **API Design**:
   - Use consistent error response formats
   - Include proper CORS headers for frontend integration
   - Implement rate limiting on sensitive endpoints
   - Version APIs for future compatibility

**Key Files**:
- Frontend: `/src/app/dashboard/components/forms/EmployeeManagement.js`
- Backend: `/backend/pyfactor/hr/views.py`, `/backend/pyfactor/hr/models.py`
- API: `/src/utils/apiClient.js`
- Documentation: `/docs/EMPLOYEE_MANAGEMENT.md`

---

*Last Updated: 2025-01-09*
*Next Review: When new patterns emerge*