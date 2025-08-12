"""
Management command to fix employee business_id/tenant_id mismatches
"""
from django.core.management.base import BaseCommand
from django.db import connection, transaction as db_transaction
from hr.models import Employee
from custom_auth.models import Tenant
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Fix employee business_id to match tenant_id'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('🔧 Fixing employee business_id/tenant_id mismatches...'))
        
        try:
            # Find all unique tenant_ids that are actually being used as business_ids
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT DISTINCT t.id, t.name
                    FROM custom_auth_tenant t
                    WHERE EXISTS (
                        SELECT 1 FROM custom_auth_user u 
                        WHERE u.business_id != t.id
                    )
                """)
                
                mismatches = cursor.fetchall()
                
                if mismatches:
                    self.stdout.write(self.style.WARNING(f'⚠️ Found {len(mismatches)} tenants with potential mismatches'))
                    
                    for tenant_id, tenant_name in mismatches:
                        self.stdout.write(f'\n📋 Tenant: {tenant_name} (ID: {tenant_id})')
                        
                        # Check if there are employees with wrong business_id
                        cursor.execute("""
                            SELECT COUNT(*) 
                            FROM hr_employee 
                            WHERE business_id != %s 
                            AND tenant_id = %s
                        """, [str(tenant_id), str(tenant_id)])
                        
                        wrong_count = cursor.fetchone()[0]
                        if wrong_count > 0:
                            self.stdout.write(f'  ❌ {wrong_count} employees with wrong business_id')
                            
                            # Fix them
                            cursor.execute("""
                                UPDATE hr_employee 
                                SET business_id = tenant_id 
                                WHERE tenant_id = %s 
                                AND business_id != tenant_id
                            """, [str(tenant_id)])
                            
                            self.stdout.write(f'  ✅ Fixed {cursor.rowcount} employees')
                else:
                    self.stdout.write(self.style.SUCCESS('✅ No mismatches found'))
                
                # Also ensure all employees have tenant_id = business_id
                cursor.execute("""
                    UPDATE hr_employee 
                    SET tenant_id = business_id 
                    WHERE tenant_id IS NULL 
                    OR tenant_id != business_id
                """)
                
                if cursor.rowcount > 0:
                    self.stdout.write(self.style.SUCCESS(f'✅ Updated {cursor.rowcount} employees to have matching tenant_id'))
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))