#!/usr/bin/env python
import os
import sys
import django

# Add the project to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction as db_transaction

def fix_inventory_service_tenant_id():
    """Add tenant_id column to inventory_service table if missing"""
    
    with connection.cursor() as cursor:
        # Check if tenant_id column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'inventory_service' 
            AND column_name = 'tenant_id';
        """)
        
        result = cursor.fetchone()
        
        if result:
            print("✅ tenant_id column already exists in inventory_service table")
            
            # Check data type
            cursor.execute("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_service' 
                AND column_name = 'tenant_id';
            """)
            data_type = cursor.fetchone()[0]
            print(f"   Data type: {data_type}")
            
        else:
            print("⚠️  tenant_id column is missing from inventory_service table")
            print("Adding tenant_id column...")
            
            try:
                with db_transaction.atomic():
                    # Add the tenant_id column
                    cursor.execute("""
                        ALTER TABLE inventory_service 
                        ADD COLUMN tenant_id UUID;
                    """)
                    print("✅ Successfully added tenant_id column")
                    
                    # Add index for performance
                    cursor.execute("""
                        CREATE INDEX IF NOT EXISTS idx_inventory_service_tenant_id 
                        ON inventory_service(tenant_id);
                    """)
                    print("✅ Successfully added index on tenant_id")
                    
                    # Check if we should add NOT NULL constraint
                    cursor.execute("SELECT COUNT(*) FROM inventory_service;")
                    count = cursor.fetchone()[0]
                    
                    if count == 0:
                        # No data, we can add NOT NULL constraint
                        cursor.execute("""
                            ALTER TABLE inventory_service 
                            ALTER COLUMN tenant_id SET NOT NULL;
                        """)
                        print("✅ Added NOT NULL constraint to tenant_id")
                    else:
                        print(f"⚠️  Table has {count} existing records. NOT NULL constraint not added.")
                        print("   You may need to update existing records with tenant_id values first.")
                    
            except Exception as e:
                print(f"❌ Error adding tenant_id column: {e}")
                return
        
        # Check for foreign key constraint
        cursor.execute("""
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'inventory_service' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%tenant_id%';
        """)
        
        fk_result = cursor.fetchone()
        
        if not fk_result:
            print("\n⚠️  No foreign key constraint found for tenant_id")
            print("Consider adding a foreign key constraint to custom_auth_tenant(id)")
        else:
            print(f"\n✅ Foreign key constraint exists: {fk_result[0]}")
        
        # Display final table structure
        print("\n📋 Final inventory_service table structure:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'inventory_service'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print("-" * 60)
        print(f"{'Column':<25} {'Type':<20} {'Nullable':<10}")
        print("-" * 60)
        for col in columns:
            print(f"{col[0]:<25} {col[1]:<20} {col[2]:<10}")

if __name__ == '__main__':
    fix_inventory_service_tenant_id()