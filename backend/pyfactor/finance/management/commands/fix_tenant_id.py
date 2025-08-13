"""
Django management command to fix missing tenant_id columns.
Run with: python manage.py fix_tenant_id
"""

from django.core.management.base import BaseCommand
from django.db import connection
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Add missing tenant_id columns to finance tables'

    def handle(self, *args, **options):
        self.stdout.write('Fixing tenant_id columns...')
        
        with connection.cursor() as cursor:
            # Get default tenant_id
            cursor.execute("""
                SELECT DISTINCT tenant_id 
                FROM custom_auth_user 
                WHERE tenant_id IS NOT NULL 
                LIMIT 1;
            """)
            result = cursor.fetchone()
            default_tenant_id = result[0] if result else None
            
            if not default_tenant_id:
                self.stdout.write(self.style.ERROR('No tenant_id found in database'))
                return
            
            self.stdout.write(f'Using tenant_id: {default_tenant_id}')
            
            # Critical table that's causing issues
            table_name = 'finance_journalentryline'
            
            try:
                # Check if column exists
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = %s 
                    AND column_name = 'tenant_id';
                """, [table_name])
                
                if cursor.fetchone():
                    self.stdout.write(f'{table_name} already has tenant_id')
                else:
                    # Add column
                    cursor.execute(f"""
                        ALTER TABLE {table_name} 
                        ADD COLUMN tenant_id uuid;
                    """)
                    
                    # Update existing rows
                    cursor.execute(f"""
                        UPDATE {table_name} 
                        SET tenant_id = %s 
                        WHERE tenant_id IS NULL;
                    """, [default_tenant_id])
                    
                    # Create index
                    cursor.execute(f"""
                        CREATE INDEX IF NOT EXISTS idx_{table_name}_tenant_id 
                        ON {table_name}(tenant_id);
                    """)
                    
                    self.stdout.write(self.style.SUCCESS(f'Fixed {table_name}'))
                
                # Also fix other finance tables
                other_tables = [
                    'finance_journalentry',
                    'finance_generalledgerentry',
                    'finance_account',
                    'finance_financetransaction',
                    'finance_chartofaccount',
                ]
                
                for table in other_tables:
                    try:
                        cursor.execute("""
                            SELECT EXISTS (
                                SELECT FROM information_schema.tables 
                                WHERE table_name = %s
                            );
                        """, [table])
                        
                        if not cursor.fetchone()[0]:
                            continue
                        
                        cursor.execute("""
                            SELECT column_name 
                            FROM information_schema.columns 
                            WHERE table_name = %s 
                            AND column_name = 'tenant_id';
                        """, [table])
                        
                        if not cursor.fetchone():
                            cursor.execute(f"""
                                ALTER TABLE {table} 
                                ADD COLUMN tenant_id uuid;
                            """)
                            
                            cursor.execute(f"""
                                UPDATE {table} 
                                SET tenant_id = %s 
                                WHERE tenant_id IS NULL;
                            """, [default_tenant_id])
                            
                            self.stdout.write(self.style.SUCCESS(f'Fixed {table}'))
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f'Could not fix {table}: {e}'))
                
                self.stdout.write(self.style.SUCCESS('All tables processed!'))
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error: {e}'))