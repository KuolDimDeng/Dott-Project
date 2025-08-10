#!/usr/bin/env python3
"""
Emergency script to apply tax jurisdiction migration
"""
import os
import sys
import django
from django.db import connection

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def check_and_add_columns():
    """Check if tax jurisdiction columns exist and add them if not"""
    
    with connection.cursor() as cursor:
        # Check if columns exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sales_pos_transaction' 
            AND column_name IN ('tax_jurisdiction', 'tax_calculation_method', 'shipping_address_used')
        """)
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"✅ Existing columns: {existing_columns}")
        
        # Add missing columns
        if 'tax_jurisdiction' not in existing_columns:
            print("📦 Adding tax_jurisdiction column...")
            cursor.execute("""
                ALTER TABLE sales_pos_transaction 
                ADD COLUMN tax_jurisdiction JSONB DEFAULT '{}' NOT NULL
            """)
            print("✅ tax_jurisdiction column added")
        
        if 'tax_calculation_method' not in existing_columns:
            print("📦 Adding tax_calculation_method column...")
            cursor.execute("""
                ALTER TABLE sales_pos_transaction 
                ADD COLUMN tax_calculation_method VARCHAR(20) DEFAULT 'origin' NOT NULL
            """)
            print("✅ tax_calculation_method column added")
        
        if 'shipping_address_used' not in existing_columns:
            print("📦 Adding shipping_address_used column...")
            cursor.execute("""
                ALTER TABLE sales_pos_transaction 
                ADD COLUMN shipping_address_used BOOLEAN DEFAULT false NOT NULL
            """)
            print("✅ shipping_address_used column added")
        
        # Mark migration as applied
        cursor.execute("""
            INSERT INTO django_migrations (app, name, applied)
            VALUES ('sales', '0011_add_tax_jurisdiction_fields', NOW())
            ON CONFLICT (app, name) DO NOTHING
        """)
        
        print("✨ Tax jurisdiction columns ready!")

if __name__ == "__main__":
    check_and_add_columns()