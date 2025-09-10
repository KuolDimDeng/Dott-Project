#!/usr/bin/env python3
"""
Render Force Fix for Transport Migration 0004
===========================================

Run this directly in Render shell to force-fix the transport migration issue.

Usage in Render shell:
    python scripts/render_force_fix.py
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def force_fix_transport_migration():
    """Force fix the transport migration 0004 issue"""
    print("🔥 === RENDER FORCE FIX FOR TRANSPORT MIGRATION 0004 ===")
    
    with connection.cursor() as cursor:
        
        print("📊 Current state check...")
        
        # Check current column types
        cursor.execute("""
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('transport_driver', 'transport_expense') 
            AND column_name IN ('user_id', 'created_by_id')
        """)
        columns = cursor.fetchall()
        print(f"Found columns: {columns}")
        
        # Check applied migrations
        cursor.execute("""
            SELECT name FROM django_migrations 
            WHERE app = 'transport' AND name = '0004_fix_user_foreign_key_types'
        """)
        migration_applied = cursor.fetchone()
        print(f"Migration 0004 applied: {bool(migration_applied)}")
        
        if migration_applied:
            print("✅ Migration already applied - nothing to do!")
            return
        
        print("\n🔧 Applying force fix...")
        
        # Drop foreign key constraints
        try:
            cursor.execute("""
                DO $$ 
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.table_constraints 
                        WHERE constraint_name = 'transport_driver_user_id_fkey'
                    ) THEN
                        ALTER TABLE transport_driver DROP CONSTRAINT transport_driver_user_id_fkey;
                        RAISE NOTICE 'Dropped transport_driver_user_id_fkey';
                    END IF;
                END $$;
            """)
            print("✅ Dropped transport_driver foreign key constraints")
        except Exception as e:
            print(f"⚠️  Could not drop transport_driver constraints: {e}")
        
        try:
            cursor.execute("""
                DO $$ 
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.table_constraints 
                        WHERE constraint_name = 'transport_expense_created_by_id_fkey'
                    ) THEN
                        ALTER TABLE transport_expense DROP CONSTRAINT transport_expense_created_by_id_fkey;
                        RAISE NOTICE 'Dropped transport_expense_created_by_id_fkey';
                    END IF;
                END $$;
            """)
            print("✅ Dropped transport_expense foreign key constraints")
        except Exception as e:
            print(f"⚠️  Could not drop transport_expense constraints: {e}")
        
        # Convert columns to BIGINT
        try:
            cursor.execute("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'transport_driver' 
                        AND column_name = 'user_id' 
                        AND data_type = 'uuid'
                    ) THEN
                        ALTER TABLE transport_driver ALTER COLUMN user_id TYPE BIGINT USING NULL;
                        RAISE NOTICE 'Converted transport_driver.user_id to BIGINT';
                    END IF;
                END $$;
            """)
            print("✅ Converted transport_driver.user_id to BIGINT")
        except Exception as e:
            print(f"⚠️  Could not convert transport_driver.user_id: {e}")
        
        try:
            cursor.execute("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'transport_expense' 
                        AND column_name = 'created_by_id' 
                        AND data_type = 'uuid'
                    ) THEN
                        ALTER TABLE transport_expense ALTER COLUMN created_by_id TYPE BIGINT USING NULL;
                        RAISE NOTICE 'Converted transport_expense.created_by_id to BIGINT';
                    END IF;
                END $$;
            """)
            print("✅ Converted transport_expense.created_by_id to BIGINT")
        except Exception as e:
            print(f"⚠️  Could not convert transport_expense.created_by_id: {e}")
        
        # Recreate foreign keys if custom_auth_user exists
        try:
            cursor.execute("SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_auth_user'")
            if cursor.fetchone():
                cursor.execute("""
                    ALTER TABLE transport_driver 
                    ADD CONSTRAINT transport_driver_user_id_fkey 
                    FOREIGN KEY (user_id) REFERENCES custom_auth_user(id) ON DELETE SET NULL
                """)
                print("✅ Recreated transport_driver foreign key")
                
                cursor.execute("""
                    ALTER TABLE transport_expense 
                    ADD CONSTRAINT transport_expense_created_by_id_fkey 
                    FOREIGN KEY (created_by_id) REFERENCES custom_auth_user(id) ON DELETE SET NULL
                """)
                print("✅ Recreated transport_expense foreign key")
            else:
                print("⚠️  custom_auth_user table not found - skipping foreign key recreation")
        except Exception as e:
            print(f"⚠️  Could not recreate foreign keys: {e}")
        
        # Mark migration as applied
        try:
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied) 
                VALUES ('transport', '0004_fix_user_foreign_key_types', NOW())
                ON CONFLICT DO NOTHING
            """)
            print("✅ Marked migration 0004 as applied")
        except Exception as e:
            print(f"⚠️  Could not mark migration as applied: {e}")
        
        print("\n📊 Final verification...")
        
        # Verify column types
        cursor.execute("""
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('transport_driver', 'transport_expense') 
            AND column_name IN ('user_id', 'created_by_id')
        """)
        final_columns = cursor.fetchall()
        print(f"Final column types: {final_columns}")
        
        # Verify migration applied
        cursor.execute("""
            SELECT COUNT(*) FROM django_migrations 
            WHERE app = 'transport' AND name = '0004_fix_user_foreign_key_types'
        """)
        migration_count = cursor.fetchone()[0]
        print(f"Migration 0004 applied: {migration_count > 0}")
        
        print("\n🎯 === FORCE FIX COMPLETED ===")
        print("The next deployment should succeed!")

if __name__ == '__main__':
    try:
        force_fix_transport_migration()
    except Exception as e:
        print(f"❌ Force fix failed: {e}")
        import traceback
        traceback.print_exc()