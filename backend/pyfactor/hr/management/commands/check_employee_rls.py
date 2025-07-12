"""
Management command to check RLS policies on hr_employee table
"""
from django.core.management.base import BaseCommand
from django.db import connection
from hr.models import Employee
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Check RLS policies on hr_employee table'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('🔍 Checking RLS policies on hr_employee table...'))
        
        with connection.cursor() as cursor:
            try:
                # Check if RLS is enabled
                cursor.execute("""
                    SELECT relrowsecurity 
                    FROM pg_class 
                    WHERE relname = 'hr_employee'
                """)
                
                rls_enabled = cursor.fetchone()
                if rls_enabled and rls_enabled[0]:
                    self.stdout.write(self.style.WARNING('⚠️ RLS is ENABLED on hr_employee table'))
                else:
                    self.stdout.write(self.style.SUCCESS('✅ RLS is DISABLED on hr_employee table'))
                
                # Check policies
                cursor.execute("""
                    SELECT pol.polname, pol.polcmd, pol.polpermissive, 
                           pg_get_expr(pol.polqual, pol.polrelid) as qual,
                           pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check
                    FROM pg_policy pol
                    JOIN pg_class c ON c.oid = pol.polrelid
                    WHERE c.relname = 'hr_employee'
                """)
                
                policies = cursor.fetchall()
                if policies:
                    self.stdout.write(self.style.WARNING(f'📋 Found {len(policies)} RLS policies:'))
                    for policy in policies:
                        self.stdout.write(f'  - Policy: {policy[0]}')
                        self.stdout.write(f'    Command: {policy[1]}')
                        self.stdout.write(f'    Permissive: {policy[2]}')
                        self.stdout.write(f'    Qual: {policy[3]}')
                        self.stdout.write(f'    With Check: {policy[4]}')
                else:
                    self.stdout.write(self.style.SUCCESS('✅ No RLS policies found'))
                
                # Test query as superuser
                cursor.execute("SELECT COUNT(*) FROM hr_employee")
                total_count = cursor.fetchone()[0]
                self.stdout.write(self.style.SUCCESS(f'📊 Total employees (as superuser): {total_count}'))
                
                # Test with Django ORM
                orm_count = Employee.objects.all().count()
                self.stdout.write(self.style.SUCCESS(f'📊 Total employees (via ORM): {orm_count}'))
                
                # List all employees
                if total_count > 0:
                    cursor.execute("""
                        SELECT id, email, business_id, tenant_id 
                        FROM hr_employee 
                        LIMIT 5
                    """)
                    employees = cursor.fetchall()
                    self.stdout.write(self.style.WARNING('📋 Sample employees:'))
                    for emp in employees:
                        self.stdout.write(f'  - ID: {emp[0]}, Email: {emp[1]}, Business: {emp[2]}, Tenant: {emp[3]}')
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))