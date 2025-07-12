"""
Management command to add tenant_id column to hr_employee table
This can be run if migrations fail
"""
from django.core.management.base import BaseCommand
from django.db import connection
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Add tenant_id column to hr_employee table if it does not exist'

    def handle(self, *args, **options):
        self.stdout.write('Checking if tenant_id column exists in hr_employee table...')
        
        with connection.cursor() as cursor:
            # Check if column exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'hr_employee' 
                AND column_name = 'tenant_id'
            """)
            
            result = cursor.fetchone()
            
            if result:
                self.stdout.write(self.style.SUCCESS('✅ tenant_id column already exists'))
            else:
                self.stdout.write('❌ tenant_id column does not exist. Adding it now...')
                
                try:
                    # Add the column
                    cursor.execute("""
                        ALTER TABLE hr_employee 
                        ADD COLUMN tenant_id UUID
                    """)
                    
                    # Populate it with business_id values
                    cursor.execute("""
                        UPDATE hr_employee 
                        SET tenant_id = business_id 
                        WHERE tenant_id IS NULL
                    """)
                    
                    # Add index for performance
                    cursor.execute("""
                        CREATE INDEX IF NOT EXISTS hr_employee_tenant_id_idx 
                        ON hr_employee(tenant_id)
                    """)
                    
                    self.stdout.write(self.style.SUCCESS('✅ Successfully added tenant_id column'))
                    
                    # Verify the column was added
                    cursor.execute("""
                        SELECT COUNT(*) 
                        FROM hr_employee 
                        WHERE tenant_id IS NOT NULL
                    """)
                    
                    count = cursor.fetchone()[0]
                    self.stdout.write(self.style.SUCCESS(f'✅ Updated {count} employees with tenant_id'))
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'❌ Error adding tenant_id column: {str(e)}'))
                    raise
        
        # Also check RLS status
        self.stdout.write('\nChecking RLS status...')
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT relrowsecurity 
                FROM pg_class 
                WHERE relname = 'hr_employee' 
                AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
            """)
            
            result = cursor.fetchone()
            if result and result[0]:
                self.stdout.write(self.style.SUCCESS('✅ RLS is enabled on hr_employee table'))
            else:
                self.stdout.write(self.style.WARNING('⚠️ RLS is NOT enabled on hr_employee table'))