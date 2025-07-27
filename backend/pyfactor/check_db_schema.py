#!/usr/bin/env python
"""Check database schema for EmployeeGeofence table"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def check_schema():
    print("\n=== Checking EmployeeGeofence Table Schema ===")
    
    with connection.cursor() as cursor:
        # Check column information
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'hr_employeegeofence'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        if columns:
            print("\nColumns in hr_employeegeofence table:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]} (nullable: {col[2]}, default: {col[3]})")
        else:
            print("\n❌ Table hr_employeegeofence not found!")
            
        # Check if assigned_by_id column exists and its type
        cursor.execute("""
            SELECT data_type, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'hr_employeegeofence'
            AND column_name = 'assigned_by_id';
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"\n✅ assigned_by_id column exists: {result[0]} ({result[1]})")
        else:
            print("\n❌ assigned_by_id column NOT FOUND!")

if __name__ == "__main__":
    check_schema()