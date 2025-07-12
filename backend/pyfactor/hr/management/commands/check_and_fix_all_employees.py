"""
Management command to check and fix all employees in the database
"""
from django.core.management.base import BaseCommand
from django.db import connection
from hr.models import Employee
from custom_auth.models import User, Tenant
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Check and fix all employees in the database'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('🔍 Checking all employees in the database...'))
        
        # First, let's see what's in the database
        with connection.cursor() as cursor:
            # Check all employees
            cursor.execute("""
                SELECT id, email, business_id, tenant_id, created_at
                FROM hr_employee
                ORDER BY created_at DESC
                LIMIT 20
            """)
            
            employees = cursor.fetchall()
            
            if employees:
                self.stdout.write(self.style.WARNING(f'\n📋 Found {len(employees)} employees (showing latest 20):'))
                for emp_id, email, business_id, tenant_id, created_at in employees:
                    self.stdout.write(f'  - Email: {email}')
                    self.stdout.write(f'    ID: {emp_id}')
                    self.stdout.write(f'    Business ID: {business_id}')
                    self.stdout.write(f'    Tenant ID: {tenant_id}')
                    self.stdout.write(f'    Created: {created_at}')
                    self.stdout.write('')
            else:
                self.stdout.write(self.style.SUCCESS('✅ No employees found in database'))
                
            # Check for employees with mismatched business_id/tenant_id
            cursor.execute("""
                SELECT COUNT(*) 
                FROM hr_employee 
                WHERE business_id != tenant_id
                OR tenant_id IS NULL
            """)
            
            mismatched_count = cursor.fetchone()[0]
            
            if mismatched_count > 0:
                self.stdout.write(self.style.WARNING(f'\n⚠️ Found {mismatched_count} employees with mismatched or missing tenant_id'))
                
                # Fix them
                cursor.execute("""
                    UPDATE hr_employee 
                    SET tenant_id = business_id
                    WHERE tenant_id IS NULL OR business_id != tenant_id
                """)
                
                self.stdout.write(self.style.SUCCESS(f'✅ Fixed {cursor.rowcount} employees'))
                
            # Check for employees with wrong business_id
            # Get all valid tenant IDs
            cursor.execute("""
                SELECT DISTINCT id, name 
                FROM custom_auth_tenant 
                WHERE is_active = true
            """)
            
            valid_tenants = cursor.fetchall()
            self.stdout.write(self.style.WARNING(f'\n📋 Valid tenant IDs:'))
            for tenant_id, tenant_name in valid_tenants:
                self.stdout.write(f'  - {tenant_id}: {tenant_name}')
                
                # Count employees for this tenant
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM hr_employee 
                    WHERE business_id = %s
                """, [str(tenant_id)])
                
                emp_count = cursor.fetchone()[0]
                self.stdout.write(f'    Employees: {emp_count}')
                
            # Find orphaned employees (business_id not in valid tenants)
            cursor.execute("""
                SELECT DISTINCT business_id 
                FROM hr_employee 
                WHERE business_id NOT IN (
                    SELECT id FROM custom_auth_tenant
                )
            """)
            
            orphaned_business_ids = cursor.fetchall()
            
            if orphaned_business_ids:
                self.stdout.write(self.style.ERROR(f'\n❌ Found employees with invalid business_ids:'))
                for (bad_id,) in orphaned_business_ids:
                    cursor.execute("""
                        SELECT COUNT(*), MIN(email), MAX(email)
                        FROM hr_employee 
                        WHERE business_id = %s
                    """, [str(bad_id)])
                    
                    count, first_email, last_email = cursor.fetchone()
                    self.stdout.write(f'  - Business ID: {bad_id}')
                    self.stdout.write(f'    Count: {count} employees')
                    self.stdout.write(f'    Examples: {first_email}, {last_email}')
                    
                    # Find the user who created these
                    cursor.execute("""
                        SELECT DISTINCT u.email, u.business_id, u.tenant_id
                        FROM custom_auth_user u
                        WHERE u.email IN (
                            SELECT email FROM hr_employee WHERE business_id = %s
                        )
                    """, [str(bad_id)])
                    
                    users = cursor.fetchall()
                    if users:
                        for user_email, user_biz_id, user_tenant_id in users:
                            self.stdout.write(f'    Related user: {user_email}')
                            self.stdout.write(f'      User business_id: {user_biz_id}')
                            self.stdout.write(f'      User tenant_id: {user_tenant_id}')
                            
        self.stdout.write(self.style.SUCCESS('\n✅ Employee check complete'))