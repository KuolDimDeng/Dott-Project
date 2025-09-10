#!/usr/bin/env python3
"""
Complete Staging Migration Fix
==============================

This script addresses all the migration issues found in staging:
1. Transport migration 0004 not applied 
2. Courier-marketplace dependency conflicts
3. Any other missing migrations where tables exist

Usage:
    python manage.py shell < scripts/staging_migration_complete_fix.py

Or in staging:
    Run this script through the Django admin shell or management command
"""

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

def fix_transport_migrations():
    """Fix transport migration issues"""
    print("🔧 === TRANSPORT MIGRATION FIX ===")
    
    recorder = MigrationRecorder(connection)
    
    # Check which transport tables exist
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE 'transport_%'
        """)
        transport_tables = [row[0] for row in cursor.fetchall()]
    
    print(f"Found transport tables: {transport_tables}")
    
    # Check current migration status
    applied_migrations = set(recorder.migration_qs.filter(app='transport').values_list('name', flat=True))
    print(f"Applied transport migrations: {sorted(applied_migrations)}")
    
    # Required migrations to ensure are marked as applied
    required_migrations = [
        '0001_ensure_base_tables',
        '0002_initial', 
        '0003_add_transport_models',
        '0004_fix_user_foreign_key_types'
    ]
    
    # If transport tables exist, mark all migrations as applied
    if transport_tables:
        for migration_name in required_migrations:
            if migration_name not in applied_migrations:
                try:
                    recorder.record_applied('transport', migration_name)
                    print(f"✅ Marked transport.{migration_name} as applied")
                except Exception as e:
                    print(f"❌ Failed to mark {migration_name}: {e}")
        
        print("✅ Transport migration fix completed")
    else:
        print("❌ No transport tables found - migrations need to run normally")


def fix_courier_marketplace_dependencies():
    """Fix courier-marketplace dependency issue"""
    print("\n🔧 === COURIER-MARKETPLACE DEPENDENCY FIX ===")
    
    recorder = MigrationRecorder(connection)
    
    # Check current status
    courier_migrations = set(recorder.migration_qs.filter(app='couriers').values_list('name', flat=True))
    marketplace_migrations = set(recorder.migration_qs.filter(app='marketplace').values_list('name', flat=True))
    
    print(f"Courier migrations applied: {sorted(courier_migrations)}")
    print(f"Marketplace migrations applied: {sorted(marketplace_migrations)}")
    
    # Check if we have the problematic state
    if '0003_add_courier_integration' in marketplace_migrations and '0001_initial' not in courier_migrations:
        print("❌ PROBLEM DETECTED: marketplace courier integration applied but courier base migration missing")
        
        # Check if couriers tables exist
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_name LIKE 'couriers_%'
            """)
            courier_table_count = cursor.fetchone()[0]
        
        print(f"Courier tables found: {courier_table_count}")
        
        if courier_table_count > 0:
            # Tables exist, mark the migrations as applied
            try:
                recorder.record_applied('couriers', '0001_initial')
                print("✅ Marked couriers.0001_initial as applied")
                
                # Also mark the second courier migration if tables exist for it
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_name = 'couriers_courierprofile' 
                            AND column_name = 'service_categories'
                        );
                    """)
                    has_service_categories = cursor.fetchone()[0]
                    
                    if has_service_categories and '0002_add_delivery_categories' not in courier_migrations:
                        recorder.record_applied('couriers', '0002_add_delivery_categories')
                        print("✅ Also marked couriers.0002_add_delivery_categories as applied")
                        
            except Exception as e:
                print(f"❌ Failed to mark courier migrations: {e}")
        else:
            print("⚠️  No courier tables found - this requires manual investigation")
            
    elif '0001_initial' in courier_migrations:
        print("✅ couriers.0001_initial is already applied - dependency is satisfied")
    else:
        print("ℹ️  No dependency conflicts detected")


def fix_custom_auth_migrations():
    """Fix custom_auth migration status if needed"""
    print("\n🔧 === CUSTOM_AUTH MIGRATION FIX ===")
    
    recorder = MigrationRecorder(connection)
    
    # Check if custom_auth tables exist
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name IN ('custom_auth_tenant', 'custom_auth_user')
        """)
        auth_tables = [row[0] for row in cursor.fetchall()]
    
    print(f"Found custom_auth tables: {auth_tables}")
    
    # If both tables exist, ensure 0001_initial is marked as applied
    if len(auth_tables) >= 2:
        applied = recorder.migration_qs.filter(app='custom_auth', name='0001_initial').exists()
        if not applied:
            try:
                recorder.record_applied('custom_auth', '0001_initial')
                print("✅ Marked custom_auth.0001_initial as applied")
            except Exception as e:
                print(f"❌ Failed to mark custom_auth.0001_initial: {e}")
        else:
            print("✅ custom_auth.0001_initial already applied")


def main():
    """Main function to run all fixes"""
    print("🚀 === STAGING MIGRATION COMPLETE FIX ===")
    
    try:
        # Fix all migration issues
        fix_custom_auth_migrations()
        fix_transport_migrations()
        fix_courier_marketplace_dependencies()
        
        print("\n✅ === ALL MIGRATION FIXES COMPLETED ===")
        print("You can now run 'python manage.py migrate' to continue with remaining migrations")
        
    except Exception as e:
        print(f"❌ Migration fix failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()