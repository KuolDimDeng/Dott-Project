#!/usr/bin/env python
"""
Direct script to fix currency columns in POS transactions table.
This script directly adds the missing columns without relying on Django migrations.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def fix_currency_columns():
    """Add currency columns if they don't exist"""
    print("=== Fixing Currency Columns in POS Transactions ===")
    
    try:
        with connection.cursor() as cursor:
            # Check if columns exist
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'sales_pos_transaction' 
                AND column_name IN ('currency_code', 'currency_symbol')
            """)
            existing_columns = [row[0] for row in cursor.fetchall()]
            print(f"Existing columns: {existing_columns}")
            
            # Add currency_code if missing
            if 'currency_code' not in existing_columns:
                print("Adding currency_code column...")
                cursor.execute("""
                    ALTER TABLE sales_pos_transaction 
                    ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD'
                """)
                print("✅ Added currency_code column")
            else:
                print("✅ currency_code column already exists")
            
            # Add currency_symbol if missing  
            if 'currency_symbol' not in existing_columns:
                print("Adding currency_symbol column...")
                cursor.execute("""
                    ALTER TABLE sales_pos_transaction 
                    ADD COLUMN currency_symbol VARCHAR(10) DEFAULT '$'
                """)
                print("✅ Added currency_symbol column")
            else:
                print("✅ currency_symbol column already exists")
            
            # Verify columns were added
            cursor.execute("""
                SELECT column_name, data_type, character_maximum_length, column_default
                FROM information_schema.columns 
                WHERE table_name = 'sales_pos_transaction' 
                AND column_name IN ('currency_code', 'currency_symbol')
                ORDER BY column_name
            """)
            
            print("\n=== Column Details ===")
            for row in cursor.fetchall():
                print(f"Column: {row[0]}, Type: {row[1]}({row[2]}), Default: {row[3]}")
            
            print("\n✅ Currency columns successfully verified")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = fix_currency_columns()
    sys.exit(0 if success else 1)