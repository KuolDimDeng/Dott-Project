"""
Add tenant_id column to ALL finance tables that inherit from TenantAwareModel
This migration comprehensively adds tenant_id to any finance tables missing it.
"""

from django.db import migrations, models
import uuid
import logging

logger = logging.getLogger(__name__)

def add_tenant_id_columns(apps, schema_editor):
    """Add tenant_id column to all finance tables that need it."""
    
    # Tables that should have tenant_id (inherit from TenantAwareModel)
    tables_to_check = [
        'finance_account',
        'finance_financetransaction', 
        'finance_accountcategory',
        'finance_chartofaccount',
        'finance_journalentry',
        'finance_journalentryline',  # This is the one causing the current error
        'finance_generalledgerentry',
        'finance_fixedasset',
        'finance_budget',
    ]
    
    db_alias = schema_editor.connection.alias
    
    with schema_editor.connection.cursor() as cursor:
        for table_name in tables_to_check:
            try:
                # Check if table exists
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '{table_name}'
                    );
                """)
                table_exists = cursor.fetchone()[0]
                
                if not table_exists:
                    logger.info(f"Table {table_name} does not exist, skipping")
                    continue
                
                # Check if tenant_id column already exists
                cursor.execute(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}' 
                    AND column_name = 'tenant_id';
                """)
                
                if cursor.fetchone():
                    logger.info(f"Table {table_name} already has tenant_id column")
                    continue
                
                # Add tenant_id column
                cursor.execute(f"""
                    ALTER TABLE {table_name} 
                    ADD COLUMN IF NOT EXISTS tenant_id uuid;
                """)
                logger.info(f"Added tenant_id column to {table_name}")
                
                # Get a sample tenant_id from existing data or user
                cursor.execute("""
                    SELECT DISTINCT tenant_id 
                    FROM custom_auth_user 
                    WHERE tenant_id IS NOT NULL 
                    LIMIT 1;
                """)
                result = cursor.fetchone()
                
                if result:
                    default_tenant_id = result[0]
                    
                    # Update existing rows with the default tenant_id
                    cursor.execute(f"""
                        UPDATE {table_name} 
                        SET tenant_id = %s 
                        WHERE tenant_id IS NULL;
                    """, [default_tenant_id])
                    
                    rows_updated = cursor.rowcount
                    logger.info(f"Updated {rows_updated} existing rows in {table_name} with tenant_id")
                    
                # Create index on tenant_id for better performance
                cursor.execute(f"""
                    CREATE INDEX IF NOT EXISTS idx_{table_name}_tenant_id 
                    ON {table_name}(tenant_id);
                """)
                logger.info(f"Created index on tenant_id for {table_name}")
                
            except Exception as e:
                logger.error(f"Error processing table {table_name}: {str(e)}")
                # Continue with other tables even if one fails
                continue

def remove_tenant_id_columns(apps, schema_editor):
    """Reverse migration to remove tenant_id columns."""
    
    tables_to_check = [
        'finance_account',
        'finance_financetransaction',
        'finance_accountcategory', 
        'finance_chartofaccount',
        'finance_journalentry',
        'finance_journalentryline',
        'finance_generalledgerentry',
        'finance_fixedasset',
        'finance_budget',
    ]
    
    with schema_editor.connection.cursor() as cursor:
        for table_name in tables_to_check:
            try:
                # Drop index first if it exists
                cursor.execute(f"""
                    DROP INDEX IF EXISTS idx_{table_name}_tenant_id;
                """)
                
                # Drop column if it exists
                cursor.execute(f"""
                    ALTER TABLE {table_name} 
                    DROP COLUMN IF EXISTS tenant_id;
                """)
                logger.info(f"Removed tenant_id column from {table_name}")
                
            except Exception as e:
                logger.error(f"Error removing tenant_id from {table_name}: {str(e)}")
                continue

class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0010_comprehensive_unique_constraint_fix'),
    ]

    operations = [
        migrations.RunPython(
            add_tenant_id_columns,
            remove_tenant_id_columns,
            elidable=False
        ),
    ]