from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Add missing tenant_id column to finance_journalentryline table'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Check if column exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'finance_journalentryline' 
                AND column_name = 'tenant_id'
            """)
            
            if cursor.fetchone():
                self.stdout.write(self.style.SUCCESS('✅ tenant_id column already exists'))
            else:
                self.stdout.write(self.style.WARNING('Adding tenant_id column...'))
                
                # Add tenant_id column
                cursor.execute("""
                    ALTER TABLE finance_journalentryline 
                    ADD COLUMN tenant_id UUID;
                """)
                
                # Create index
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_finance_journalentryline_tenant_id 
                    ON finance_journalentryline(tenant_id);
                """)
                
                # Update existing records
                cursor.execute("""
                    UPDATE finance_journalentryline jel
                    SET tenant_id = b.tenant_id
                    FROM users_business b
                    WHERE jel.business_id = b.id
                    AND jel.tenant_id IS NULL;
                """)
                
                self.stdout.write(self.style.SUCCESS('✅ Successfully added tenant_id column'))