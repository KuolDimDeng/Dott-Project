"""
Comprehensive migration to add business_id to ALL tables that need it.
Many models have a ForeignKey to Business, which creates a business_id column.
This migration ensures all tables have this column where needed.
"""

from django.db import migrations
import logging

logger = logging.getLogger(__name__)

def add_business_id_to_all_tables(apps, schema_editor):
    """Add business_id column to all tables that need it."""
    
    # Tables that should have business_id (based on model definitions)
    tables_needing_business_id = [
        # Finance tables
        'finance_account',
        'finance_financetransaction', 
        'finance_chartofaccount',
        'finance_journalentry',
        'finance_journalentryline',
        'finance_generalledgerentry',
        'finance_fixedasset',
        'finance_budget',
        
        # Sales tables  
        'sales_invoice',
        'sales_salesorder',
        'sales_postransaction',
        'sales_sale',
        
        # Inventory tables
        'inventory_vendor',
        'inventory_product',
        'inventory_service',
        
        # HR tables
        'hr_employee',
        'hr_timesheet',
        'hr_timesheetentry',
        
        # Payroll tables
        'payroll_payrollrun',
        'payroll_paystatement',
        
        # Jobs tables
        'jobs_job',
        
        # CRM tables
        'crm_customer',
        
        # Banking tables
        'banking_bankaccount',
        
        # Product suppliers
        'product_suppliers_productsupplier',
        'product_suppliers_productsupplieritem',
        
        # Purchases tables
        'purchases_bill',
        'purchases_vendor',
        'purchases_purchaseorder',
        
        # Timesheets
        'timesheets_geofencezone',
        
        # Onboarding
        'onboarding_businessprofile',
    ]
    
    with schema_editor.connection.cursor() as cursor:
        # Get a default business_id from existing data
        cursor.execute("""
            SELECT id FROM users_business 
            WHERE id IS NOT NULL 
            LIMIT 1;
        """)
        result = cursor.fetchone()
        
        if not result:
            # Try to get from tenant_id
            cursor.execute("""
                SELECT DISTINCT tenant_id 
                FROM custom_auth_user 
                WHERE tenant_id IS NOT NULL 
                LIMIT 1;
            """)
            result = cursor.fetchone()
        
        default_business_id = result[0] if result else None
        
        if not default_business_id:
            logger.warning("No default business_id found - skipping updates")
        
        success_count = 0
        skip_count = 0
        error_count = 0
        
        for table_name in tables_needing_business_id:
            try:
                # Check if table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    );
                """, [table_name])
                
                if not cursor.fetchone()[0]:
                    logger.info(f"Table {table_name} does not exist, skipping")
                    skip_count += 1
                    continue
                
                # Check if business_id column exists
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = %s 
                    AND column_name = 'business_id';
                """, [table_name])
                
                if cursor.fetchone():
                    logger.info(f"✅ {table_name} already has business_id")
                    skip_count += 1
                    continue
                
                # Add business_id column
                cursor.execute(f"""
                    ALTER TABLE {table_name} 
                    ADD COLUMN IF NOT EXISTS business_id uuid;
                """)
                
                logger.info(f"➕ Added business_id to {table_name}")
                
                # Update existing rows with default or tenant_id
                if default_business_id:
                    # First try to use tenant_id if it exists
                    cursor.execute(f"""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = '{table_name}' 
                        AND column_name = 'tenant_id';
                    """)
                    
                    if cursor.fetchone():
                        # Use tenant_id as business_id
                        cursor.execute(f"""
                            UPDATE {table_name} 
                            SET business_id = tenant_id 
                            WHERE business_id IS NULL 
                            AND tenant_id IS NOT NULL;
                        """)
                    else:
                        # Use default business_id
                        cursor.execute(f"""
                            UPDATE {table_name} 
                            SET business_id = %s 
                            WHERE business_id IS NULL;
                        """, [default_business_id])
                    
                    rows_updated = cursor.rowcount
                    if rows_updated > 0:
                        logger.info(f"   Updated {rows_updated} rows")
                
                # Create index for performance
                cursor.execute(f"""
                    CREATE INDEX IF NOT EXISTS idx_{table_name}_business_id 
                    ON {table_name}(business_id);
                """)
                
                success_count += 1
                logger.info(f"✅ Successfully processed {table_name}")
                
            except Exception as e:
                logger.error(f"❌ Error processing {table_name}: {str(e)}")
                error_count += 1
                continue
        
        logger.info(f"""
        ========================================
        Migration Complete:
        - Success: {success_count} tables
        - Skipped: {skip_count} tables  
        - Errors: {error_count} tables
        ========================================
        """)

def reverse_migration(apps, schema_editor):
    """We don't want to remove business_id columns on reverse."""
    logger.info("Reverse migration called - not removing business_id columns for safety")
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('custom_auth', '0002_add_tenant_id_to_all_models'),
    ]

    operations = [
        migrations.RunPython(
            add_business_id_to_all_tables,
            reverse_migration,
            elidable=False
        ),
    ]