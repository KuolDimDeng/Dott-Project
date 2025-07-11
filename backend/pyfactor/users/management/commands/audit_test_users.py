"""
Management command to audit test user data
Usage: python manage.py audit_test_users
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Count
from users.models import Business, UserProfile, Subscription
from crm.models import Customer
from inventory.models import Product, Service
from sales.models import Order, Invoice

User = get_user_model()


class Command(BaseCommand):
    help = 'Audit test user data to see what would be deleted'

    def handle(self, *args, **options):
        # Users to audit (excluding kdeng@dottapps.com)
        test_users_emails = [
            'jubacargovillage@gmail.com',
            'aluelddeng1@gmail.com', 
            'tobi_6686@hotmail.com',
            'senh.yeung@gmail.com',
            'synodosdrama@gmail.com',
            'support@dottapps.com'
        ]
        
        self.stdout.write(self.style.WARNING('Auditing test user data...\n'))
        
        # Find users
        users = User.objects.filter(email__in=test_users_emails)
        
        if not users.exists():
            self.stdout.write(self.style.WARNING('No test users found'))
            return
        
        total_records = 0
        
        for user in users:
            self.stdout.write(self.style.HTTP_INFO(f'\n📊 User: {user.email}'))
            self.stdout.write(f'   ID: {user.id}')
            self.stdout.write(f'   Auth0 ID: {user.auth0_id}')
            self.stdout.write(f'   Created: {user.date_joined}')
            
            user_total = 0
            
            # Get tenant info
            tenant_ids = []
            if hasattr(user, 'tenant_id') and user.tenant_id:
                tenant_ids.append(user.tenant_id)
                self.stdout.write(f'   Primary Tenant: {user.tenant_id}')
            
            # Check businesses
            businesses = Business.objects.filter(user=user)
            if businesses.exists():
                self.stdout.write(f'   Businesses: {businesses.count()}')
                for biz in businesses:
                    self.stdout.write(f'     - {biz.name} (Tenant: {biz.tenant_id})')
                    if biz.tenant_id not in tenant_ids:
                        tenant_ids.append(biz.tenant_id)
                user_total += businesses.count()
            
            # Check profile
            profiles = UserProfile.objects.filter(user=user).count()
            if profiles:
                self.stdout.write(f'   User Profiles: {profiles}')
                user_total += profiles
            
            # Check subscription
            subs = Subscription.objects.filter(user=user).count()
            if subs:
                self.stdout.write(f'   Subscriptions: {subs}')
                user_total += subs
            
            # Check tenant data
            if tenant_ids:
                self.stdout.write('   📁 Tenant Data:')
                for tenant_id in tenant_ids:
                    tenant_data = []
                    
                    # Count records for each model
                    customers = Customer.objects.filter(tenant_id=tenant_id).count()
                    if customers:
                        tenant_data.append(f'Customers: {customers}')
                        user_total += customers
                    
                    products = Product.objects.filter(tenant_id=tenant_id).count()
                    if products:
                        tenant_data.append(f'Products: {products}')
                        user_total += products
                    
                    services = Service.objects.filter(tenant_id=tenant_id).count()
                    if services:
                        tenant_data.append(f'Services: {services}')
                        user_total += services
                    
                    orders = Order.objects.filter(tenant_id=tenant_id).count()
                    if orders:
                        tenant_data.append(f'Orders: {orders}')
                        user_total += orders
                    
                    invoices = Invoice.objects.filter(tenant_id=tenant_id).count()
                    if invoices:
                        tenant_data.append(f'Invoices: {invoices}')
                        user_total += invoices
                    
                    if tenant_data:
                        self.stdout.write(f'     Tenant {tenant_id}: {", ".join(tenant_data)}')
            
            self.stdout.write(self.style.SUCCESS(f'   Total records for this user: {user_total}'))
            total_records += user_total
        
        self.stdout.write(self.style.WARNING(f'\n📊 Grand Total: {total_records} records across {users.count()} users'))
        self.stdout.write(self.style.NOTICE('\nTo delete this data, run: python manage.py cleanup_test_users'))