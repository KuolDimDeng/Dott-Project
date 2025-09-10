#!/usr/bin/env python3
"""
Fix Courier-Marketplace Migration Dependency Issue
==================================================

This script fixes the specific issue where marketplace.0003_add_courier_integration
was applied before its dependency couriers.0001_initial.

Usage:
    python manage.py shell < scripts/fix_courier_marketplace_dependency.py

Or in production:
    docker exec -it container python manage.py shell < scripts/fix_courier_marketplace_dependency.py
"""

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

def fix_courier_marketplace_dependencies():
    """Fix the courier-marketplace migration dependency issue"""
    print("🔧 === COURIER-MARKETPLACE DEPENDENCY FIX ===")
    
    recorder = MigrationRecorder(connection)
    
    # Check current status
    courier_migrations = set(recorder.migration_qs.filter(app='couriers').values_list('name', flat=True))
    marketplace_migrations = set(recorder.migration_qs.filter(app='marketplace').values_list('name', flat=True))
    
    print(f"Courier migrations applied: {sorted(courier_migrations)}")
    print(f"Marketplace migrations applied: {sorted(marketplace_migrations)}")
    
    # Check if we have the problematic state
    problematic_migration = 'marketplace.0003_add_courier_integration' 
    dependency_migration = 'couriers.0001_initial'
    
    if '0003_add_courier_integration' in marketplace_migrations and '0001_initial' not in courier_migrations:
        print(f"❌ PROBLEM DETECTED: {problematic_migration} is applied but {dependency_migration} is not")
        
        # Check if couriers tables exist
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_name LIKE 'couriers_%'
            """)
            courier_table_count = cursor.fetchone()[0]
        
        print(f"Courier tables found: {courier_table_count}")
        
        if courier_table_count > 0:
            # Tables exist, mark the migration as applied
            print("✅ Courier tables exist, marking couriers.0001_initial as applied")
            try:
                recorder.record_applied('couriers', '0001_initial')
                print("✅ Successfully marked couriers.0001_initial as applied")
                
                # Also mark the second courier migration if tables exist for it
                with connection.cursor() as cursor2:
                    cursor2.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_name = 'couriers_courierprofile' 
                            AND column_name = 'service_categories'
                        );
                    """)
                    has_service_categories = cursor2.fetchone()[0]
                    
                    if has_service_categories and '0002_add_delivery_categories' not in courier_migrations:
                        recorder.record_applied('couriers', '0002_add_delivery_categories')
                        print("✅ Also marked couriers.0002_add_delivery_categories as applied")
                    
            except Exception as e:
                print(f"❌ Failed to mark courier migrations: {e}")
        else:
            print("⚠️  No courier tables found - this requires manual investigation")
            
    elif '0001_initial' in courier_migrations:
        print("✅ couriers.0001_initial is already applied - dependency is satisfied")
        
        if '0003_add_courier_integration' in marketplace_migrations:
            print("✅ Marketplace courier integration is also applied - no conflicts")
        else:
            print("ℹ️  Marketplace courier integration not yet applied")
    else:
        print("ℹ️  Neither migration is applied - normal state")

def main():
    """Main function"""
    try:
        fix_courier_marketplace_dependencies()
        print("\n✅ === DEPENDENCY FIX COMPLETED ===")
        print("You can now run 'python manage.py migrate' safely")
    except Exception as e:
        print(f"❌ Dependency fix failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()