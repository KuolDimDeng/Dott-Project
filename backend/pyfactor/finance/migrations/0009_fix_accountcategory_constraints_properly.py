# Generated migration to properly fix AccountCategory constraints
# This follows Django best practices for handling database constraints

from django.db import migrations, models
from django.db.utils import ProgrammingError
import logging

logger = logging.getLogger(__name__)

def remove_old_constraints(apps, schema_editor):
    """
    Remove any old constraints that might be causing issues.
    This is idempotent - safe to run multiple times.
    """
    with schema_editor.connection.cursor() as cursor:
        # List of potential old constraints to remove
        old_constraints = [
            'finance_accountcategory_code_key',
            'finance_accountcategory_code_uniq',
            'accountcategory_code_unique',
        ]
        
        for constraint_name in old_constraints:
            try:
                cursor.execute(f"""
                    ALTER TABLE finance_accountcategory 
                    DROP CONSTRAINT IF EXISTS {constraint_name} CASCADE;
                """)
                logger.info(f"Removed constraint: {constraint_name}")
            except ProgrammingError:
                # Constraint doesn't exist, that's fine
                pass
        
        # Also remove any unique indexes on code alone
        try:
            cursor.execute("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'finance_accountcategory' 
                AND indexdef LIKE '%UNIQUE%code%'
                AND indexdef NOT LIKE '%tenant_id%';
            """)
            
            indexes = cursor.fetchall()
            for (idx_name,) in indexes:
                try:
                    cursor.execute(f"DROP INDEX IF EXISTS {idx_name} CASCADE;")
                    logger.info(f"Removed index: {idx_name}")
                except ProgrammingError:
                    pass
        except Exception as e:
            logger.warning(f"Could not check/remove indexes: {e}")

def reverse_remove_constraints(apps, schema_editor):
    """
    Reverse operation - we don't want to recreate the bad constraints
    """
    pass  # Intentionally do nothing

class Migration(migrations.Migration):
    
    atomic = True  # Ensure this runs in a transaction
    
    dependencies = [
        ('finance', '0008_fix_accountcategory_unique_constraint'),
    ]

    operations = [
        # Step 1: Remove old constraints using RunPython for better control
        migrations.RunPython(
            remove_old_constraints,
            reverse_remove_constraints,
        ),
        
        # Step 2: Remove the unique=True from the code field if it exists
        migrations.AlterField(
            model_name='accountcategory',
            name='code',
            field=models.CharField(max_length=10),
        ),
        
        # Step 3: Ensure the correct constraint exists (unique per tenant)
        migrations.AddConstraint(
            model_name='accountcategory',
            constraint=models.UniqueConstraint(
                fields=['tenant_id', 'code'],
                name='unique_category_code_per_tenant_v2',
                condition=models.Q(tenant_id__isnull=False)
            ),
        ),
        
        # Step 4: Add an index for performance
        migrations.AddIndex(
            model_name='accountcategory',
            index=models.Index(
                fields=['tenant_id', 'code'],
                name='idx_category_tenant_code'
            ),
        ),
    ]