#!/usr/bin/env python
"""
Fix transport migrations for staging deployment.
This script handles the case where transport app was never properly initialized.
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from django.core.management import call_command

def fix_transport_migrations():
    """Fix transport migration issues on staging"""
    
    print("=== Transport Migration Fix Script ===")
    print("Checking current database state...")
    
    with connection.cursor() as cursor:
        # Check if transport tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'transport_%'
            ORDER BY table_name;
        """)
        existing_tables = [row[0] for row in cursor.fetchall()]
        
        print(f"Found {len(existing_tables)} existing transport tables: {existing_tables}")
        
        # Check migration history
        cursor.execute("""
            SELECT name 
            FROM django_migrations 
            WHERE app = 'transport'
            ORDER BY id;
        """)
        applied_migrations = [row[0] for row in cursor.fetchall()]
        
        print(f"Applied transport migrations: {applied_migrations}")
        
        # If no migrations are applied, we need to fake the initial ones
        if not applied_migrations:
            print("\nNo transport migrations applied. Setting up from scratch...")
            
            # First, create the base tables if they don't exist
            print("Creating base transport tables...")
            
            with transaction.atomic():
                # Create Equipment table
                if 'transport_equipment' not in existing_tables:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS transport_equipment (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            tenant_id UUID,
                            name VARCHAR(255) NOT NULL,
                            equipment_type VARCHAR(100) NOT NULL,
                            make VARCHAR(100),
                            model VARCHAR(100),
                            year INTEGER,
                            vin VARCHAR(100),
                            license_plate VARCHAR(50),
                            status VARCHAR(50) NOT NULL DEFAULT 'active',
                            purchase_date DATE,
                            purchase_price DECIMAL(10,2),
                            current_value DECIMAL(10,2),
                            notes TEXT,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        );
                    """)
                    print("✅ Created transport_equipment table")
                
                # Create Driver table
                if 'transport_driver' not in existing_tables:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS transport_driver (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            user_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
                            first_name VARCHAR(255) NOT NULL,
                            last_name VARCHAR(255) NOT NULL,
                            email VARCHAR(254),
                            phone VARCHAR(20),
                            license_number VARCHAR(100) NOT NULL,
                            license_state VARCHAR(100) NOT NULL,
                            license_expiration DATE NOT NULL,
                            status VARCHAR(50) NOT NULL DEFAULT 'active',
                            hire_date DATE,
                            notes TEXT,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        );
                    """)
                    print("✅ Created transport_driver table")
                
                # Create Route table
                if 'transport_route' not in existing_tables:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS transport_route (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            name VARCHAR(255) NOT NULL,
                            start_location VARCHAR(255) NOT NULL,
                            end_location VARCHAR(255) NOT NULL,
                            distance DECIMAL(10,2) NOT NULL,
                            estimated_time INTERVAL NOT NULL,
                            notes TEXT,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        );
                    """)
                    print("✅ Created transport_route table")
                
                # Create Load table
                if 'transport_load' not in existing_tables:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS transport_load (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            reference_number VARCHAR(100) UNIQUE NOT NULL,
                            customer_id UUID NOT NULL REFERENCES crm_customer(id) ON DELETE CASCADE,
                            route_id UUID REFERENCES transport_route(id) ON DELETE SET NULL,
                            driver_id UUID REFERENCES transport_driver(id) ON DELETE SET NULL,
                            equipment_id UUID REFERENCES transport_equipment(id) ON DELETE SET NULL,
                            trip_id UUID,
                            status VARCHAR(50) NOT NULL DEFAULT 'pending',
                            pickup_date TIMESTAMPTZ NOT NULL,
                            delivery_date TIMESTAMPTZ NOT NULL,
                            pickup_location VARCHAR(255) NOT NULL,
                            delivery_location VARCHAR(255) NOT NULL,
                            cargo_description TEXT NOT NULL,
                            weight DECIMAL(10,2) NOT NULL,
                            volume DECIMAL(10,2),
                            value DECIMAL(10,2),
                            rate DECIMAL(10,2) NOT NULL,
                            notes TEXT,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        );
                    """)
                    print("✅ Created transport_load table")
                
                # Create Expense table
                if 'transport_expense' not in existing_tables:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS transport_expense (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            load_id UUID REFERENCES transport_load(id) ON DELETE CASCADE,
                            equipment_id UUID REFERENCES transport_equipment(id) ON DELETE CASCADE,
                            created_by_id UUID REFERENCES custom_auth_user(id) ON DELETE SET NULL,
                            expense_type VARCHAR(100) NOT NULL,
                            amount DECIMAL(10,2) NOT NULL,
                            date DATE NOT NULL,
                            description TEXT,
                            receipt VARCHAR(100),
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        );
                    """)
                    print("✅ Created transport_expense table")
                
                # Create Maintenance table
                if 'transport_maintenance' not in existing_tables:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS transport_maintenance (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            equipment_id UUID NOT NULL REFERENCES transport_equipment(id) ON DELETE CASCADE,
                            maintenance_type VARCHAR(100) NOT NULL,
                            description TEXT NOT NULL,
                            date_performed DATE NOT NULL,
                            odometer_reading INTEGER,
                            cost DECIMAL(10,2) NOT NULL,
                            performed_by VARCHAR(255),
                            notes TEXT,
                            next_maintenance_date DATE,
                            next_maintenance_odometer INTEGER,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        );
                    """)
                    print("✅ Created transport_maintenance table")
                
                # Create Compliance table
                if 'transport_compliance' not in existing_tables:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS transport_compliance (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            equipment_id UUID REFERENCES transport_equipment(id) ON DELETE CASCADE,
                            driver_id UUID REFERENCES transport_driver(id) ON DELETE CASCADE,
                            document_type VARCHAR(100) NOT NULL,
                            document_number VARCHAR(100),
                            issue_date DATE NOT NULL,
                            expiration_date DATE NOT NULL,
                            issuing_authority VARCHAR(255),
                            document_file VARCHAR(100),
                            notes TEXT,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        );
                    """)
                    print("✅ Created transport_compliance table")
                
                print("\nFaking initial migrations...")
                # Fake the first two migrations
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied)
                    VALUES 
                        ('transport', '0001_ensure_base_tables', NOW()),
                        ('transport', '0002_initial', NOW())
                    ON CONFLICT DO NOTHING;
                """)
                
                print("✅ Marked 0001_ensure_base_tables and 0002_initial as applied")
        
        # Now run the remaining migration
        print("\nRunning transport migrations...")
        try:
            call_command('migrate', 'transport', verbosity=2)
            print("✅ Transport migrations completed successfully!")
        except Exception as e:
            print(f"❌ Error running migrations: {e}")
            
            # Try to apply 0003 manually if needed
            if '0003_add_transport_models' not in applied_migrations:
                print("\nAttempting to apply 0003_add_transport_models manually...")
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied)
                    VALUES ('transport', '0003_add_transport_models', NOW())
                    ON CONFLICT DO NOTHING;
                """)
                print("✅ Marked 0003_add_transport_models as applied")

if __name__ == '__main__':
    fix_transport_migrations()