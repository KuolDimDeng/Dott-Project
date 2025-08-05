"""
Emergency management command to fix employee tenant_id column issue
Run this if migrations aren't working properly
"""
from django.core.management.base import BaseCommand
from django.db import connection, transaction as db_transaction
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fix employee tenant_id column issue'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('🔧 Starting emergency fix for employee tenant_id column...'))
        
        with connection.cursor() as cursor:
            try:
                # First check if the column exists
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'hr_employee' 
                    AND column_name = 'tenant_id'
                """)
                
                column_exists = cursor.fetchone() is not None
                
                if not column_exists:
                    self.stdout.write(self.style.WARNING('❌ tenant_id column does not exist. Adding it now...'))
                    
                    # Add the column
                    cursor.execute("""
                        ALTER TABLE hr_employee 
                        ADD COLUMN IF NOT EXISTS tenant_id UUID
                    """)
                    self.stdout.write(self.style.SUCCESS('✅ Added tenant_id column'))
                    
                    # Copy business_id to tenant_id
                    cursor.execute("""
                        UPDATE hr_employee 
                        SET tenant_id = business_id 
                        WHERE tenant_id IS NULL AND business_id IS NOT NULL
                    """)
                    rows_updated = cursor.rowcount
                    self.stdout.write(self.style.SUCCESS(f'✅ Updated {rows_updated} rows with tenant_id = business_id'))
                    
                    # Add index
                    cursor.execute("""
                        CREATE INDEX IF NOT EXISTS hr_employee_tenant_id_idx 
                        ON hr_employee(tenant_id)
                    """)
                    self.stdout.write(self.style.SUCCESS('✅ Added index on tenant_id'))
                    
                else:
                    self.stdout.write(self.style.SUCCESS('✅ tenant_id column already exists'))
                    
                    # Still update any NULL values
                    cursor.execute("""
                        UPDATE hr_employee 
                        SET tenant_id = business_id 
                        WHERE tenant_id IS NULL AND business_id IS NOT NULL
                    """)
                    rows_updated = cursor.rowcount
                    if rows_updated > 0:
                        self.stdout.write(self.style.SUCCESS(f'✅ Updated {rows_updated} rows with NULL tenant_id'))
                
                # Verify the fix
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM hr_employee 
                    WHERE tenant_id IS NULL AND business_id IS NOT NULL
                """)
                
                null_count = cursor.fetchone()[0]
                if null_count > 0:
                    self.stdout.write(self.style.WARNING(f'⚠️ Still have {null_count} employees with NULL tenant_id'))
                else:
                    self.stdout.write(self.style.SUCCESS('✅ All employees have tenant_id set properly'))
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))
                raise