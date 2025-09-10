#!/usr/bin/env python3
"""
Test Staging Transport Scenario Replication
============================================

This script replicates the exact staging scenario where:
1. Transport tables exist with UUID foreign keys
2. Transport migrations 0001-0003 are marked as applied
3. Transport migration 0004 is NOT marked as applied
4. This causes the deployment to fail

Usage:
    python manage.py shell < scripts/test_staging_transport_scenario.py

Or from Docker:
    docker-compose run --rm backend python manage.py shell < scripts/test_staging_transport_scenario.py
"""

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

def setup_staging_scenario():
    """Set up the exact staging scenario that's failing"""
    print("🔧 === REPLICATING STAGING TRANSPORT SCENARIO ===")
    
    with connection.cursor() as cursor:
        
        # First, ensure basic Django migrations table exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS django_migrations (
                id SERIAL PRIMARY KEY,
                app VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                applied TIMESTAMP WITH TIME ZONE NOT NULL
            );
        """)
        
        # Create transport tables with UUID foreign keys (like in staging)
        print("🏗️  Creating transport tables with UUID foreign keys...")
        
        # Create transport_driver table with UUID user_id
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transport_driver (
                id SERIAL PRIMARY KEY,
                user_id UUID,
                license_number VARCHAR(100),
                vehicle_type VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        
        # Create transport_expense table with UUID created_by_id
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transport_expense (
                id SERIAL PRIMARY KEY,
                created_by_id UUID,
                description TEXT,
                amount DECIMAL(10, 2),
                date DATE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        
        # Create transport_equipment table (this exists in staging)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transport_equipment (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                type VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        
        print("✅ Transport tables created with UUID foreign keys")
        
        # Mark migrations 0001-0003 as applied (like in staging)
        recorder = MigrationRecorder(connection)
        
        transport_migrations = [
            '0001_ensure_base_tables',
            '0002_initial',
            '0003_add_transport_models'
        ]
        
        for migration_name in transport_migrations:
            try:
                recorder.record_applied('transport', migration_name)
                print(f"✅ Marked transport.{migration_name} as applied")
            except Exception as e:
                print(f"⚠️  Could not mark {migration_name}: {e}")
        
        # Verify the scenario
        print("\n🔍 === VERIFICATION ===")
        
        # Check which transport migrations are marked as applied
        applied_migrations = set(recorder.migration_qs.filter(app='transport').values_list('name', flat=True))
        print(f"Applied transport migrations: {sorted(applied_migrations)}")
        
        # Check if 0004 is missing (this should be the case)
        if '0004_fix_user_foreign_key_types' not in applied_migrations:
            print("✅ Confirmed: transport.0004_fix_user_foreign_key_types is NOT applied")
        else:
            print("❌ Unexpected: transport.0004_fix_user_foreign_key_types is already applied")
        
        # Check table column types
        for table_name, column_name in [
            ('transport_driver', 'user_id'),
            ('transport_expense', 'created_by_id')
        ]:
            cursor.execute("""
                SELECT data_type FROM information_schema.columns 
                WHERE table_name = %s AND column_name = %s
            """, [table_name, column_name])
            result = cursor.fetchone()
            if result:
                print(f"🔍 {table_name}.{column_name} type: {result[0]}")
            else:
                print(f"❌ {table_name}.{column_name} not found")
        
        print("\n🎯 === STAGING SCENARIO READY ===")
        print("This matches the exact state causing staging deployment failures:")
        print("- ✅ transport_driver and transport_expense tables exist with UUID foreign keys")
        print("- ✅ Transport migrations 0001-0003 are marked as applied")  
        print("- ✅ Transport migration 0004 is NOT marked as applied")
        print("- ✅ Ready to test our enhanced defensive migration!")

def main():
    """Main function"""
    try:
        setup_staging_scenario()
        print("\n✅ === STAGING SCENARIO SETUP COMPLETED ===")
        print("Now run: python manage.py migrate transport 0004 --verbosity=2")
        print("This will test our enhanced defensive migration!")
        
    except Exception as e:
        print(f"❌ Staging scenario setup failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()