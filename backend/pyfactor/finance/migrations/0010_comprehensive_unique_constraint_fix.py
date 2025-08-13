"""
Comprehensive migration to fix ALL unique constraints that should be tenant-specific.
This migration ensures that all models inheriting from TenantAwareModel have proper
per-tenant unique constraints instead of global ones.
"""

from django.db import migrations, models
from django.db.utils import ProgrammingError
import logging

logger = logging.getLogger(__name__)

def fix_all_unique_constraints(apps, schema_editor):
    """
    Remove all global unique constraints and add tenant-specific ones.
    This is a comprehensive fix for all tenant-aware models.
    """
    with schema_editor.connection.cursor() as cursor:
        
        # Dictionary of tables and their fields that need fixing
        # Format: 'table_name': ['field1', 'field2', ...]
        tables_to_fix = {
            'finance_accountcategory': ['code'],
            'finance_chartofaccount': ['account_number'],
            'finance_asset': ['asset_tag'],
            'finance_costcategory': ['code', 'name'],
            'sales_estimate': ['estimate_num'],
            'sales_postransaction': ['transaction_number'],
            'sales_posrefund': ['refund_number'],
            'purchases_vendor': ['vendor_number'],
            'purchases_bill': ['bill_number'],
            'purchases_purchaseorder': ['order_number'],
            'purchases_purchasereturn': ['return_number'],
            'purchases_procurement': ['procurement_number'],
            'transport_load': ['reference_number'],
            'inventory_material': ['sku'],
            'inventory_service': ['service_code'],
            'hr_employee': ['employee_id'],
            'payroll_payrollrun': ['run_number'],
        }
        
        for table_name, fields in tables_to_fix.items():
            # Check if table exists
            try:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table_name}'
                    );
                """)
                
                if not cursor.fetchone()[0]:
                    logger.info(f"Table {table_name} does not exist, skipping")
                    continue
                    
            except Exception as e:
                logger.warning(f"Could not check table {table_name}: {e}")
                continue
            
            for field_name in fields:
                try:
                    # Find and remove any global unique constraints on this field
                    cursor.execute(f"""
                        SELECT conname 
                        FROM pg_constraint 
                        WHERE conrelid = '{table_name}'::regclass
                        AND contype = 'u'
                        AND (
                            SELECT array_to_string(array_agg(attname), ',')
                            FROM pg_attribute
                            WHERE attrelid = conrelid
                            AND attnum = ANY(conkey)
                        ) = '{field_name}';
                    """)
                    
                    constraints = cursor.fetchall()
                    for (constraint_name,) in constraints:
                        logger.info(f"Removing global constraint {constraint_name} from {table_name}.{field_name}")
                        cursor.execute(f"ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {constraint_name} CASCADE;")
                    
                    # Also check for unique indexes on the field alone
                    cursor.execute(f"""
                        SELECT indexname 
                        FROM pg_indexes 
                        WHERE tablename = '{table_name}' 
                        AND indexdef LIKE '%UNIQUE%{field_name}%'
                        AND indexdef NOT LIKE '%tenant_id%';
                    """)
                    
                    indexes = cursor.fetchall()
                    for (idx_name,) in indexes:
                        logger.info(f"Removing unique index {idx_name} from {table_name}.{field_name}")
                        cursor.execute(f"DROP INDEX IF EXISTS {idx_name} CASCADE;")
                    
                    # Check if tenant_id column exists (for tenant-aware models)
                    cursor.execute(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_name = '{table_name}' 
                            AND column_name = 'tenant_id'
                        );
                    """)
                    
                    has_tenant_id = cursor.fetchone()[0]
                    
                    if has_tenant_id:
                        # Create the correct per-tenant constraint if it doesn't exist
                        constraint_name = f"unique_{table_name}_{field_name}_per_tenant"
                        
                        cursor.execute(f"""
                            SELECT EXISTS (
                                SELECT FROM pg_constraint 
                                WHERE conname = '{constraint_name}'
                            );
                        """)
                        
                        if not cursor.fetchone()[0]:
                            logger.info(f"Creating per-tenant constraint for {table_name}.{field_name}")
                            cursor.execute(f"""
                                ALTER TABLE {table_name} 
                                ADD CONSTRAINT {constraint_name} 
                                UNIQUE (tenant_id, {field_name});
                            """)
                        else:
                            logger.info(f"Per-tenant constraint already exists for {table_name}.{field_name}")
                    
                except Exception as e:
                    logger.error(f"Error fixing {table_name}.{field_name}: {e}")
                    # Continue with other fields even if one fails
                    continue
        
        logger.info("Comprehensive constraint fix completed")

def reverse_fix(apps, schema_editor):
    """
    We don't want to reverse this fix - keep the per-tenant constraints
    """
    pass

class Migration(migrations.Migration):
    
    atomic = True
    
    dependencies = [
        ('finance', '0009_fix_accountcategory_constraints_properly'),
    ]

    operations = [
        migrations.RunPython(
            fix_all_unique_constraints,
            reverse_fix,
        ),
    ]