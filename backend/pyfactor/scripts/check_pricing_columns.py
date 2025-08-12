#!/usr/bin/env python3
"""
Check if pricing model columns exist in the inventory_product table
"""

import os
import sys
import django
from django.db import connection

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def check_pricing_columns():
    """Check if pricing model columns exist in database"""
    with connection.cursor() as cursor:
        # Get columns for inventory_product table
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'inventory_product' 
            AND column_name IN ('pricing_model', 'weight', 'weight_unit', 'daily_rate', 'entry_date')
            ORDER BY column_name;
        """)
        
        columns = cursor.fetchall()
        
        print("Checking pricing model columns in inventory_product table:")
        print("-" * 60)
        
        expected_columns = {
            'pricing_model': 'character varying',
            'weight': 'numeric',
            'weight_unit': 'character varying',
            'daily_rate': 'numeric',
            'entry_date': 'timestamp with time zone'
        }
        
        found_columns = {col[0]: col[1] for col in columns}
        
        for col_name, expected_type in expected_columns.items():
            if col_name in found_columns:
                print(f"✅ {col_name}: {found_columns[col_name]}")
            else:
                print(f"❌ {col_name}: NOT FOUND (expected {expected_type})")
        
        print("-" * 60)
        
        # Check if BusinessSettings table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users_business_settings'
            );
        """)
        
        business_settings_exists = cursor.fetchone()[0]
        
        if business_settings_exists:
            print("✅ BusinessSettings table exists")
            
            # Check columns
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users_business_settings' 
                AND column_name IN ('default_pricing_model', 'default_daily_rate', 'default_weight_unit')
                ORDER BY column_name;
            """)
            
            bs_columns = cursor.fetchall()
            print("\nBusinessSettings columns:")
            for col_name, col_type in bs_columns:
                print(f"  - {col_name}: {col_type}")
        else:
            print("❌ BusinessSettings table NOT FOUND")
        
        # Check pending migrations
        print("\nChecking for pending migrations...")
        os.system("python manage.py showmigrations inventory | grep -E '\[ \]|\[X\]' | tail -5")
        os.system("python manage.py showmigrations users | grep -E '\[ \]|\[X\]' | tail -5")

if __name__ == "__main__":
    check_pricing_columns()