#!/usr/bin/env python3
"""
Production Migration Hotfix
============================

Simple script to mark transport migrations as applied when tables exist.
This addresses the specific issue where transport tables exist but migrations
aren't recorded in django_migrations table.

Usage: python manage.py shell -c "exec(open('scripts/production_migration_hotfix.py').read())"
"""

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

def hotfix_transport_migrations():
    """Fix transport migration status in production"""
    print("🔧 TRANSPORT MIGRATION HOTFIX")
    
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
    print(f"Applied migrations: {applied_migrations}")
    
    # Migrations to ensure are marked as applied
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
        
        print("✅ Transport migration hotfix completed")
    else:
        print("❌ No transport tables found - migrations need to run normally")

def hotfix_custom_auth_migrations():
    """Fix custom_auth migration status in production"""
    print("\n🔧 CUSTOM_AUTH MIGRATION HOTFIX")
    
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

# Run the hotfix
try:
    print("🚀 === PRODUCTION MIGRATION HOTFIX ===")
    hotfix_custom_auth_migrations()
    hotfix_transport_migrations()
    print("\n✅ === HOTFIX COMPLETED ===")
    print("Run 'python manage.py migrate' to proceed with normal migrations")
except Exception as e:
    print(f"❌ Hotfix failed: {e}")
    import traceback
    traceback.print_exc()