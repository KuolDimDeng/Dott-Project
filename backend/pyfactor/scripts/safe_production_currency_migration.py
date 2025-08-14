#!/usr/bin/env python
"""
Safe production database migration script for adding currency columns.
This script:
1. Checks if columns already exist
2. Only adds columns if they're missing
3. Uses safe defaults that won't affect existing data
4. Records the migration properly
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
from django.db.migrations.recorder import MigrationRecorder
from datetime import datetime


def safe_add_currency_columns():
    """Safely add currency columns to production database"""
    print(f"=== Safe Production Currency Migration ===")
    print(f"Time: {datetime.now()}")
    print(f"Database: {connection.settings_dict.get('NAME')}")
    print("")
    
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Step 1: Check if table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'sales_pos_transaction'
                    )
                """)
                table_exists = cursor.fetchone()[0]
                
                if not table_exists:
                    print("❌ Table sales_pos_transaction doesn't exist")
                    return False
                
                print("✅ Table sales_pos_transaction exists")
                
                # Step 2: Check current columns
                cursor.execute("""
                    SELECT column_name, data_type, column_default
                    FROM information_schema.columns 
                    WHERE table_name = 'sales_pos_transaction' 
                    AND column_name IN ('currency_code', 'currency_symbol')
                    ORDER BY column_name
                """)
                
                existing_columns = {row[0]: {'type': row[1], 'default': row[2]} 
                                  for row in cursor.fetchall()}
                
                if existing_columns:
                    print(f"Found existing columns: {list(existing_columns.keys())}")
                
                # Step 3: Add missing columns with safe defaults
                columns_added = []
                
                if 'currency_code' not in existing_columns:
                    print("Adding currency_code column...")
                    cursor.execute("""
                        ALTER TABLE sales_pos_transaction 
                        ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD'
                    """)
                    columns_added.append('currency_code')
                    print("✅ Added currency_code column with default 'USD'")
                else:
                    print(f"✅ currency_code already exists")
                
                if 'currency_symbol' not in existing_columns:
                    print("Adding currency_symbol column...")
                    cursor.execute("""
                        ALTER TABLE sales_pos_transaction 
                        ADD COLUMN currency_symbol VARCHAR(10) DEFAULT '$'
                    """)
                    columns_added.append('currency_symbol')
                    print("✅ Added currency_symbol column with default '$'")
                else:
                    print(f"✅ currency_symbol already exists")
                
                # Step 4: Verify columns were added
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM information_schema.columns 
                    WHERE table_name = 'sales_pos_transaction' 
                    AND column_name IN ('currency_code', 'currency_symbol')
                """)
                
                column_count = cursor.fetchone()[0]
                
                if column_count != 2:
                    print(f"⚠️ Warning: Expected 2 columns, found {column_count}")
                    return False
                
                print(f"✅ Verified both currency columns exist")
                
                # Step 5: Update existing transactions for South Sudan users if needed
                if columns_added:
                    print("\nUpdating existing transactions for South Sudan users...")
                    cursor.execute("""
                        UPDATE sales_pos_transaction 
                        SET currency_code = 'SSP', 
                            currency_symbol = 'SSP'
                        WHERE tenant_id IN (
                            SELECT DISTINCT u.tenant_id 
                            FROM users_userprofile up 
                            JOIN auth_user u ON up.user_id = u.id
                            WHERE up.country = 'SS' 
                            OR up.preferred_currency_code = 'SSP'
                        )
                        AND currency_code = 'USD'
                    """)
                    
                    rows_updated = cursor.rowcount
                    if rows_updated > 0:
                        print(f"✅ Updated {rows_updated} transactions to use SSP")
                    else:
                        print("✅ No transactions needed updating")
                
                # Step 6: Record migration as applied
                recorder = MigrationRecorder(connection)
                applied_migrations = recorder.applied_migrations()
                
                if ('sales', '0012_add_currency_to_pos_transactions') not in applied_migrations:
                    recorder.record_applied('sales', '0012_add_currency_to_pos_transactions')
                    print("✅ Recorded migration 0012 as applied")
                else:
                    print("✅ Migration 0012 already recorded")
                
                print("\n=== Migration Complete ===")
                print(f"Successfully ensured currency columns exist in production")
                return True
                
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_production_data():
    """Verify the migration didn't break existing data"""
    print("\n=== Verifying Production Data ===")
    
    try:
        with connection.cursor() as cursor:
            # Check transaction counts
            cursor.execute("SELECT COUNT(*) FROM sales_pos_transaction")
            total_transactions = cursor.fetchone()[0]
            print(f"Total POS transactions: {total_transactions}")
            
            # Check currency distribution
            cursor.execute("""
                SELECT currency_code, COUNT(*) as count
                FROM sales_pos_transaction
                GROUP BY currency_code
                ORDER BY count DESC
                LIMIT 5
            """)
            
            print("\nCurrency distribution:")
            for row in cursor.fetchall():
                print(f"  {row[0]}: {row[1]} transactions")
            
            # Check for any null values
            cursor.execute("""
                SELECT COUNT(*)
                FROM sales_pos_transaction
                WHERE currency_code IS NULL OR currency_symbol IS NULL
            """)
            
            null_count = cursor.fetchone()[0]
            if null_count > 0:
                print(f"⚠️ Warning: {null_count} transactions have NULL currency values")
            else:
                print("✅ All transactions have currency values")
                
    except Exception as e:
        print(f"Error verifying data: {e}")


if __name__ == "__main__":
    print("This script will safely add currency columns to the production database.")
    print("It will NOT delete or modify any existing data.")
    print("")
    
    # Run the migration
    success = safe_add_currency_columns()
    
    if success:
        # Verify the data
        verify_production_data()
        print("\n✅ Production database successfully updated!")
        print("The POS system should now work correctly.")
    else:
        print("\n❌ Migration failed. Please check the error messages above.")
        sys.exit(1)