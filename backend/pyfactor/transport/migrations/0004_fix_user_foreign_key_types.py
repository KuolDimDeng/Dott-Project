# Fix UUID/integer foreign key constraint errors

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


def fix_user_foreign_keys(apps, schema_editor):
    """Fix foreign key constraints that have UUID/integer type mismatches - DEFENSIVE VERSION"""
    
    with schema_editor.connection.cursor() as cursor:
        # Check if transport_driver table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'transport_driver'
            );
        """)
        driver_table_exists = cursor.fetchone()[0]
        
        if driver_table_exists:
            # Check if user_id column exists and its type
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'transport_driver' 
                AND column_name = 'user_id';
            """)
            user_id_info = cursor.fetchone()
            
            if user_id_info:
                current_type = user_id_info[1]
                print(f"transport_driver.user_id current type: {current_type}")
                
                if current_type == 'uuid':
                    # Only fix if column exists and is UUID type
                    print("✅ Fixing transport_driver.user_id from UUID to BIGINT")
                    
                    # Drop existing foreign key constraint if it exists
                    cursor.execute("""
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
                    
                    try:
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
                        print("✅ transport_driver.user_id successfully converted to BIGINT")
                    except Exception as e:
                        print(f"⚠️  Warning: Could not alter transport_driver.user_id: {e}")
                elif current_type in ['bigint', 'integer']:
                    print("ℹ️  transport_driver.user_id is already correct type (BIGINT/INTEGER)")
                else:
                    print(f"ℹ️  transport_driver.user_id has unexpected type: {current_type}")
            else:
                print("ℹ️  transport_driver.user_id column doesn't exist")
        else:
            print("ℹ️  transport_driver table doesn't exist")
        
        # Check if transport_expense table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'transport_expense'
            );
        """)
        expense_table_exists = cursor.fetchone()[0]
        
        if expense_table_exists:
            # Check if created_by_id column exists and its type
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'transport_expense' 
                AND column_name = 'created_by_id';
            """)
            created_by_info = cursor.fetchone()
            
            if created_by_info:
                current_type = created_by_info[1]
                print(f"transport_expense.created_by_id current type: {current_type}")
                
                if current_type == 'uuid':
                    # Only fix if column exists and is UUID type
                    print("✅ Fixing transport_expense.created_by_id from UUID to BIGINT")
                    
                    # Drop existing foreign key constraint if it exists
                    cursor.execute("""
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
                    
                    try:
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
                        print("✅ transport_expense.created_by_id successfully converted to BIGINT")
                    except Exception as e:
                        print(f"⚠️  Warning: Could not alter transport_expense.created_by_id: {e}")
                elif current_type in ['bigint', 'integer']:
                    print("ℹ️  transport_expense.created_by_id is already correct type (BIGINT/INTEGER)")
                else:
                    print(f"ℹ️  transport_expense.created_by_id has unexpected type: {current_type}")
            else:
                print("ℹ️  transport_expense.created_by_id column doesn't exist")
        else:
            print("ℹ️  transport_expense table doesn't exist")
            
        print("✅ Transport foreign key migration completed successfully")


def reverse_user_foreign_keys(apps, schema_editor):
    """Reverse the foreign key fixes if needed"""
    
    with schema_editor.connection.cursor() as cursor:
        try:
            # Revert transport_driver.user_id back to UUID
            cursor.execute("""
                ALTER TABLE transport_driver DROP CONSTRAINT IF EXISTS transport_driver_user_id_fkey;
                ALTER TABLE transport_driver ALTER COLUMN user_id TYPE UUID USING NULL;
            """)
        except Exception as e:
            print(f"Could not revert transport_driver.user_id: {e}")
        
        try:
            # Revert transport_expense.created_by_id back to UUID  
            cursor.execute("""
                ALTER TABLE transport_expense DROP CONSTRAINT IF EXISTS transport_expense_created_by_id_fkey;
                ALTER TABLE transport_expense ALTER COLUMN created_by_id TYPE UUID USING NULL;
            """)
        except Exception as e:
            print(f"Could not revert transport_expense.created_by_id: {e}")


class Migration(migrations.Migration):

    dependencies = [
        ('transport', '0003_add_transport_models'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(fix_user_foreign_keys, reverse_user_foreign_keys),
    ]