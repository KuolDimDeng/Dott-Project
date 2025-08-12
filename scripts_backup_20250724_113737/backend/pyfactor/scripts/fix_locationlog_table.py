#!/usr/bin/env python
"""
Fix missing hr_locationlog table by creating it directly
This is a production-safe script that only creates the missing table
"""

import os
import sys
import django
from django.db import connection, transaction

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

def create_locationlog_table():
    """Create the hr_locationlog table directly"""
    print("🔧 Creating hr_locationlog table...")
    
    # First check if it already exists
    if table_exists('hr_locationlog'):
        print("✅ hr_locationlog table already exists!")
        return True
    
    # SQL to create the table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS hr_locationlog (
        tenant_id UUID,
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID,
        location_type VARCHAR(15) NOT NULL,
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
        timesheet_entry_id UUID,
        CONSTRAINT location_type_check CHECK (location_type IN ('CLOCK_IN', 'CLOCK_OUT', 'RANDOM_CHECK', 'BREAK_START', 'BREAK_END'))
    );
    """
    
    # Create indexes
    create_indexes_sql = [
        "CREATE INDEX IF NOT EXISTS hr_location_employe_8e7e91_idx ON hr_locationlog (employee_id, logged_at);",
        "CREATE INDEX IF NOT EXISTS hr_location_busines_e9e814_idx ON hr_locationlog (business_id, location_type, logged_at);",
        "CREATE INDEX IF NOT EXISTS idx_hr_locationlog_tenant_id ON hr_locationlog (tenant_id);",
    ]
    
    # Add foreign key constraints (only if the referenced tables exist)
    foreign_keys_sql = []
    
    if table_exists('hr_employee'):
        foreign_keys_sql.append("""
            ALTER TABLE hr_locationlog 
            ADD CONSTRAINT hr_locationlog_employee_fk 
            FOREIGN KEY (employee_id) 
            REFERENCES hr_employee(id) 
            ON DELETE CASCADE;
        """)
    
    if table_exists('hr_timesheetentry'):
        foreign_keys_sql.append("""
            ALTER TABLE hr_locationlog 
            ADD CONSTRAINT hr_locationlog_timesheet_entry_fk 
            FOREIGN KEY (timesheet_entry_id) 
            REFERENCES hr_timesheetentry(id) 
            ON DELETE SET NULL;
        """)
    
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Create the table
                cursor.execute(create_table_sql)
                print("✅ Table created successfully")
                
                # Create indexes
                for index_sql in create_indexes_sql:
                    cursor.execute(index_sql)
                print("✅ Indexes created successfully")
                
                # Add foreign keys if possible
                for fk_sql in foreign_keys_sql:
                    try:
                        cursor.execute(fk_sql)
                        print("✅ Foreign key constraint added")
                    except Exception as e:
                        print(f"⚠️  Could not add foreign key: {str(e)}")
                
        print("\n✅ hr_locationlog table has been created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating table: {str(e)}")
        return False

def check_related_tables():
    """Check the status of related tables"""
    print("\n📋 Checking related tables:")
    tables = ['hr_employee', 'hr_timesheetentry', 'custom_auth_tenant', 'custom_auth_user']
    
    for table in tables:
        exists = table_exists(table)
        status = "✅ EXISTS" if exists else "❌ MISSING"
        print(f"  {table}: {status}")

def main():
    print("🚀 Starting LocationLog table fix...")
    
    # Check related tables first
    check_related_tables()
    
    # Create the LocationLog table
    success = create_locationlog_table()
    
    if success:
        print("\n✅ SUCCESS: hr_locationlog table is ready for use!")
        print("   You can now delete employees without errors.")
    else:
        print("\n❌ FAILED: Could not create hr_locationlog table.")
        print("   Please check the error messages above.")

if __name__ == "__main__":
    main()