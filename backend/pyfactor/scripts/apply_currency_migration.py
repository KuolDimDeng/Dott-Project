#!/usr/bin/env python
"""
Apply currency fields migration to POS transactions
This ensures the migration is applied even if Django's migration system has issues
"""
import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, migrations
from django.db.migrations.recorder import MigrationRecorder

def apply_migration():
    """Apply the currency migration following Django standards"""
    print("=== Checking currency fields migration status ===")
    
    try:
        # First check if migration is already recorded as applied
        recorder = MigrationRecorder(connection)
        applied_migrations = recorder.applied_migrations()
        
        if ('sales', '0012_add_currency_to_pos_transactions') in applied_migrations:
            print("✅ Migration 0012_add_currency_to_pos_transactions already applied")
            return
        
        # Check if columns exist in database
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'sales_pos_transaction' 
                AND column_name IN ('currency_code', 'currency_symbol')
            """)
            existing_columns = [row[0] for row in cursor.fetchall()]
            
            if 'currency_code' in existing_columns and 'currency_symbol' in existing_columns:
                print("✅ Currency columns already exist in database")
                # Record the migration as applied
                recorder.record_applied('sales', '0012_add_currency_to_pos_transactions')
                print("✅ Recorded migration as applied")
                return
            
            print("⚠️ Currency columns missing, applying migration...")
            
            # Apply the columns using raw SQL (same as migration would do)
            if 'currency_code' not in existing_columns:
                cursor.execute("""
                    ALTER TABLE sales_pos_transaction 
                    ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD'
                """)
                print("✅ Added currency_code column")
            
            if 'currency_symbol' not in existing_columns:
                cursor.execute("""
                    ALTER TABLE sales_pos_transaction 
                    ADD COLUMN currency_symbol VARCHAR(10) DEFAULT '$'
                """)
                print("✅ Added currency_symbol column")
            
            # Record the migration as applied
            recorder.record_applied('sales', '0012_add_currency_to_pos_transactions')
            print("✅ Migration applied and recorded successfully")
            
    except Exception as e:
        print(f"❌ Error in migration: {e}")
        print("Attempting to run migration through Django management command...")
        try:
            from django.core.management import call_command
            call_command('migrate', 'sales', '0012', '--fake-initial')
            print("✅ Migration applied via management command")
        except Exception as me:
            print(f"❌ Management command failed: {me}")
            raise

if __name__ == "__main__":
    apply_migration()