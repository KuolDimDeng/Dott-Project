"""
Emergency migration to ensure finance_journalentryline has tenant_id column.
This is a hotfix for the POS transaction issue in staging.
"""

from django.db import migrations
import logging

logger = logging.getLogger(__name__)

def ensure_tenant_id_column(apps, schema_editor):
    """Ensure finance_journalentryline has tenant_id column."""
    
    with schema_editor.connection.cursor() as cursor:
        try:
            # Check if tenant_id column exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'finance_journalentryline' 
                AND column_name = 'tenant_id';
            """)
            
            if cursor.fetchone():
                logger.info("finance_journalentryline already has tenant_id column")
                return
            
            # Add tenant_id column
            cursor.execute("""
                ALTER TABLE finance_journalentryline 
                ADD COLUMN tenant_id uuid;
            """)
            logger.info("Added tenant_id column to finance_journalentryline")
            
            # Get a default tenant_id from existing data
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
                cursor.execute("""
                    UPDATE finance_journalentryline 
                    SET tenant_id = %s 
                    WHERE tenant_id IS NULL;
                """, [default_tenant_id])
                
                rows_updated = cursor.rowcount
                logger.info(f"Updated {rows_updated} existing rows with tenant_id")
            
            # Create index for better performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_finance_journalentryline_tenant_id 
                ON finance_journalentryline(tenant_id);
            """)
            logger.info("Created index on tenant_id for finance_journalentryline")
            
        except Exception as e:
            logger.error(f"Error ensuring tenant_id column: {str(e)}")
            raise

def reverse_migration(apps, schema_editor):
    """Reverse migration - we don't want to remove the column."""
    pass  # Do nothing on reverse

class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0011_add_tenant_id_to_all_tables'),
    ]

    operations = [
        migrations.RunPython(
            ensure_tenant_id_column,
            reverse_migration,
            elidable=False
        ),
    ]