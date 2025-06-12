# Sales Models Alignment Summary

## Current Issues

### 1. Model-Database Mismatches
- Django models and SQL schema definitions are out of sync
- Some models lack tenant awareness (not inheriting from TenantAwareModel)
- Missing fields in Django models that exist in SQL schema
- Table names don't match between Django and SQL

### 2. Missing Models
- **SalesTax**: Exists in SQL but not in Django models
- **SalesProduct**: Exists in SQL but not in Django models (different from inventory.Product)

### 3. Tenant Awareness Issues
The following models were NOT tenant-aware:
- Estimate
- EstimateItem  
- EstimateAttachment
- InvoiceItem
- Refund
- RefundItem
- Customer (CRM model)

## Changes Made

### 1. Created New Migration Files
- `/sales/migrations/0002_add_missing_fields_and_models.py` - Adds missing fields and models
- `/crm/migrations/0004_add_tenant_to_customer.py` - Makes Customer tenant-aware

### 2. Updated Models
All models now inherit from TenantAwareModel and include:
- tenant_id field
- TenantManager 
- Proper Meta class with db_table and indexes

### 3. Added Missing Models
- **SalesTax**: For tax rate management
- **SalesProduct**: For sales-specific product catalog

### 4. Added Missing Fields
Added fields to match SQL schema:
- Invoice: subtotal, tax_total, total, amount_paid, balance_due, notes, terms
- Estimate: estimate_date, expiry_date, status, subtotal, tax_total, total, notes, terms
- SalesOrder: order_date, status, subtotal, tax_total, total, notes
- All item models: tax_rate, tax_amount, total

## Next Steps

### 1. Apply Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 2. Apply RLS Policies
Execute the SQL script:
```bash
psql -U your_db_user -d your_db_name -f apply_rls_to_sales_tables.sql
```

### 3. Update Database User
Replace 'your_db_user' in the SQL script with your actual database user.

### 4. Verify Tables
Check that all tables exist with proper structure:
```sql
\dt sales_*
\dt crm_customer
```

### 5. Test Tenant Isolation
Ensure all queries properly filter by tenant_id.

## Important Notes

1. **Backward Compatibility**: The migration adds fields without removing existing ones
2. **Data Migration**: Existing records need tenant_id populated
3. **Unique Constraints**: Updated to be per-tenant (e.g., invoice numbers)
4. **Foreign Keys**: All relationships maintained
5. **RLS Policies**: Must be applied for security

## Testing Checklist

- [ ] All migrations apply successfully
- [ ] Tables created with correct structure
- [ ] RLS policies enforced
- [ ] CRUD operations work with tenant isolation
- [ ] No data leakage between tenants
- [ ] Frontend components work with updated models