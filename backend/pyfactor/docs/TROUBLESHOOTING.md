# Backend Troubleshooting Guide - Django/PostgreSQL Issues

*This document contains backend-specific recurring issues and their proven solutions.*

## 🚨 **Issue: POS Transaction Failing - Currency Columns Missing**

**Date Added:** August 14, 2025

**Symptoms:**
- POS complete sale returns 500 error
- Error: `column sales_pos_transaction.currency_code does not exist`
- Error: `column sales_pos_transaction.currency_symbol does not exist`
- Transactions page shows "Failed to fetch transactions"
- React error #418 in console

**Root Cause:**
- Migration `sales.0012_add_currency_to_pos_transactions` not applied to database
- Currency columns missing from `sales_pos_transaction` table
- Migration conflicts blocking normal `python manage.py migrate` command

**Solution:**

### Method 1: Direct SQL Fix (Immediate)
```bash
# SSH into the affected server (staging or production)
python manage.py dbshell
```

```sql
-- Add currency columns to POS transactions table
ALTER TABLE sales_pos_transaction 
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD';

ALTER TABLE sales_pos_transaction 
ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT '$';

-- Record the migration as applied
INSERT INTO django_migrations (app, name, applied)
VALUES ('sales', '0012_add_currency_to_pos_transactions', NOW())
ON CONFLICT (app, name) DO NOTHING;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'sales_pos_transaction' 
AND column_name IN ('currency_code', 'currency_symbol');

-- Exit
\q
```

### Method 2: Check Migration Status
```bash
# Check which migrations are unapplied
python manage.py showmigrations | grep "\[ \]"

# If you see migration conflicts in custom_auth:
python manage.py migrate --fake custom_auth 0002_add_tenant_id_to_all_models
python manage.py migrate --fake custom_auth 0003_add_business_id_to_all_models

# Then try to apply sales migration
python manage.py migrate sales 0012
```

**Prevention:**
- Always run `python manage.py showmigrations` after deployment
- Ensure migration runs during deployment (check Dockerfile)
- Keep staging and production databases synchronized

**Files Involved:**
- `/backend/pyfactor/sales/migrations/0012_add_currency_to_pos_transactions.py`
- `/backend/pyfactor/sales/models.py` (POSTransaction model)
- `/backend/pyfactor/sales/pos_viewsets.py` (Lines 144-153 for currency logic)

**Note:** The USD and $ are just default values. Each transaction uses the user's preferred currency from their UserProfile.

---

## 🔧 **Issue: Sales Order Creation Failing with Multi-Database Error**

**Symptoms:**
- Sales order creation returns 500 error
- Error: "'UserProfile' object has no attribute 'database_name'"
- Redis connection errors: "Error -2 connecting to your-redis-host:6379"
- Backend using obsolete multi-database pattern

**Root Cause Analysis:**
- Old sales module using `get_user_database()` pattern
- References non-existent `UserProfile.database_name` field
- Serializers using `objects.using(database_name)` instead of tenant-aware pattern
- ViewSets not following industry-standard declarative pattern

**Solution (Proven Fix):**
```python
# ✅ CORRECT - Use simple declarative ViewSet pattern
# File: /backend/pyfactor/sales/viewsets.py
class SalesOrderViewSet(viewsets.ModelViewSet):
    queryset = SalesOrder.objects.all()  # TenantManager handles filtering
    serializer_class = SalesOrderSerializer
    permission_classes = [IsAuthenticated]

# ✅ CORRECT - Serializer without database_name
# File: /backend/pyfactor/sales/serializers_new.py
class SalesOrderSerializer(serializers.ModelSerializer):
    items = SalesOrderItemSerializer(many=True, required=False)
    
    class Meta:
        model = SalesOrder
        fields = '__all__'
        read_only_fields = ['id', 'order_number']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order = SalesOrder.objects.create(**validated_data)
        
        for item_data in items_data:
            SalesOrderItem.objects.create(sales_order=order, **item_data)
        
        order.calculate_total_amount()
        return order
```

**Files to Update:**
1. Create `/sales/viewsets.py` with industry-standard ViewSets
2. Create `/sales/serializers_new.py` without database_name context
3. Update `/sales/urls.py` to use DRF routers and ViewSets
4. Remove any `get_user_database()` usage

**Redis Note:**
- Redis errors are misleading - sales module doesn't require Redis
- These are side effects of the old multi-database code
- Proper tenant-aware pattern eliminates Redis dependency

**Verification Steps:**
1. Check models extend `TenantAwareModel`
2. Verify `objects = TenantManager()` in models
3. Test with: `python manage.py shell < test_sales_order.py`
4. Confirm no `database_name` in serializer context

**Prevention:**
- Always use simple declarative ViewSets
- Never override `get_queryset()` unless absolutely necessary
- Follow patterns from CustomerViewSet
- Use TenantManager for automatic filtering

---

## 🔧 **Issue: Frontend-Backend Field Name Mismatch in Sales Orders**

**Symptoms:**
- Sales order creation returns 400 Bad Request
- Error: `{"customer":["This field is required."],"date":["This field is required."]}`
- Frontend sends data but backend rejects it as missing required fields
- Logs show data is sent with different field names

**Root Cause Analysis:**
- Django REST Framework serializers expect specific field names
- Frontend uses more descriptive names (customer_id, order_date)
- Backend uses shorter names (customer, date)
- No data transformation layer between frontend and backend

**Solution (Backend Perspective):**
```python
# Option 1: Update serializer to accept both field names
class SalesOrderSerializer(serializers.ModelSerializer):
    # Accept both 'customer' and 'customer_id'
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source='customer'
    )
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source='customer',
        write_only=True
    )
    
    # Accept both 'date' and 'order_date'
    date = serializers.DateField()
    order_date = serializers.DateField(source='date', write_only=True)

# Option 2: Transform data in API proxy (Recommended)
# Let frontend keep its naming, transform in /api/sales/orders/route.js
```

**Field Mapping Table:**
| Frontend Name | Backend Model Field | Serializer Field |
|--------------|--------------------|--------------------|
| customer_id | customer (FK) | customer |
| order_date | date | date |
| total_amount | total_amount | totalAmount or total_amount |
| item_id | product/service (FK) | product or service |

**Best Practice:**
- Document field mappings in serializer docstrings
- Use consistent naming conventions across the project
- Add field aliases in serializers for backward compatibility
- Transform data at the API boundary (proxy routes)

**Related Issues:**
- Similar problems may occur with Invoice, Estimate, and other models
- Check all serializers when frontend reports "field required" errors

---

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

## 🔧 **Issue: User Creation Fails with "User Already Exists" Despite No Auth0 Account**

**Symptoms:**
- User creation returns 409 Conflict: "User already exists"
- User not visible in Auth0 dashboard
- Database contains orphaned user records with `auth0_sub` like "pending_email@example.com_timestamp"
- Foreign key constraint errors when trying to delete users manually

**Root Cause Analysis:**
- User creation process creates database record before Auth0 sync
- If Auth0 creation fails, database record remains orphaned
- Multiple foreign key dependencies prevent simple deletion
- Tables like `smart_insights_usercredit`, `smart_insights_credittransaction`, `hr_employee` reference user

**Solution - Use Comprehensive Cleanup Script:**

1. **Run the comprehensive cleanup script** that auto-discovers all foreign key dependencies:
```bash
cd /app/scripts
python comprehensive_user_cleanup.py user@example.com
```

2. **Script Features:**
- Automatically discovers ALL tables with foreign keys to `custom_auth_user`
- Shows all dependencies before deletion (typically 60+ tables)
- Cleans all related records in correct order
- Handles any future tables automatically

3. **Example Output:**
```
INFO: Discovering all tables with foreign keys to custom_auth_user...
INFO: Found 64 foreign key dependencies:
  - smart_insights_credittransaction.user_id
  - smart_insights_usercredit.user_id
  - hr_employee.user_id
  ... (shows all dependencies)

Found 3 orphaned users:
  - user1@example.com (ID: 259, auth0_sub: pending_user1@example.com_1752384514.82401)
  
Do you want to delete these orphaned users? (yes/no): yes
```

**Prevention (Already Implemented):**
- User creation now uses `@transaction.atomic` decorator
- All database changes roll back if any step fails
- No more orphaned users in future

**Manual Cleanup (If Script Not Available):**
```sql
-- Find orphaned users
SELECT id, email, auth0_sub FROM custom_auth_user 
WHERE auth0_sub LIKE 'pending_%';

-- Delete with all dependencies (example for user_id = 123)
DELETE FROM smart_insights_credittransaction WHERE user_id = 123;
DELETE FROM smart_insights_usercredit WHERE user_id = 123;
DELETE FROM hr_employee WHERE user_id = 123;
-- ... delete from all dependent tables ...
DELETE FROM custom_auth_user WHERE id = 123;
```

**Script Location:**
- Primary: `/backend/pyfactor/scripts/comprehensive_user_cleanup.py`
- Fallback: `/backend/pyfactor/scripts/force_cleanup_orphaned_users.py`
- Interactive (all users): `/backend/pyfactor/scripts/interactive_user_cleanup.py`

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

## 🔧 **Issue: ViewSet Overrides Preventing TenantManager Filtering**

**Symptoms:**
- Objects created successfully with correct tenant_id in database
- GET requests return empty arrays despite data existing
- Works in direct database queries but not through API
- Authentication successful, RLS policies configured correctly

**Root Cause Analysis:**
- ViewSet overrides `get_queryset()` method unnecessarily
- Custom implementations interfere with TenantManager automatic filtering
- Complex ViewSet patterns prevent proper tenant context application
- Working models (like CustomerViewSet) use simple declarative pattern

**Solution:**
```python
# ❌ PROBLEMATIC - Custom get_queryset() override
class SupplierViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Supplier.objects.all()  # This bypasses TenantManager

# ✅ CORRECT - Simple declarative pattern
class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()  # TenantManager handles filtering
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
```

**Verification Steps:**
1. Remove custom `get_queryset()` and `perform_create()` overrides
2. Ensure model extends `TenantAwareModel` with `TenantManager`
3. Test API endpoints return tenant-filtered data
4. Compare pattern with working ViewSets (CustomerViewSet)

**Prevention:**
- Use simple declarative ViewSet pattern for tenant-aware models
- Only override `get_queryset()` when additional filtering logic required
- Follow working patterns established in CustomerViewSet
- Avoid custom tenant assignment in `perform_create()`

---

## 🔧 **Issue: Django Pagination Causing Empty Frontend Lists**

**Symptoms:**
- ViewSet returns data successfully (verified in database)
- API response is large (2000+ bytes) but frontend shows 0 items
- Direct database queries show data exists with correct tenant_id
- Frontend console shows `Fetched items: 0`

**Root Cause Analysis:**
- Django REST Framework applies pagination by default
- Frontend expects array `[{}, {}]` but receives `{count: 2, results: [{}, {}]}`
- ViewSet complexity interferes with proper response formatting
- TenantManager filtering works but response structure mismatched

**Solution - Backend Fix:**
```python
# ✅ SIMPLE - Let DRF handle everything with minimal ViewSet
class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()  # TenantManager handles filtering
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    # No custom get_queryset() override needed!

# ❌ COMPLEX - Custom overrides can interfere
class SupplierViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Supplier.objects.all()  # Unnecessary override
    
    def perform_create(self, serializer):
        # Custom logic that TenantAwareModel already handles
```

**Alternative - Disable Pagination:**
```python
# For specific ViewSet
class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    pagination_class = None  # Returns direct array

# Or in settings.py for all ViewSets
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': None,
}
```

**Verification Steps:**
1. Check ViewSet is using simple declarative pattern
2. Verify model extends TenantAwareModel with TenantManager
3. Test API returns expected format (array vs paginated object)
4. Compare with working ViewSets like CustomerViewSet

**Prevention:**
- Use minimal ViewSet pattern for tenant-aware models
- Let TenantManager and TenantAwareModel handle filtering
- Only add custom logic when absolutely necessary
- Document expected response format for frontend

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

## 🔧 **Issue: POS Sale Completion Failing with Missing Database Columns**

**Symptoms:**
- POS sale completion returns 400 error
- Error: "column \"tenant_id\" of relation \"finance_journalentryline\" does not exist"
- After fixing tenant_id, error: "column \"business_id\" of relation \"finance_journalentryline\" does not exist"
- Stock quantity warnings appearing incorrectly for products with inventory

**Root Cause Analysis:**
- Database migrations not fully applied to production
- `finance_journalentryline` table missing required columns (`tenant_id` and `business_id`)
- Frontend checking wrong field for stock quantity (`stock_quantity` instead of `quantity_in_stock`)
- Model expects columns that don't exist in database schema

**Solution - Database Fix:**
```sql
-- Run in production database (python manage.py dbshell)

-- Add missing tenant_id column
ALTER TABLE finance_journalentryline 
ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Add missing business_id column
ALTER TABLE finance_journalentryline 
ADD COLUMN IF NOT EXISTS business_id UUID;

-- Add foreign key constraint for business_id
ALTER TABLE finance_journalentryline
ADD CONSTRAINT finance_journalentryline_business_id_fk 
FOREIGN KEY (business_id) 
REFERENCES users_business(id) 
DEFERRABLE INITIALLY DEFERRED;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_finance_journalentryline_tenant_id 
ON finance_journalentryline(tenant_id);

CREATE INDEX IF NOT EXISTS finance_journalentryline_business_id_idx 
ON finance_journalentryline(business_id);

-- Populate tenant_id from journal_entry -> business relationship
UPDATE finance_journalentry je
SET tenant_id = b.tenant_id
FROM users_business b
WHERE je.business_id = b.id
AND je.tenant_id IS NULL;

-- Populate tenant_id in journal_entry_line
UPDATE finance_journalentryline jel
SET tenant_id = je.tenant_id
FROM finance_journalentry je
WHERE jel.journal_entry_id = je.id
AND jel.tenant_id IS NULL;

-- Populate business_id in journal_entry_line
UPDATE finance_journalentryline jel
SET business_id = je.business_id
FROM finance_journalentry je
WHERE jel.journal_entry_id = je.id
AND jel.business_id IS NULL;

-- Verify the fix
SELECT COUNT(*) as total_records,
       COUNT(tenant_id) as with_tenant,
       COUNT(business_id) as with_business
FROM finance_journalentryline;
```

**Solution - Frontend Fix:**
```javascript
// File: /frontend/pyfactor_next/src/app/dashboard/components/pos/POSSystemInline.js

// ❌ INCORRECT - Wrong field order
const currentStock = product.stock_quantity || product.quantity || 0;

// ✅ CORRECT - Check quantity_in_stock first
const currentStock = product.quantity_in_stock || product.stock_quantity || product.quantity || 0;
```

**Verification Steps:**
1. Connect to production database via Render shell: `python manage.py dbshell`
2. Run the SQL commands above to add missing columns
3. Verify columns exist: `\d finance_journalentryline`
4. Test POS sale completion - should process without errors
5. Verify stock warnings only appear for truly out-of-stock items

**Prevention:**
- Always run migrations on production after model changes
- Create Django management commands for database fixes
- Test POS functionality after any finance/inventory model changes
- Ensure frontend field mappings match backend API responses
- Document required database columns in model docstrings

**Related Files:**
- `/backend/pyfactor/finance/models.py` - JournalEntryLine model definition
- `/backend/pyfactor/finance/management/commands/fix_journal_entry_tenant.py` - Management command
- `/frontend/pyfactor_next/src/app/dashboard/components/pos/POSSystemInline.js` - POS frontend

---

*Last Updated: 2025-08-13*
*For Frontend Issues: See /frontend/pyfactor_next/docs/TROUBLESHOOTING.md*