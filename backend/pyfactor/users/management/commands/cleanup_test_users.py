"""
Management command to clean up test user data
Usage: python manage.py cleanup_test_users
"""
import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from users.models import Business, UserProfile, Subscription
from crm.models import Customer
from inventory.models import Product, Service, Vendor, Location
from sales.models import Order, Invoice, Estimate
from expenses.models import Bill
from taxes.models import TaxRate
from hr.models import Employee, Department, Payroll, PayrollItem, PayStub
from taxes.models import TaxFiling, TaxSettings, TaxForm
from smart_insights.models import InsightQuery, UserCredit

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = 'Clean up test user data while preserving kdeng@dottapps.com'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Skip confirmation prompt',
        )

    def handle(self, *args, **options):
        # Users to clean up (excluding kdeng@dottapps.com)
        test_users_emails = [
            'jubacargovillage@gmail.com',
            'aluelddeng1@gmail.com',
            'tobi_6686@hotmail.com',
            'senh.yeung@gmail.com',
            'synodosdrama@gmail.com',
            'support@dottapps.com'
        ]
        
        # Auth0 IDs for the same users
        test_users_auth0_ids = [
            'google-oauth2|107454913649768153331',
            'google-oauth2|101462187807563504760',
            'google-oauth2|110468247978713015948',
            'google-oauth2|112397440283001882523',
            'auth0|6861f28ff6247ce4ea0b175f',
            'auth0|68673c2c9ed677050fb70e80'
        ]

        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No data will be deleted'))
        
        # Find users to delete
        users_to_delete = User.objects.filter(
            email__in=test_users_emails
        ) | User.objects.filter(
            auth0_id__in=test_users_auth0_ids
        )
        
        # Exclude kdeng@dottapps.com explicitly
        users_to_delete = users_to_delete.exclude(email='kdeng@dottapps.com')
        
        if not users_to_delete.exists():
            self.stdout.write(self.style.WARNING('No users found to delete'))
            return
        
        # Show users that will be affected
        self.stdout.write(self.style.WARNING(f'\nFound {users_to_delete.count()} users to clean up:'))
        for user in users_to_delete:
            self.stdout.write(f'  - {user.email} (ID: {user.id}, Auth0: {user.auth0_id})')
        
        # Confirm unless --confirm flag is used
        if not options['confirm'] and not dry_run:
            confirm = input('\nAre you sure you want to delete all data for these users? (yes/no): ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.ERROR('Operation cancelled'))
                return
        
        # Collect statistics
        stats = {
            'users': 0,
            'businesses': 0,
            'profiles': 0,
            'subscriptions': 0,
            'customers': 0,
            'products': 0,
            'services': 0,
            'orders': 0,
            'invoices': 0,
            'bills': 0,
            'vendors': 0,
            'employees': 0,
            'tax_filings': 0,
            'insights': 0,
            'total_tenants': set()
        }
        
        try:
            with transaction.atomic():
                for user in users_to_delete:
                    self.stdout.write(f'\n{self.style.HTTP_INFO}Processing user: {user.email}')
                    
                    # Get tenant IDs
                    tenant_ids = []
                    if hasattr(user, 'tenant_id') and user.tenant_id:
                        tenant_ids.append(user.tenant_id)
                        stats['total_tenants'].add(str(user.tenant_id))
                    
                    # Get businesses
                    businesses = Business.objects.filter(user=user)
                    for business in businesses:
                        if business.tenant_id and business.tenant_id not in tenant_ids:
                            tenant_ids.append(business.tenant_id)
                            stats['total_tenants'].add(str(business.tenant_id))
                    
                    if tenant_ids:
                        # Delete tenant-specific data
                        for tenant_id in tenant_ids:
                            self.stdout.write(f'  Cleaning tenant {tenant_id} data...')
                            
                            # Customers
                            count = Customer.objects.filter(tenant_id=tenant_id).count()
                            if not dry_run:
                                Customer.objects.filter(tenant_id=tenant_id).delete()
                            stats['customers'] += count
                            
                            # Products
                            count = Product.objects.filter(tenant_id=tenant_id).count()
                            if not dry_run:
                                Product.objects.filter(tenant_id=tenant_id).delete()
                            stats['products'] += count
                            
                            # Services
                            count = Service.objects.filter(tenant_id=tenant_id).count()
                            if not dry_run:
                                Service.objects.filter(tenant_id=tenant_id).delete()
                            stats['services'] += count
                            
                            # Orders
                            count = Order.objects.filter(tenant_id=tenant_id).count()
                            if not dry_run:
                                Order.objects.filter(tenant_id=tenant_id).delete()
                            stats['orders'] += count
                            
                            # Invoices
                            count = Invoice.objects.filter(tenant_id=tenant_id).count()
                            if not dry_run:
                                Invoice.objects.filter(tenant_id=tenant_id).delete()
                            stats['invoices'] += count
                            
                            # Bills
                            count = Bill.objects.filter(tenant_id=tenant_id).count()
                            if not dry_run:
                                Bill.objects.filter(tenant_id=tenant_id).delete()
                            stats['bills'] += count
                            
                            # Vendors
                            count = Vendor.objects.filter(tenant_id=tenant_id).count()
                            if not dry_run:
                                Vendor.objects.filter(tenant_id=tenant_id).delete()
                            stats['vendors'] += count
                            
                            # Employees
                            count = Employee.objects.filter(tenant_id=tenant_id).count()
                            if not dry_run:
                                Employee.objects.filter(tenant_id=tenant_id).delete()
                            stats['employees'] += count
                            
                            # Tax Filings
                            count = TaxFiling.objects.filter(tenant_id=tenant_id).count()
                            if not dry_run:
                                TaxFiling.objects.filter(tenant_id=tenant_id).delete()
                            stats['tax_filings'] += count
                            
                            # Tax Settings
                            if not dry_run:
                                TaxSettings.objects.filter(tenant_id=tenant_id).delete()
                    
                    # Delete user-specific data
                    # UserProfile
                    count = UserProfile.objects.filter(user=user).count()
                    if not dry_run:
                        UserProfile.objects.filter(user=user).delete()
                    stats['profiles'] += count
                    
                    # Subscription
                    count = Subscription.objects.filter(user=user).count()
                    if not dry_run:
                        Subscription.objects.filter(user=user).delete()
                    stats['subscriptions'] += count
                    
                    # Businesses
                    count = businesses.count()
                    if not dry_run:
                        businesses.delete()
                    stats['businesses'] += count
                    
                    # Smart Insights
                    count = InsightQuery.objects.filter(user=user).count()
                    if not dry_run:
                        InsightQuery.objects.filter(user=user).delete()
                    stats['insights'] += count
                    
                    # User Credits
                    if not dry_run:
                        UserCredit.objects.filter(user=user).delete()
                    
                    # Finally, delete the user
                    if not dry_run:
                        user.delete()
                    stats['users'] += 1
                
                # Show summary
                self.stdout.write(self.style.SUCCESS('\n✅ Cleanup Summary:'))
                self.stdout.write(f'  - Users deleted: {stats["users"]}')
                self.stdout.write(f'  - Tenants affected: {len(stats["total_tenants"])}')
                self.stdout.write(f'  - Businesses: {stats["businesses"]}')
                self.stdout.write(f'  - User profiles: {stats["profiles"]}')
                self.stdout.write(f'  - Subscriptions: {stats["subscriptions"]}')
                self.stdout.write(f'  - Customers: {stats["customers"]}')
                self.stdout.write(f'  - Products: {stats["products"]}')
                self.stdout.write(f'  - Services: {stats["services"]}')
                self.stdout.write(f'  - Orders: {stats["orders"]}')
                self.stdout.write(f'  - Invoices: {stats["invoices"]}')
                self.stdout.write(f'  - Bills: {stats["bills"]}')
                self.stdout.write(f'  - Vendors: {stats["vendors"]}')
                self.stdout.write(f'  - Employees: {stats["employees"]}')
                self.stdout.write(f'  - Tax filings: {stats["tax_filings"]}')
                self.stdout.write(f'  - Smart insights: {stats["insights"]}')
                
                if dry_run:
                    self.stdout.write(self.style.WARNING('\nDRY RUN - No data was actually deleted'))
                else:
                    self.stdout.write(self.style.SUCCESS('\n✅ All test user data has been cleaned up successfully!'))
                    self.stdout.write(self.style.WARNING('Note: Users have been removed from Django but remain in Auth0'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error during cleanup: {str(e)}'))
            logger.error(f'Cleanup failed: {str(e)}', exc_info=True)
            raise