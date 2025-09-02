# Fix UUID/integer foreign key constraint errors

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


def fix_user_foreign_keys(apps, schema_editor):
    """Fix foreign key constraints that have UUID/integer type mismatches"""
    
    with schema_editor.connection.cursor() as cursor:
        # Fix transport_driver.user_id - change from UUID to INTEGER to match User.id
        cursor.execute("""
            -- Drop existing foreign key constraint if it exists
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'transport_driver_user_id_fkey'
                    AND table_name = 'transport_driver'
                ) THEN
                    ALTER TABLE transport_driver DROP CONSTRAINT transport_driver_user_id_fkey;
                END IF;
            END $$;
        """)
        
        cursor.execute("""
            -- Change user_id column type from UUID to INTEGER (BIGINT to match BigAutoField)
            ALTER TABLE transport_driver 
            ALTER COLUMN user_id TYPE BIGINT USING NULL;
        """)
        
        cursor.execute("""
            -- Recreate the foreign key constraint with correct type
            ALTER TABLE transport_driver 
            ADD CONSTRAINT transport_driver_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES custom_auth_user(id) ON DELETE SET NULL;
        """)
        
        # Fix transport_expense.created_by_id - change from UUID to INTEGER
        cursor.execute("""
            -- Drop existing foreign key constraint if it exists
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'transport_expense_created_by_id_fkey'
                    AND table_name = 'transport_expense'
                ) THEN
                    ALTER TABLE transport_expense DROP CONSTRAINT transport_expense_created_by_id_fkey;
                END IF;
            END $$;
        """)
        
        cursor.execute("""
            -- Change created_by_id column type from UUID to INTEGER (BIGINT)
            ALTER TABLE transport_expense 
            ALTER COLUMN created_by_id TYPE BIGINT USING NULL;
        """)
        
        cursor.execute("""
            -- Recreate the foreign key constraint with correct type
            ALTER TABLE transport_expense 
            ADD CONSTRAINT transport_expense_created_by_id_fkey 
            FOREIGN KEY (created_by_id) REFERENCES custom_auth_user(id) ON DELETE SET NULL;
        """)


def reverse_user_foreign_keys(apps, schema_editor):
    """Reverse the foreign key fixes if needed"""
    
    with schema_editor.connection.cursor() as cursor:
        # Revert transport_driver.user_id back to UUID
        cursor.execute("""
            ALTER TABLE transport_driver DROP CONSTRAINT IF EXISTS transport_driver_user_id_fkey;
            ALTER TABLE transport_driver ALTER COLUMN user_id TYPE UUID USING NULL;
        """)
        
        # Revert transport_expense.created_by_id back to UUID  
        cursor.execute("""
            ALTER TABLE transport_expense DROP CONSTRAINT IF EXISTS transport_expense_created_by_id_fkey;
            ALTER TABLE transport_expense ALTER COLUMN created_by_id TYPE UUID USING NULL;
        """)


class Migration(migrations.Migration):

    dependencies = [
        ('transport', '0003_add_transport_models'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(fix_user_foreign_keys, reverse_user_foreign_keys),
    ]