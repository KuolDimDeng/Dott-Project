#!/usr/bin/env python
"""
Check BusinessSettings table structure
"""
import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def check_table():
    print("=== Checking BusinessSettings Table ===")
    
    with connection.cursor() as cursor:
        # Check if table exists
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE '%business%settings%'
        """)
        
        tables = cursor.fetchall()
        print(f"\nFound tables with 'business' and 'settings':")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Check structure of users_business_settings if it exists
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users_business_settings'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        if columns:
            print(f"\nColumns in users_business_settings:")
            for col_name, col_type in columns:
                print(f"  - {col_name}: {col_type}")
        else:
            print("\nTable users_business_settings not found!")
        
        # Check if Business model has currency fields
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users_business' 
                AND column_name LIKE '%currency%'
            ORDER BY ordinal_position
        """)
        
        currency_cols = cursor.fetchall()
        if currency_cols:
            print(f"\nCurrency columns in users_business:")
            for col_name, col_type in currency_cols:
                print(f"  - {col_name}: {col_type}")
        
        # Check if BusinessDetails has currency fields
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users_businessdetails' 
                AND column_name LIKE '%currency%'
            ORDER BY ordinal_position
        """)
        
        details_cols = cursor.fetchall()
        if details_cols:
            print(f"\nCurrency columns in users_businessdetails:")
            for col_name, col_type in details_cols:
                print(f"  - {col_name}: {col_type}")

if __name__ == "__main__":
    check_table()