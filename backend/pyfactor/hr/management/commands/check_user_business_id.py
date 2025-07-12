"""
Management command to check user's business_id and tenant_id mapping
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from hr.models import Employee
from custom_auth.models import Tenant
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class Command(BaseCommand):
    help = 'Check user business_id and tenant_id mapping'
    
    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='User email to check')
    
    def handle(self, *args, **options):
        email = options['email']
        self.stdout.write(self.style.WARNING(f'🔍 Checking user: {email}'))
        
        try:
            # Check user
            user = User.objects.filter(email=email).first()
            if not user:
                self.stdout.write(self.style.ERROR(f'❌ User not found: {email}'))
                return
            
            self.stdout.write(self.style.SUCCESS(f'✅ User found: {user.email}'))
            self.stdout.write(f'  - User ID: {user.id}')
            self.stdout.write(f'  - Business ID: {getattr(user, "business_id", "N/A")}')
            self.stdout.write(f'  - Business Name: {getattr(user, "business_name", "N/A")}')
            
            # Check tenant
            if hasattr(user, 'tenant_id'):
                self.stdout.write(f'  - Tenant ID (on user): {user.tenant_id}')
            
            if hasattr(user, 'tenant'):
                tenant = user.tenant
                if tenant:
                    self.stdout.write(f'  - Tenant Name: {tenant.name}')
                    self.stdout.write(f'  - Tenant ID: {tenant.id}')
            
            # Check all tenants
            all_tenants = Tenant.objects.all()
            self.stdout.write(self.style.WARNING(f'\n📋 All Tenants ({all_tenants.count()}):'))
            for tenant in all_tenants:
                self.stdout.write(f'  - ID: {tenant.id}, Name: {tenant.name}')
            
            # Check employees for this user's business_id
            if hasattr(user, 'business_id') and user.business_id:
                employees = Employee.objects.filter(business_id=user.business_id)
                self.stdout.write(self.style.WARNING(f'\n👥 Employees for business_id {user.business_id}: {employees.count()}'))
                for emp in employees[:5]:
                    self.stdout.write(f'  - {emp.email}, tenant_id: {emp.tenant_id}')
            
            # Check all employees
            all_employees = Employee.objects.all()
            self.stdout.write(self.style.WARNING(f'\n🌍 All Employees ({all_employees.count()}):'))
            for emp in all_employees[:10]:
                self.stdout.write(f'  - Email: {emp.email}')
                self.stdout.write(f'    Business ID: {emp.business_id}')
                self.stdout.write(f'    Tenant ID: {emp.tenant_id}')
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))