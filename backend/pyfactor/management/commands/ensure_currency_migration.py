"""
Django management command to ensure currency migration is applied.
This command checks and applies the currency migration if needed.
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.migrations.recorder import MigrationRecorder
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Ensures currency migration is applied to POS transactions'

    def handle(self, *args, **options):
        self.stdout.write("=== Ensuring Currency Migration ===")
        
        try:
            # Check if migration is already recorded
            recorder = MigrationRecorder(connection)
            applied_migrations = recorder.applied_migrations()
            
            if ('sales', '0012_add_currency_to_pos_transactions') in applied_migrations:
                self.stdout.write(self.style.SUCCESS("✅ Migration already recorded as applied"))
                
                # Double-check that columns actually exist
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'sales_pos_transaction' 
                        AND column_name IN ('currency_code', 'currency_symbol')
                    """)
                    existing_columns = [row[0] for row in cursor.fetchall()]
                    
                    if 'currency_code' in existing_columns and 'currency_symbol' in existing_columns:
                        self.stdout.write(self.style.SUCCESS("✅ Currency columns exist in database"))
                        return
                    else:
                        self.stdout.write(self.style.WARNING("⚠️ Migration recorded but columns missing. Fixing..."))
            
            # Apply the migration manually
            with connection.cursor() as cursor:
                # Check current columns
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'sales_pos_transaction' 
                    AND column_name IN ('currency_code', 'currency_symbol')
                """)
                existing_columns = [row[0] for row in cursor.fetchall()]
                
                # Add missing columns
                if 'currency_code' not in existing_columns:
                    self.stdout.write("Adding currency_code column...")
                    cursor.execute("""
                        ALTER TABLE sales_pos_transaction 
                        ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD'
                    """)
                    self.stdout.write(self.style.SUCCESS("✅ Added currency_code column"))
                
                if 'currency_symbol' not in existing_columns:
                    self.stdout.write("Adding currency_symbol column...")
                    cursor.execute("""
                        ALTER TABLE sales_pos_transaction 
                        ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT '$'
                    """)
                    self.stdout.write(self.style.SUCCESS("✅ Added currency_symbol column"))
                
                # Record the migration as applied if not already recorded
                if ('sales', '0012_add_currency_to_pos_transactions') not in applied_migrations:
                    recorder.record_applied('sales', '0012_add_currency_to_pos_transactions')
                    self.stdout.write(self.style.SUCCESS("✅ Recorded migration as applied"))
                
                self.stdout.write(self.style.SUCCESS("✅ Currency migration successfully applied"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error applying migration: {e}"))
            
            # Try alternative approach - run Django's migrate command
            self.stdout.write("Attempting Django's migrate command...")
            try:
                from django.core.management import call_command
                call_command('migrate', 'sales', '0012', '--fake-initial')
                self.stdout.write(self.style.SUCCESS("✅ Migration applied via Django"))
            except Exception as me:
                self.stdout.write(self.style.ERROR(f"❌ Django migrate also failed: {me}"))
                raise