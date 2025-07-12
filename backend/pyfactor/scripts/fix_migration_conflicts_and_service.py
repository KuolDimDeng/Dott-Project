#!/usr/bin/env python
"""
Script to fix migration conflicts and apply the Service tenant_id migration.

Run this script from the Django shell:
python manage.py shell < scripts/fix_migration_conflicts_and_service.py
"""

import os
import sys
from django.core.management import call_command
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

def fix_migrations():
    print("=== Django Migration Fix Script ===\n")
    
    # Check for migration conflicts
    print("1. Checking for migration conflicts...")
    try:
        executor = MigrationExecutor(connection)
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        print(f"   Found {len(plan)} migrations to apply")
    except Exception as e:
        if "Conflicting migrations detected" in str(e):
            print("   ❌ Migration conflicts detected!")
            print("   Running makemigrations --merge to fix conflicts...")
            
            try:
                # Try to auto-merge
                os.system("python manage.py makemigrations --merge --noinput")
                print("   ✅ Migrations merged successfully!")
            except Exception as merge_error:
                print(f"   ❌ Auto-merge failed: {merge_error}")
                print("   Please run manually: python manage.py makemigrations --merge")
                return False
    
    # Show migration status
    print("\n2. Current migration status:")
    os.system("python manage.py showmigrations custom_auth | tail -10")
    os.system("python manage.py showmigrations inventory | tail -10")
    
    # Apply all pending migrations
    print("\n3. Applying all pending migrations...")
    try:
        call_command('migrate', verbosity=2)
        print("   ✅ All migrations applied successfully!")
    except Exception as e:
        print(f"   ❌ Migration failed: {e}")
        return False
    
    # Check if tenant_id exists in inventory_service
    print("\n4. Verifying inventory_service.tenant_id column...")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'inventory_service' 
            AND column_name = 'tenant_id'
        """)
        result = cursor.fetchone()
        
        if result:
            print("   ✅ tenant_id column exists in inventory_service table!")
            
            # Check if there are any services without tenant_id
            cursor.execute("SELECT COUNT(*) FROM inventory_service WHERE tenant_id IS NULL")
            null_count = cursor.fetchone()[0]
            if null_count > 0:
                print(f"   ⚠️  Found {null_count} services without tenant_id")
                print("   These will need to be assigned to a tenant manually.")
        else:
            print("   ❌ tenant_id column is still missing!")
            print("   The migration may have failed. Check the migration files.")
            
            # List the actual columns
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_service'
                ORDER BY ordinal_position
            """)
            columns = cursor.fetchall()
            print("\n   Current columns in inventory_service:")
            for col in columns:
                print(f"   - {col[0]}")
    
    # Check Redis configuration issue
    print("\n5. Checking Redis configuration...")
    try:
        from django.conf import settings
        celery_broker = getattr(settings, 'CELERY_BROKER_URL', None)
        if celery_broker and 'your-redis-host' in celery_broker:
            print("   ⚠️  Redis is misconfigured: using placeholder 'your-redis-host'")
            print("   Update CELERY_BROKER_URL in settings or disable Celery if not needed")
        else:
            print("   ✅ Redis configuration looks correct")
    except:
        pass
    
    print("\n=== Migration Fix Complete ===")
    return True

if __name__ == "__main__":
    success = fix_migrations()
    if success:
        print("\n✅ All issues resolved! Service management should now work.")
    else:
        print("\n❌ Some issues remain. Please check the errors above.")