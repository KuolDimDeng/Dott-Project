#!/usr/bin/env python
"""
Production-safe script to fix missing hr_locationlog table
This script can be run on production without affecting existing data
"""

import os
import sys
import django
from django.db import connection, transaction as db_transaction
from django.core.management import call_command

# Add the parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def table_exists(table_name):
    """Check if a table exists in the database"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = %s
            );
        """, [table_name])
        return cursor.fetchone()[0]

def create_locationlog_table_safe():
    """Safely create hr_locationlog table for production"""
    print("🚀 Production Fix for hr_locationlog table")
    print("=" * 50)
    
    # Check if table already exists
    if table_exists('hr_locationlog'):
        print("✅ hr_locationlog table already exists - no action needed")
        return True
    
    print("⚠️  hr_locationlog table is missing - creating it now...")
    
    # Use the migration system if possible
    try:
        print("Attempting to run hr.0014_add_location_tracking migration...")
        call_command('migrate', 'hr', '0014_add_location_tracking', verbosity=2)
        print("✅ Migration completed successfully!")
        return True
    except Exception as e:
        print(f"⚠️  Migration failed: {str(e)}")
        print("Falling back to direct SQL creation...")
    
    # If migration fails, create table directly
    create_sql = """
    CREATE TABLE IF NOT EXISTS hr_locationlog (
        tenant_id UUID,
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID,
        location_type VARCHAR(15) NOT NULL CHECK (location_type IN ('CLOCK_IN', 'CLOCK_OUT', 'RANDOM_CHECK', 'BREAK_START', 'BREAK_END')),
        latitude DECIMAL(9,6),
        longitude DECIMAL(9,6),
        accuracy DECIMAL(10,2),
        street_address VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(50),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        formatted_address TEXT,
        device_type VARCHAR(50),
        device_id VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        is_verified BOOLEAN DEFAULT TRUE,
        verification_method VARCHAR(50),
        logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        employee_id UUID NOT NULL,
        timesheet_entry_id UUID
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS hr_location_employe_8e7e91_idx ON hr_locationlog (employee_id, logged_at);
    CREATE INDEX IF NOT EXISTS hr_location_busines_e9e814_idx ON hr_locationlog (business_id, location_type, logged_at);
    CREATE INDEX IF NOT EXISTS idx_hr_locationlog_tenant_id ON hr_locationlog (tenant_id);
    """
    
    try:
        with db_transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(create_sql)
                print("✅ Table and indexes created successfully!")
                
                # Mark migration as applied if we created the table manually
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied)
                    VALUES ('hr', '0014_add_location_tracking', CURRENT_TIMESTAMP)
                    ON CONFLICT (app, name) DO NOTHING;
                """)
                print("✅ Migration marked as applied")
                
        return True
    except Exception as e:
        print(f"❌ Error creating table: {str(e)}")
        return False

def main():
    """Main execution function"""
    success = create_locationlog_table_safe()
    
    if success:
        print("\n" + "=" * 50)
        print("✅ SUCCESS: hr_locationlog table is ready!")
        print("   Employee deletion should now work without errors.")
        print("=" * 50)
    else:
        print("\n" + "=" * 50)
        print("❌ FAILED: Could not create hr_locationlog table")
        print("   Please contact DevOps for assistance.")
        print("=" * 50)
        sys.exit(1)

if __name__ == "__main__":
    main()