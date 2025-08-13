#!/usr/bin/env python3
"""
Script to check which tables should have tenant_id but don't.
This helps identify missing tenant_id columns across all apps.
"""

import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.apps import apps
from custom_auth.tenant_base_model import TenantAwareModel

def check_tenant_id_columns():
    """Check all models that inherit from TenantAwareModel and verify they have tenant_id in DB."""
    
    print("=" * 80)
    print("CHECKING TENANT_ID COLUMNS ACROSS ALL TABLES")
    print("=" * 80)
    
    missing_columns = []
    has_columns = []
    
    with connection.cursor() as cursor:
        # Get all models that inherit from TenantAwareModel
        for model in apps.get_models():
            if issubclass(model, TenantAwareModel) and not model._meta.abstract:
                table_name = model._meta.db_table
                app_label = model._meta.app_label
                model_name = model.__name__
                
                try:
                    # Check if table exists
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = %s
                        );
                    """, [table_name])
                    
                    table_exists = cursor.fetchone()[0]
                    
                    if not table_exists:
                        print(f"⚠️  Table does not exist: {table_name} ({app_label}.{model_name})")
                        continue
                    
                    # Check if tenant_id column exists
                    cursor.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = %s 
                        AND column_name = 'tenant_id';
                    """, [table_name])
                    
                    if cursor.fetchone():
                        has_columns.append({
                            'table': table_name,
                            'app': app_label,
                            'model': model_name
                        })
                        print(f"✅ {table_name} ({app_label}.{model_name}) - HAS tenant_id")
                    else:
                        missing_columns.append({
                            'table': table_name,
                            'app': app_label,
                            'model': model_name
                        })
                        print(f"❌ {table_name} ({app_label}.{model_name}) - MISSING tenant_id")
                        
                        # Check how many rows exist
                        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                        row_count = cursor.fetchone()[0]
                        print(f"   └─ Rows in table: {row_count}")
                        
                except Exception as e:
                    print(f"⚠️  Error checking {table_name}: {str(e)}")
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    print(f"\n✅ Tables WITH tenant_id: {len(has_columns)}")
    for item in has_columns:
        print(f"   - {item['table']} ({item['app']}.{item['model']})")
    
    print(f"\n❌ Tables MISSING tenant_id: {len(missing_columns)}")
    for item in missing_columns:
        print(f"   - {item['table']} ({item['app']}.{item['model']})")
    
    if missing_columns:
        print("\n" + "=" * 80)
        print("MIGRATION NEEDED")
        print("=" * 80)
        
        # Group by app
        apps_needing_migration = {}
        for item in missing_columns:
            app = item['app']
            if app not in apps_needing_migration:
                apps_needing_migration[app] = []
            apps_needing_migration[app].append(item['table'])
        
        print("\nTables needing tenant_id by app:")
        for app, tables in apps_needing_migration.items():
            print(f"\n{app}:")
            for table in tables:
                print(f"  - {table}")
    
    return missing_columns

if __name__ == "__main__":
    missing = check_tenant_id_columns()
    
    # Exit with non-zero code if there are missing columns
    sys.exit(1 if missing else 0)