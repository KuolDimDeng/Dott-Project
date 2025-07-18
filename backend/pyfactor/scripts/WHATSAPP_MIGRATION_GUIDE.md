# WhatsApp Business Migration Guide

## Overview
This guide explains how to apply the Django migrations for the WhatsApp Business models.

## Files Created
- `/whatsapp_business/migrations/0001_initial.py` - Initial migration for all WhatsApp Business models
- `/scripts/test_whatsapp_migration.py` - Test script to verify migration

## Database Tables Created
The migration will create these 7 tables:

1. **whatsapp_business_settings** - Business configuration and settings
2. **whatsapp_catalogs** - Product catalogs for businesses  
3. **whatsapp_products** - Products and services in catalogs
4. **whatsapp_orders** - Customer orders placed via WhatsApp
5. **whatsapp_order_items** - Individual items within orders
6. **whatsapp_messages** - Message tracking and status
7. **whatsapp_analytics** - Business performance metrics

## Running the Migration

### Option 1: Test First (Recommended)
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python scripts/test_whatsapp_migration.py
```

### Option 2: Direct Migration
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python manage.py makemigrations whatsapp_business
python manage.py migrate whatsapp_business
```

### Option 3: Full Migration (All Apps)
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python manage.py migrate
```

## Verification Commands

### Check Migration Status
```bash
python manage.py showmigrations whatsapp_business
```

### View SQL That Will Be Generated
```bash
python manage.py sqlmigrate whatsapp_business 0001
```

### Check Database Tables
```bash
python manage.py dbshell
\dt whatsapp_*
```

## Troubleshooting

### Common Issues

1. **"relation 'whatsapp_catalogs' does not exist"**
   - Solution: Run the migration commands above
   
2. **Migration dependency errors**
   - Check that custom_auth and inventory apps are migrated first
   - Run: `python manage.py migrate custom_auth inventory`

3. **Permission errors**
   - Ensure database user has CREATE TABLE permissions
   - Check DATABASE_URL environment variable

### Dependencies
The migration depends on:
- `custom_auth.0027_passwordresettoken` (for Tenant model)
- `inventory.0008_remove_service_inventory_s_name_80acbf_idx_and_more` (for Product model)

## Model Relationships

- **WhatsAppBusinessSettings** → One-to-One with Tenant
- **WhatsAppCatalog** → Many-to-One with Tenant  
- **WhatsAppProduct** → Many-to-One with Catalog, Optional link to inventory.Product
- **WhatsAppOrder** → Many-to-One with Tenant
- **WhatsAppOrderItem** → Many-to-One with Order and Product
- **WhatsAppMessage** → Many-to-One with Tenant, Optional link to Order
- **WhatsAppAnalytics** → Many-to-One with Tenant (unique per date)

## Environment Setup
Make sure these are configured after migration:
- `WHATSAPP_ACCESS_TOKEN` - Meta Business Platform token
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp Business phone number ID

## Post-Migration Testing
1. Start Django server
2. Access WhatsApp Business API endpoints
3. Verify no "relation does not exist" errors
4. Test creating catalog and products

## Rollback (if needed)
```bash
python manage.py migrate whatsapp_business zero
```

## Production Deployment
1. Test migration locally first
2. Backup production database
3. Run migration during maintenance window
4. Verify all WhatsApp Business endpoints work
5. Monitor for any database errors