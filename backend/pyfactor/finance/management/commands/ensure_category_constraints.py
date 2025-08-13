"""
Management command to ensure AccountCategory constraints are correct.
This is a safety measure to handle cases where migrations haven't run properly.
"""

from django.core.management.base import BaseCommand
from django.db import connection
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Ensures AccountCategory constraints are correctly configured for multi-tenant operation'

    def handle(self, *args, **options):
        self.stdout.write('Checking AccountCategory constraints...')
        
        with connection.cursor() as cursor:
            # Check for the problematic constraint
            cursor.execute("""
                SELECT COUNT(*) 
                FROM pg_constraint 
                WHERE conname = 'finance_accountcategory_code_key'
                AND conrelid = 'finance_accountcategory'::regclass;
            """)
            
            if cursor.fetchone()[0] > 0:
                self.stdout.write(self.style.WARNING('Found problematic constraint, removing...'))
                cursor.execute("""
                    ALTER TABLE finance_accountcategory 
                    DROP CONSTRAINT IF EXISTS finance_accountcategory_code_key CASCADE;
                """)
                self.stdout.write(self.style.SUCCESS('✓ Removed old constraint'))
            
            # Check for correct constraint
            cursor.execute("""
                SELECT COUNT(*) 
                FROM pg_constraint 
                WHERE (conname = 'unique_category_code_per_tenant' 
                       OR conname = 'unique_category_code_per_tenant_v2')
                AND conrelid = 'finance_accountcategory'::regclass;
            """)
            
            if cursor.fetchone()[0] == 0:
                self.stdout.write(self.style.WARNING('Per-tenant constraint missing, creating...'))
                cursor.execute("""
                    ALTER TABLE finance_accountcategory 
                    ADD CONSTRAINT unique_category_code_per_tenant_v2 
                    UNIQUE (tenant_id, code);
                """)
                self.stdout.write(self.style.SUCCESS('✓ Created per-tenant constraint'))
            
            self.stdout.write(self.style.SUCCESS('AccountCategory constraints are correctly configured!'))