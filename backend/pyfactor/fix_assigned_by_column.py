#!/usr/bin/env python
"""Fix EmployeeGeofence assigned_by_id column type"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction

def fix_assigned_by_column():
    print("\n=== Fixing EmployeeGeofence assigned_by_id Column ===")
    
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Check current column type
                cursor.execute("""
                    SELECT data_type, udt_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public' 
                    AND table_name = 'hr_employeegeofence'
                    AND column_name = 'assigned_by_id';
                """)
                
                result = cursor.fetchone()
                if result:
                    print(f"Current column type: {result[0]} ({result[1]})")
                    
                    if result[1] == 'uuid':
                        print("\n⚠️  Column is UUID, needs to be changed to integer")
                        
                        # Drop ALL foreign key constraints on assigned_by_id
                        print("Dropping all foreign key constraints on assigned_by_id...")
                        cursor.execute("""
                            SELECT conname 
                            FROM pg_constraint 
                            WHERE conrelid = 'hr_employeegeofence'::regclass 
                            AND contype = 'f'
                            AND conkey @> ARRAY[(
                                SELECT attnum FROM pg_attribute 
                                WHERE attrelid = 'hr_employeegeofence'::regclass 
                                AND attname = 'assigned_by_id'
                            )];
                        """)
                        
                        constraints = cursor.fetchall()
                        for constraint in constraints:
                            print(f"  Dropping constraint: {constraint[0]}")
                            cursor.execute(f"ALTER TABLE hr_employeegeofence DROP CONSTRAINT IF EXISTS {constraint[0]};")
                        
                        # Also try dropping common constraint names
                        cursor.execute("""
                            ALTER TABLE hr_employeegeofence 
                            DROP CONSTRAINT IF EXISTS hr_employeegeofence_assigned_by_id_fkey;
                        """)
                        cursor.execute("""
                            ALTER TABLE hr_employeegeofence 
                            DROP CONSTRAINT IF EXISTS hr_employeegeofence_assigned_by_id_ebaa0001_fk_hr_employee_id;
                        """)
                        
                        # Change column type
                        print("Changing column type to integer...")
                        cursor.execute("""
                            ALTER TABLE hr_employeegeofence 
                            ALTER COLUMN assigned_by_id TYPE integer USING NULL;
                        """)
                        
                        # Re-add foreign key constraint
                        print("Re-adding foreign key constraint...")
                        cursor.execute("""
                            ALTER TABLE hr_employeegeofence 
                            ADD CONSTRAINT hr_employeegeofence_assigned_by_id_fkey 
                            FOREIGN KEY (assigned_by_id) 
                            REFERENCES custom_auth_user(id) 
                            ON DELETE SET NULL;
                        """)
                        
                        # Verify the change
                        cursor.execute("""
                            SELECT data_type, udt_name
                            FROM information_schema.columns
                            WHERE table_schema = 'public' 
                            AND table_name = 'hr_employeegeofence'
                            AND column_name = 'assigned_by_id';
                        """)
                        
                        new_result = cursor.fetchone()
                        if new_result and new_result[1] == 'int4':
                            print(f"\n✅ Successfully changed column type to: {new_result[0]} ({new_result[1]})")
                            
                            # Also fix timestamp defaults
                            print("\nAdding timestamp defaults...")
                            cursor.execute("""
                                ALTER TABLE hr_employeegeofence 
                                ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
                            """)
                            cursor.execute("""
                                ALTER TABLE hr_employeegeofence 
                                ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
                            """)
                            print("✅ Added timestamp defaults")
                        else:
                            print(f"\n❌ Column type change failed. Current type: {new_result}")
                    else:
                        print(f"\n✅ Column is already {result[0]}, no change needed")
                else:
                    print("\n❌ assigned_by_id column not found!")
                    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_assigned_by_column()