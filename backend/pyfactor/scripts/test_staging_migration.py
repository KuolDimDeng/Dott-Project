#!/usr/bin/env python3
"""
Test Staging Migration Issues
=============================

This script tests the exact migration issues occurring in staging
and validates our fixes work correctly.
"""

import os
import sys
from django.db import connection, transaction
from django.core.management import call_command
from django.db.migrations.executor import MigrationExecutor
from django.db.migrations.recorder import MigrationRecorder

def reset_database():
    """Reset database to clean state"""
    print("🔄 Resetting database to clean state...")
    
    with connection.cursor() as cursor:
        # Drop all tables to simulate fresh database
        cursor.execute("""
            DROP SCHEMA public CASCADE;
            CREATE SCHEMA public;
            GRANT ALL ON SCHEMA public TO postgres;
            GRANT ALL ON SCHEMA public TO public;
        """)
    
    print("✅ Database reset complete")

def test_migrations_step_by_step():
    """Test migrations step by step to identify issues"""
    print("\n🧪 Testing migrations step by step...")
    
    try:
        # Step 1: Run basic Django migrations first
        print("\n1. Running core Django migrations...")
        call_command('migrate', 'auth', verbosity=1)
        call_command('migrate', 'contenttypes', verbosity=1)
        
        # Step 2: Try custom_auth migration
        print("\n2. Running custom_auth migrations...")
        call_command('migrate', 'custom_auth', verbosity=2)
        
        # Step 3: Check if tables were created
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_name IN ('custom_auth_tenant', 'custom_auth_user')
            """)
            tables = [row[0] for row in cursor.fetchall()]
            print(f"Custom auth tables created: {tables}")
        
        # Step 4: Try transport migrations
        print("\n3. Running transport migrations...")
        call_command('migrate', 'transport', verbosity=2)
        
        print("\n✅ All test migrations completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Migration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_hotfix_script():
    """Test our hotfix script works"""
    print("\n🔧 Testing hotfix script...")
    
    # Import and run the hotfix
    exec(open('/app/scripts/production_migration_hotfix.py').read())
    
    # Verify it worked
    recorder = MigrationRecorder(connection)
    transport_migrations = list(recorder.migration_qs.filter(app='transport').values_list('name', flat=True))
    print(f"Transport migrations after hotfix: {transport_migrations}")
    
    return len(transport_migrations) >= 4

def main():
    """Main test function"""
    print("🚀 === STAGING MIGRATION TEST ===")
    
    try:
        # Test 1: Reset and try clean migration
        reset_database()
        success = test_migrations_step_by_step()
        
        if not success:
            print("\n🔧 Clean migration failed, testing hotfix...")
            # If migrations fail, test our hotfix
            test_hotfix_script()
        
        print("\n✅ === STAGING MIGRATION TEST COMPLETED ===")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()